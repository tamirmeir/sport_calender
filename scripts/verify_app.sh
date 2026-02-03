#!/bin/bash
# Match Calendar - App Verification Script
# Run this to check for common issues

API_KEY="528f8539304f360adaf38e7c7c021397"
API_BASE="https://v3.football.api-sports.io"
LOCAL_API="http://localhost:3000/api/fixtures"

echo "🔍 Match Calendar Verification"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. Check if servers are running
echo "1️⃣  Checking Servers..."
if curl -s "http://localhost:3000" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} Frontend (port 3000) is running"
else
    echo -e "   ${RED}✗${NC} Frontend (port 3000) is NOT running"
    ((ERRORS++))
fi

if curl -s "http://localhost:8000/health" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} Backend (port 8000) is running"
else
    echo -e "   ${RED}✗${NC} Backend (port 8000) is NOT running"
    ((ERRORS++))
fi
echo ""

# 2. Check API connectivity
echo "2️⃣  Checking API-Sports Connectivity..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/status" -H "x-apisports-key: ${API_KEY}")
if [ "$API_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✓${NC} API-Sports is reachable"
else
    echo -e "   ${RED}✗${NC} API-Sports returned status $API_STATUS"
    ((ERRORS++))
fi
echo ""

# 3. Check key endpoints
echo "3️⃣  Checking Key Endpoints..."

# Countries
COUNTRIES=$(curl -s "${LOCAL_API}/countries" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('response', d) if isinstance(d, dict) else d))" 2>/dev/null)
if [ "$COUNTRIES" -gt 100 ]; then
    echo -e "   ${GREEN}✓${NC} Countries endpoint: $COUNTRIES countries"
else
    echo -e "   ${RED}✗${NC} Countries endpoint: Only $COUNTRIES countries"
    ((ERRORS++))
fi

# Team fixtures
FIXTURES=$(curl -s "${LOCAL_API}/team/33?next=5" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('response', d) if isinstance(d, dict) else d))" 2>/dev/null)
if [ "$FIXTURES" -gt 0 ]; then
    echo -e "   ${GREEN}✓${NC} Team fixtures endpoint: $FIXTURES fixtures for Man City"
else
    echo -e "   ${YELLOW}⚠${NC} Team fixtures: 0 fixtures (may be off-season)"
    ((WARNINGS++))
fi
echo ""

# 4. Check sample leagues for vacation status
echo "4️⃣  Checking League Status (vacation detection)..."

check_league() {
    local id=$1
    local name=$2
    local count=$(curl -s "${API_BASE}/fixtures?league=${id}&next=1" -H "x-apisports-key: ${API_KEY}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('results',0))" 2>/dev/null)
    if [ "$count" = "0" ]; then
        echo -e "   ${YELLOW}🏖️${NC} $name (ID: $id): On break"
    else
        echo -e "   ${GREEN}⚽${NC} $name (ID: $id): $count matches scheduled"
    fi
}

check_league 39 "Premier League"
check_league 140 "La Liga"
check_league 78 "Bundesliga"
check_league 135 "Serie A"
check_league 61 "Ligue 1"
check_league 2 "Champions League"
check_league 1 "World Cup"
echo ""

# 5. Check active-teams endpoint consistency
echo "5️⃣  Checking Active-Teams Endpoint..."
ACTIVE_TEAMS=$(curl -s "${LOCAL_API}/active-teams?league=39&season=2025" | python3 -c "import sys,json; d=json.load(sys.stdin); teams=d.get('response', d) if isinstance(d, dict) else d; print(len(teams))" 2>/dev/null)
if [ "$ACTIVE_TEAMS" -ge 18 ]; then
    echo -e "   ${GREEN}✓${NC} Premier League has $ACTIVE_TEAMS active teams"
else
    echo -e "   ${RED}✗${NC} Premier League only has $ACTIVE_TEAMS teams (expected 20)"
    ((ERRORS++))
fi
echo ""

# 6. Check database
echo "6️⃣  Checking Database..."
DB_PATH="backend/instance/sport_calendar.db"
if [ -f "$DB_PATH" ]; then
    USERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;" 2>/dev/null)
    FAVS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM favorite_teams;" 2>/dev/null)
    echo -e "   ${GREEN}✓${NC} Database exists: $USERS users, $FAVS subscriptions"
else
    echo -e "   ${RED}✗${NC} Database not found at $DB_PATH"
    ((ERRORS++))
fi
echo ""

# Summary
echo "================================"
echo "📊 Summary"
echo "================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warnings, but no errors${NC}"
else
    echo -e "${RED}❌ $ERRORS errors, $WARNINGS warnings${NC}"
fi
echo ""
