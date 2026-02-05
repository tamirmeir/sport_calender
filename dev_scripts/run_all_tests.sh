#!/bin/bash
#
# Run all validation tests before deployment
# Usage: bash dev_scripts/run_all_tests.sh
#

echo "╔══════════════════════════════════════════════════════════╗"
echo "║           SPORT CALENDAR - PRE-DEPLOYMENT TESTS          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Test 1: API Endpoints
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Test 1: API Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node dev_scripts/validate_endpoints.js
if [ $? -ne 0 ]; then
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Data Validation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Test 2: Data Integrity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node dev_scripts/validate_data.js
if [ $? -ne 0 ]; then
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: UI Data
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖥️  Test 3: UI Data Display"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node dev_scripts/validate_ui_data.js
if [ $? -ne 0 ]; then
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Champion Validation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏆 Test 4: Champion Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node dev_scripts/validate_champions.js
if [ $? -ne 0 ]; then
    FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                     FINAL SUMMARY                        ║"
echo "╚══════════════════════════════════════════════════════════╝"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - READY FOR DEPLOYMENT${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED TEST SUITE(S) FAILED - FIX BEFORE DEPLOYMENT${NC}"
    exit 1
fi
