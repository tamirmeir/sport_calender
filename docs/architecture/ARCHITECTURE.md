# Sport Calendar - Architecture Documentation

> Last Updated: February 2026

## Overview

Sport Calendar is a **hybrid dual-stack application** that allows users to browse football fixtures, subscribe to teams, and sync matches to their personal calendars. It features a sophisticated **backend-driven tournament management system** that dynamically handles tournament statuses, winner data, and golden card displays based on comprehensive metadata.

### Key Features
- **Dynamic Tournament System**: Backend-managed tournament metadata with automatic status calculation
- **Golden Cards**: Finished tournaments display elegant winner cards with golden styling
- **Smart Status Detection**: Regional and seasonal awareness for tournament states (active/vacation/finished)
- **Real-time Data**: Live integration with API-Sports for fixtures and teams
- **Systematic Data Management**: Centralized JSON configuration files replace hardcoded data

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Frontend (Vanilla JS)                      │    │
│  │                   public/js/app_v2.js                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    All requests to /api/*
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Node.js Gateway (Port 3000)                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Express Server                             │  │
│  │                     src/index.js                               │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │  /api/fixtures/*           →  footballApi.js  →  API-Sports     │  │
│  │  /api/fixtures/tournaments/* →  Tournament Data System         │  │
│  │  /api/auth/*               →  Proxy to Python (8000)          │  │
│  │  /api/favorites/*          →  Proxy to Python (8000)          │  │
│  │  /calendar/*               →  Proxy to Python (8000)          │  │
│  │  /sync/*                   →  Proxy to Python (8000)          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │                                      │
         │ API-Sports calls                     │ Proxy
         ▼                                      ▼
┌───────────────────────┐           ┌───────────────────────────────┐
│   API-Sports v3       │           │   Python Backend (Port 8000)  │
│   External Football   │           │   Flask + SQLite              │
│   Data Provider       │           │   Auth, Favorites, Calendar   │
└───────────────────────┘           └───────────────────────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │   SQLite Database     │
                                    │   sport_calendar.db   │
                                    └───────────────────────┘
```

## Tournament Data System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Tournament Data Flow                             │
├─────────────────────────────────────────────────────────────────────┤
│  Frontend Request                                                   │
│  └─ loadTournamentData() → /api/fixtures/tournaments/status/all    │
│                                                                     │
│  Backend Processing                                                 │
│  ├─ loadWorldTournamentsMaster() → world_tournaments_master.json   │
│  ├─ loadStatusRules() → status_rules.json                         │
│  ├─ loadRegionsConfig() → regions_config.json                     │
│  └─ Calculate live status based on current month & region          │
│                                                                     │
│  Response Format                                                    │
│  └─ { tournaments: { id: { status, winner }}, month, lastUpdated } │
└─────────────────────────────────────────────────────────────────────┘
```

### Tournament Data Files Structure

```
src/data/
├── world_tournaments_master.json     # 13 major tournaments with full metadata
├── regions_config.json               # Regional season patterns & configurations
├── status_rules.json                 # Month-based status calculation rules
├── country_mappings.json             # Tournament-to-country association fixes
├── display_config.json               # UI styling and badge configurations
└── active_leagues.json               # Verified leagues cache (existing)
```

## Request Routing Table

| Path Pattern | Handler | Backend | File |
|--------------|---------|---------|------|
| `/api/fixtures/*` | Node.js Direct | API-Sports | `src/routes/fixtures.js` |
| `/api/auth/*` | Proxy | Python | `backend/routes/auth.py` |
| `/api/favorites/*` | Proxy | Python | `backend/routes/favorites.py` |
| `/calendar/*` | Proxy | Python | `backend/routes/calendar.py` |
| `/sync/*` | Proxy | Python | `backend/routes/calendar.py` |
| `/*` (static) | Node.js | - | `public/` directory |

---

## Data Flow

### 1. League Discovery Flow

```
User selects Country → Node.js → Check Local Cache → Return Leagues
                                      ↓ (if miss)
                              API-Sports /leagues
```

### 2. Team Subscription Flow

```
User clicks ⭐ → Frontend opens modal → Fetches team competitions
                                              ↓
                           Node.js /team-leagues/:teamId
                                              ↓
                           API-Sports /fixtures?team=X&next=50
                                              ↓
                           Filter active competitions → Return to modal
                                              ↓
                           User selects competitions → POST /api/favorites
                                              ↓
                           Python saves to SQLite + Auto-syncs fixtures
```

### 3. Calendar Sync Flow

```
User subscribes to team → Python auto-adds fixtures → Generates ICS
                                                          ↓
                                              /sync/MatchDayByTM/{user}.ics
                                                          ↓
                                              User adds URL to Google/Apple Calendar
                                                          ↓
                                              Calendar app polls every ~6 hours
```

---

## Data Storage Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA STORAGE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📁 FILE SYSTEM                                                      │
│  ├── src/data/active_leagues.json     ← Verified leagues (~800)     │
│  └── backend/instance/                                               │
│      ├── sport_calendar.db            ← SQLite Database             │
│      │   ├── users                    ← User accounts               │
│      │   ├── favorite_teams           ← Team subscriptions          │
│      │   ├── saved_fixtures           ← Manually saved matches ⭐   │
│      │   └── login_logs               ← Login audit trail           │
│      └── cache/                                                      │
│          └── {username}.ics           ← Calendar files              │
│                                                                      │
│  🧠 MEMORY (Runtime only - lost on restart)                         │
│  └── footballApi.js cache                                            │
│      ├── fixtures_* (6h TTL)          ← Match data from API         │
│      └── static_* (24h TTL)           ← Countries, teams            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Fixtures Data Flow

```
User searches for matches
              │
              ▼
    ┌───────────────────┐
    │ Check memory cache│
    └─────────┬─────────┘
              │
         Cache hit?
         ╱         ╲
       No           Yes
        │            │
        ▼            │
┌────────────────┐   │
│  API-Sports    │   │
│  /fixtures     │   │
└───────┬────────┘   │
        │            │
        ▼            │
 Save to cache (6h)  │
        │            │
        └─────┬──────┘
              │
              ▼
    ┌──────────────────────┐
    │  Return to frontend  │
    └──────────┬───────────┘
               │
               │ User clicks ⭐ on match
               ▼
    ┌──────────────────────┐
    │  Save to SQLite      │
    │  saved_fixtures      │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Regenerate ICS file │
    │  {username}.ics      │
    └──────────────────────┘
```

---

## Data Storage Details

### 1. Leagues Cache (Node.js)

**File:** `src/data/active_leagues.json`

Generated by `src/scripts/verify_leagues.js` sync script.

```json
[
  {
    "league": {
      "id": 383,
      "name": "Ligat Ha'al",
      "type": "League",
      "logo": "https://..."
    },
    "country": {
      "name": "Israel",
      "code": "IL",
      "flag": "https://..."
    },
    "seasons": [...],
    "status": "active",
    "last_checked": "2026-02-04T..."
  }
]
```

**Status Values:**
| Status | Meaning | Saved? | Shown to User? |
|--------|---------|--------|----------------|
| `active` | Has upcoming fixtures | ✅ | ✅ |
| `vacation` | Season break (has past data, no upcoming) | ✅ | ✅ |
| `archived` | No data found (ghost league) | ❌ | ❌ |

---

## League Sync Flowchart

The sync script (`src/scripts/verify_leagues.js`) determines league status:

```
                    ┌─────────────────────────────┐
                    │  API-Sports /leagues        │
                    │  ?current=true              │
                    └──────────────┬──────────────┘
                                   │
                    Returns all "current" leagues
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  For each league candidate  │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Year Filter                │
                    │  season.year >= minYear?    │
                    └──────────────┬──────────────┘
                           │               │
                          Yes             No → Skip (outdated)
                           │
                    ┌──────▼──────────────────────┐
                    │  Check /fixtures?next=1     │
                    │  (upcoming games)           │
                    └──────────────┬──────────────┘
                           │               │
                     Has fixtures?        No
                           │               │
                    ┌──────▼──────┐   ┌────▼────────────────┐
                    │   ACTIVE    │   │  Check /fixtures    │
                    │   ✅        │   │  ?last=1 (history)  │
                    └─────────────┘   └──────────┬──────────┘
                                           │           │
                                     Has history?     No
                                           │           │
                                    ┌──────▼──────┐    │
                                    │  VACATION   │    │
                                    │  🏖️         │    │
                                    └─────────────┘    │
                                                       │
                                           ┌───────────▼───────┐
                                           │  Check /standings │
                                           └─────────┬─────────┘
                                                │          │
                                          Has data?       No
                                                │          │
                                         ┌──────▼──────┐   │
                                         │  VACATION   │   │
                                         │  🏖️         │   │
                                         └─────────────┘   │
                                                           │
                                                    ┌──────▼──────┐
                                                    │  ARCHIVED   │
                                                    │  ❌ (skip)  │
                                                    └─────────────┘

                    ┌─────────────────────────────────────────────┐
                    │     SAVE TO FILE (Node.js Server)           │
                    │     Only ACTIVE + VACATION leagues saved    │
                    │     → src/data/active_leagues.json          │
                    └─────────────────────────────────────────────┘
```

### API Response → Our Structure Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     API-Sports Response                                      │
│  GET /leagues?country=Israel&current=true                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  {                                                                          │
│    "league": {                                                              │
│      "id": 383,           ─────────────────┐                                │
│      "name": "Ligat Ha'al", ───────────────┤                                │
│      "type": "League",    ─────────────────┤                                │
│      "logo": "https://..."────────────────┐│                                │
│    },                                     ││                                │
│    "country": {                           ││                                │
│      "name": "Israel",    ────────────────┼┤                                │
│      "code": "IL",        ────────────────┼┤                                │
│      "flag": "https://..."────────────────┼┤                                │
│    },                                     ││                                │
│    "seasons": [                           ││                                │
│      { "year": 2025, "current": true }────┼┤                                │
│    ]                                      ││                                │
│  }                                        ││                                │
└───────────────────────────────────────────┼┼────────────────────────────────┘
                                            ││
                 ┌──────────────────────────┘│
                 │  ┌────────────────────────┘
                 ▼  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Our Cached Structure                                     │
│  src/data/active_leagues.json                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  {                                                                          │
│    "league": { ... },        ← Copied as-is (with logo override if needed)  │
│    "country": { ... },       ← Copied as-is (with flag override if needed)  │
│    "seasons": [ ... ],       ← Copied as-is                                 │
│    ────────────────────────────────────────────────────────                 │
│    "status": "active",       ← ADDED by sync (active/vacation)              │
│    "last_checked": "..."     ← ADDED by sync (ISO timestamp)                │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Overrides Applied

The sync script applies these fixes for data integrity:

| Issue | Override |
|-------|----------|
| Continental tournament flags (South America, Europe, etc.) | Replace with confederation logo |
| Missing/broken league logos | Fallback to generic ball icon |

### 2. In-Memory Cache (Node.js)

**Location:** `src/api/footballApi.js`

The cache is a **plain JavaScript object** stored in RAM — no file involved:

```javascript
// Implementation
const apiCache = {};  // Simple key-value store

const CACHE_TTL = {
    fixtures: 6 * 60 * 60 * 1000,   // 6 hours
    static: 24 * 60 * 60 * 1000     // 24 hours
};
```

**Cache Entry Structure:**
```javascript
apiCache = {
  "fixtures_529_10": {
    data: [ {...fixture1}, {...fixture2}, ... ],  // API response
    expiry: 1738712400000                         // Unix timestamp
  },
  "team_leagues_33": {
    data: [ {id: 39, name: "Premier League"}, ... ],
    expiry: 1738698000000
  },
  "countries_list": {
    data: [ {name: "England", code: "GB"}, ... ],
    expiry: 1738784400000
  }
}
```

**Key Naming Patterns:**
| Pattern | Example | Description |
|---------|---------|-------------|
| `fixtures_{teamId}_{count}` | `fixtures_529_10` | Next N fixtures for team |
| `fixtures_{teamId}_{count}_{leagueId}` | `fixtures_529_10_140` | Filtered by league |
| `team_leagues_{teamId}` | `team_leagues_529` | Active competitions |
| `countries_list` | `countries_list` | All countries |
| `leagues_{country}` | `leagues_Israel` | Leagues for country |
| `standings_{leagueId}_{season}` | `standings_39_2025` | League table |

**How It Works:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  getCache(key)                                                       │
│  ├── Entry exists? → Check expiry                                   │
│  │   ├── Not expired → Return data ✅                               │
│  │   └── Expired → Delete entry, return null                        │
│  └── No entry → Return null                                         │
├─────────────────────────────────────────────────────────────────────┤
│  setCache(key, data, type)                                          │
│  └── Store { data, expiry: now + TTL[type] }                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Characteristics:**
| Property | Value |
|----------|-------|
| Storage | RAM (Node.js process memory) |
| Persistence | ❌ Lost on restart/crash |
| Shared across processes | ❌ Each process has own cache |
| Size limit | None (grows unbounded) |
| Eviction | Lazy (on next read if expired) |
| File I/O | None |

**Why Memory-Only (No File)?**
1. **Freshness** — Match data changes (scores, postponements), so short TTL is intentional
2. **Volume** — Writing every team's fixtures to disk would be wasteful
3. **Speed** — Memory access ~1000x faster than disk I/O
4. **Simplicity** — No stale-file cleanup needed; cache rebuilds naturally

**After Server Restart:**
```
First request  → Cache miss → API-Sports call → Populate cache
Next requests  → Cache hit  → Fast response ✅
```

| Cache Type | TTL | Example Keys |
|------------|-----|--------------|
| fixtures | 6 hours | `fixtures_529_10`, `team_leagues_529` |
| static | 24 hours | `countries_list`, `leagues_Israel` |

### API-Sports Fixture Data Structure

The `/fixtures` endpoint returns comprehensive match data:

**Endpoints:**
| Endpoint | Purpose | Example |
|----------|---------|---------|
| `/fixtures?team={id}&next={n}` | Upcoming matches | `?team=4195&next=10` |
| `/fixtures?team={id}&last={n}` | Past results | `?team=4195&last=5` |
| `/fixtures?league={id}&season={year}` | Season schedule | `?league=383&season=2025` |

**Fixture Object Structure:**
```javascript
{
  fixture: {
    id: 1389732,                          // Unique match ID
    date: "2026-01-31T17:30:00+00:00",    // ISO timestamp (UTC)
    venue: {
      name: "Sammy Ofer Stadium",
      city: "Haifa"
    },
    status: {
      long: "Match Finished",             // Human-readable
      short: "FT",                        // NS, 1H, HT, 2H, FT, AET, PEN
      elapsed: 90,                        // Minutes played
      extra: 7                            // Stoppage time
    }
  },
  league: {
    id: 383,
    name: "Ligat Ha'al",
    round: "Regular Season - 21"          // Or "Quarter-finals", etc.
  },
  teams: {
    home: {
      id: 4195,
      name: "Maccabi Haifa",
      logo: "https://media.api-sports.io/football/teams/4195.png",
      winner: true                        // null if not finished
    },
    away: {
      id: 6181,
      name: "Ironi Tiberias",
      logo: "https://media.api-sports.io/football/teams/6181.png",
      winner: false
    }
  },
  goals: {
    home: 3,                              // null if not started
    away: 2
  },
  score: {
    halftime:  { home: 2, away: 1 },
    fulltime:  { home: 3, away: 2 },
    extratime: { home: null, away: null },
    penalty:   { home: null, away: null }
  }
}
```

**Match Status Codes:**
| Code | Meaning |
|------|---------|
| `NS` | Not Started |
| `1H` | First Half |
| `HT` | Halftime |
| `2H` | Second Half |
| `FT` | Full Time |
| `AET` | After Extra Time |
| `PEN` | Penalties |
| `PST` | Postponed |
| `CANC` | Cancelled |

**Real Example — Maccabi Haifa Last 3 Results (Feb 2026):**
| Date | Competition | Match | Score |
|------|-------------|-------|-------|
| Feb 3 | State Cup QF | Maccabi Haifa vs Kafr Qasim | **2-0** ✅ |
| Jan 31 | Ligat Ha'al R21 | Maccabi Haifa vs Ironi Tiberias | **3-2** ✅ |
| Jan 24 | Ligat Ha'al R20 | Maccabi Netanya vs Maccabi Haifa | 4-1 ❌ |

**Real Example — Next Fixtures:**
| Date | Competition | Match | Venue |
|------|-------------|-------|-------|
| Feb 7 | Ligat Ha'al R22 | Hapoel Katamon vs Maccabi Haifa | Teddy Stadium |
| Feb 15 | Ligat Ha'al R23 | Maccabi Haifa vs Bnei Sakhnin | Sammy Ofer |

### 3. SQLite Database (Python)

**File:** `backend/instance/sport_calendar.db`

#### Tables

**users**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | User ID |
| username | VARCHAR(80) | Unique username |
| email | VARCHAR(120) | Unique email |
| password_hash | VARCHAR(255) | Hashed password |
| has_seen_sync_promo | BOOLEAN | UI flag for promo modal |
| created_at | DATETIME | Registration date |

**favorite_teams**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Entry ID |
| user_id | INTEGER FK | References users.id |
| team_id | INTEGER | API-Sports team ID |
| team_name | VARCHAR(120) | Display name |
| team_logo | VARCHAR(255) | Logo URL |
| filters | TEXT (JSON) | `["League", "Cup"]` or `null` (all) |
| is_national | BOOLEAN | True for national teams |
| added_at | DATETIME | Subscription date |

**saved_fixtures**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Entry ID |
| user_id | INTEGER FK | References users.id |
| fixture_id | INTEGER | API-Sports fixture ID |
| fixture_data | TEXT (JSON) | Full fixture object |
| added_at | DATETIME | When saved |

**login_logs**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Log ID |
| username | VARCHAR(80) | Attempted username |
| email | VARCHAR(120) | User email (if found) |
| status | VARCHAR(20) | SUCCESS / FAILURE |
| ip_address | VARCHAR(50) | Client IP |
| timestamp | DATETIME | Attempt time |

### 4. ICS Cache (Python)

**Directory:** `backend/instance/cache/`

Per-user cached ICS files: `{username}.ics`

- TTL: 6 hours
- Invalidated on: add/remove favorite, add/remove fixture

---

## Season Year Logic

Football leagues use two season types:

1. **Academic Year** (Jul-Jun): Most European domestic leagues
   - Season 2024 = Aug 2024 - May 2025
   
2. **Calendar Year** (Jan-Dec): South America, Asia, International tournaments
   - Season 2024 = Jan 2024 - Dec 2024

**Implementation:** `src/utils/config.js` → `getSeasonYear(type)`

```javascript
// Examples in January 2026:
getSeasonYear('academic')  // Returns 2025 (current season started Aug 2025)
getSeasonYear('calendar')  // Returns 2026 (calendar year)
```

---

## Smart Subscription System

The subscription modal shows **only active competitions** for a team:

1. **Fetch** next 50 fixtures for team
2. **Extract** unique league IDs from fixtures
3. **Filter** leagues list by these IDs
4. **Categorize** into: Leagues, Cups, Continental

This ensures eliminated competitions (no upcoming fixtures) are hidden.

---

## Environment Variables

### Node.js (`.env`)

```
FOOTBALL_API_KEY=your-api-key
PORT=3000
BACKEND_URL=http://127.0.0.1:8000
```

### Python (`backend/.env`)

```
FOOTBALL_API_KEY=your-api-key
JWT_SECRET_KEY=your-secret
DATABASE_URL=sqlite:///sport_calendar.db
FLASK_PORT=8000
FLASK_ENV=development
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-app-password
```

---

## Running the Application

**Both servers must run simultaneously:**

```bash
# Terminal 1: Frontend (Node.js)
npm run dev   # Port 3000, uses nodemon

# Terminal 2: Backend (Python)
cd backend && source venv/bin/activate && python app.py  # Port 8000
```

**Kill stuck ports:**
```bash
bash kill_ports.sh
```
