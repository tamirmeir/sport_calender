# API Data Flow Documentation

> Last Updated: February 2026

## External API: API-Sports v3

**Base URL:** `https://v3.football.api-sports.io`

**Authentication:** Header `x-apisports-key: YOUR_KEY`

---

## Node.js Endpoints (Port 3000)

### Fixtures Routes (`src/routes/fixtures.js`)

| Method | Endpoint | Description | API-Sports Call |
|--------|----------|-------------|-----------------|
| GET | `/api/fixtures/countries` | List all countries | `/countries` |
| GET | `/api/fixtures/leagues?country=X` | Leagues by country | Cache or `/leagues?country=X&current=true` |
| GET | `/api/fixtures/teams?league=X&season=Y` | Teams by league | `/teams?league=X&season=Y` |
| GET | `/api/fixtures/teams?country=X&national=true` | National team | `/teams?country=X&type=national` |
| GET | `/api/fixtures/standings?league=X&season=Y` | League standings | `/standings?league=X&season=Y` |
| GET | `/api/fixtures/fixtures?league=X&season=Y&next=N` | League fixtures | `/fixtures?league=X&season=Y&next=N` |
| GET | `/api/fixtures/active-teams?league=X` | Active tournament teams | Heuristic logic |
| GET | `/api/fixtures/team/:teamId?next=N&league=L` | Team fixtures | `/fixtures?team=X&next=N` or with league filter |
| GET | `/api/fixtures/:fixtureId` | Single fixture | `/fixtures?id=X` |
| GET | `/api/fixtures/date/:date` | Fixtures by date | `/fixtures?date=X` |
| GET | `/api/fixtures/history/:teamId?last=N` | Past fixtures | `/fixtures?team=X&last=N` |
| GET | `/api/fixtures/team-leagues/:teamId?national=bool` | Team competitions | `/fixtures?team=X&next=50` → extract leagues |

---

## Python Endpoints (Port 8000)

### Auth Routes (`backend/routes/auth.py`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | - | Create user account |
| POST | `/api/auth/login` | - | Login, get JWT token |
| GET | `/api/auth/me` | JWT | Get current user info |
| POST | `/api/auth/reset-request` | - | Request password reset |
| POST | `/api/auth/reset-password` | Token | Set new password |
| POST | `/api/auth/promo-seen` | JWT | Mark sync promo as seen |

### Favorites Routes (`backend/routes/favorites.py`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/favorites/` | JWT | List user favorites |
| POST | `/api/favorites/` | JWT | Add/update subscription |
| DELETE | `/api/favorites/:teamId` | JWT | Remove subscription |
| GET | `/api/favorites/fixtures` | JWT | Aggregated fixtures for all favorites |

### Calendar Routes (`backend/routes/calendar.py`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/calendar/add` | JWT | Save fixtures to calendar |
| GET | `/calendar/events` | JWT | List saved events |
| DELETE | `/calendar/events/:id` | JWT | Remove event |
| DELETE | `/calendar/clear` | JWT | Clear all events |
| GET | `/sync/MatchDayByTM/:username.ics` | Public | ICS feed URL |

---

## Sync Process: `verify_leagues.js`

**Purpose:** Maintain a verified cache of active leagues

**Location:** `src/scripts/verify_leagues.js`

**Output:** `src/data/active_leagues.json`

### How It Works

```
1. Fetch all leagues with current=true from API-Sports
2. For each league:
   a. Check next=1 fixtures → if found, status = "active"
   b. If not, check last=1 fixtures → if found, status = "vacation"
   c. If not, check standings → if found, status = "vacation"
   d. Otherwise, status = "archived" (not saved)
3. Save to active_leagues.json
```

### Running the Sync

```bash
# Full fresh sync (clears cache, ~20 minutes)
node src/scripts/verify_leagues.js --fresh

# Incremental (skips recently checked, faster)
node src/scripts/verify_leagues.js

# Test mode (validates API connection)
node src/scripts/verify_leagues.js --test
```

### Season Window

Uses `getSeasonWindow()` from config:
- Min: current year - 1
- Max: current year + 1

Leagues outside this window are skipped.

---

## Caching Strategy

### 1. Leagues Cache (File)

- **File:** `src/data/active_leagues.json`
- **TTL:** Refreshed by sync script (manual or cron)
- **Contents:** Full league objects with status field (active/vacation)

### 2. In-Memory Cache (Runtime)

| Type | TTL | Purpose |
|------|-----|---------|
| fixtures | 6 hours | Team/league fixtures |
| static | 24 hours | Countries, leagues list |

### 3. ICS Cache (File)

- **Directory:** `backend/instance/cache/`
- **TTL:** 6 hours
- **Invalidation:** On favorite/fixture change

---

## API-Sports Rate Limiting

- **Free tier:** 100 requests/day
- **Paid tiers:** Higher limits

**Mitigation strategies:**
1. Aggressive caching (6-24 hours TTL)
2. Local leagues cache (avoid /leagues calls)
3. Batch fixture fetching for ICS generation
4. Demo mode for development (`FOOTBALL_API_KEY=demo_key_12345`)

---

## Data Transformations

### League Data (Cache → Frontend)

```javascript
// Raw cache format
{
  "league": { "id": 383, "name": "Ligat Ha'al", "type": "League", "logo": "..." },
  "country": { "name": "Israel", ... },
  "status": "active"
}

// Transformed for frontend
{
  "id": 383,
  "name": "Ligat Ha'al",
  "type": "League",
  "logo": "...",
  "status": "active",
  "ui_label": "⚽ Active"
}
```

### Team Competitions (API → Categorized)

```javascript
// Input: Raw fixtures with league info
// Output:
{
  "leagues": [...],      // Domestic leagues
  "cups": [...],         // Domestic cups
  "continental": [...],  // CL, EL, etc.
  "national": {          // For national teams only
    "major": [...],      // World Cup, Euros
    "qualifiers": [...],
    "friendlies": [...],
    "nationsLeague": [...]
  }
}
```

---

## Error Handling

### Node.js

- API errors return mock data in demo mode
- 500 errors return `{ error: message }`

### Python

- JWT errors return 401
- Missing data returns 400
- Server errors return 500 with generic message

---

## Sequence Diagrams

### User Subscribes to Team

```
Browser          Node.js          API-Sports       Python          SQLite
   │                │                 │               │               │
   ├──GET /team-leagues/529───────────►               │               │
   │                ├──GET /fixtures?team=529&next=50─►               │
   │                │◄──────fixtures list─────────────┤               │
   │                ├──GET /leagues?team=529──────────►               │
   │                │◄──────leagues list──────────────┤               │
   │◄──categorized leagues────────────┤               │               │
   │                │                 │               │               │
   ├──POST /api/favorites─────────────┬───────────────►               │
   │                │                 │               ├──INSERT───────►
   │                │                 │               │◄──────────────┤
   │                │                 │               ├──GET fixtures─►
   │                │                 │               │◄──────────────┤
   │◄─────────────success─────────────┴───────────────┤               │
```

### ICS Feed Request

```
Calendar App     Node.js          Python           SQLite          API-Sports
     │              │                │                │                │
     ├──GET /sync/user.ics──────────►                │                │
     │              ├────────────────►                │                │
     │              │                ├──Check cache───┤                │
     │              │                │  (hit: serve)  │                │
     │              │                │  (miss: ↓)     │                │
     │              │                ├──GET fixtures──►                │
     │              │                │◄───────────────┤                │
     │              │                ├──GET by IDs────┬────────────────►
     │              │                │◄───────────────┴────────────────┤
     │              │                ├──Generate ICS──┤                │
     │              │                ├──Save cache────►                │
     │◄─────────────┴──ICS content───┤                │                │
```
