# File Reference - Code Documentation

> Last Updated: February 2026 - Added Tournament Data System

## 🏆 Tournament Data System Files (IMPLEMENTED)

### New Data Files (`src/data/`)

**Tournament Master Data** (51KB total across 5 files):
- `world_tournaments_master.json` (15.8KB) - 13 major tournaments with complete metadata
- `status_rules.json` (10.3KB) - Month-based status calculation rules  
- `display_config.json` (8.4KB) - UI styling and badge configurations
- `regions_config.json` (7.0KB) - Regional season patterns
- `country_mappings.json` (5.3KB) - Tournament-to-country fixes

**New API Endpoints**:
- `/api/fixtures/tournaments/status/all` - Main tournament status endpoint
- `/api/fixtures/tournaments/master` - Complete tournament database
- `/api/fixtures/tournaments/winners/current` - Winners-only data
- `/api/fixtures/tournaments/country/:name` - Country-specific tournaments
- `/api/fixtures/tournaments/:id/status` - Individual tournament status

**Frontend Integration**:
- `loadTournamentData()` function in `public/js/app_v2.js`
- `tournamentDataCache` for performance optimization
- Golden card rendering for finished tournaments
- Automatic fallback to hardcoded data

---

## Directory Structure Overview

```
sport_calender/
├── src/                    # Node.js Backend (Gateway)
│   ├── index.js           # Express server entry point
│   ├── api/
│   │   └── footballApi.js # API-Sports wrapper
│   ├── routes/
│   │   ├── fixtures.js    # Fixture endpoints
│   │   └── preferences.js # User preferences (legacy)
│   ├── scripts/
│   │   └── verify_leagues.js  # League sync script
│   ├── data/
│   │   └── active_leagues.json # Cached leagues
│   └── utils/
│       ├── config.js      # Configuration & season utils
│       └── database.js    # Legacy JSON database
│
├── backend/                # Python Backend (Auth/Data)
│   ├── app.py             # Flask app factory
│   ├── extensions.py      # Flask extensions (db, jwt, mail)
│   ├── models.py          # SQLAlchemy models
│   ├── config.py          # Python configuration
│   ├── routes/
│   │   ├── auth.py        # Authentication
│   │   ├── favorites.py   # Team subscriptions
│   │   ├── calendar.py    # ICS generation
│   │   └── fixtures.py    # Python fixture API (fallback)
│   └── services/
│       └── football_service.py # Python API-Sports client
│
├── public/                 # Frontend (Static)
│   ├── index.html         # Main SPA page
│   ├── js/
│   │   └── app_v2.js      # Main application logic
│   └── css_v2/
│       └── styles.css     # Stylesheet
│
└── docs/                   # Documentation
```

---

## Node.js Files

### `src/index.js`

Express server entry point with proxy configuration.

```javascript
// Key Components
- Express server setup
- Static file serving (public/)
- Proxy middleware for Python backend
- Route mounting

// Proxy Configuration (pathFilter)
['/api/auth', '/api/favorites', '/calendar', '/sync']
→ Forwarded to BACKEND_URL (port 8000)
```

### `src/api/footballApi.js`

API-Sports wrapper with caching.

| Function | Description |
|----------|-------------|
| `getCache(key)` | Get cached value if not expired |
| `setCache(key, data, type)` | Store with TTL (fixtures: 6h, static: 24h) |
| `getFixturesByTeam(teamId, next, leagueId)` | Team fixtures with optional league filter |
| `getCountries()` | All countries list |
| `getLeagues(country)` | Leagues from cache or API |
| `getTeams(league, season)` | Teams in league |
| `getNationalTeam(country)` | National team by country |
| `getStandings(league, season)` | League standings |
| `getFixturesByLeague(league, season, next, last, status)` | League fixtures |
| `getActiveTournamentTeams(league, season)` | Active teams heuristic |
| `getCurrentSeasonForLeague(leagueId)` | Get league's current season |
| `getFixtureById(fixtureId)` | Single fixture details |
| `getFixturesByDate(date)` | All fixtures on date |
| `getFixturesByIds(ids)` | Batch fixture fetch |
| `getPastFixtures(teamId, last)` | Historical results |
| `getLeaguesByTeam(teamId, isNational)` | **Smart competition detection** |
| `getMockFixtures()` | Demo mode data |

### `src/routes/fixtures.js`

Express routes for fixture data.

| Route | Handler |
|-------|---------|
| `GET /countries` | List countries |
| `GET /leagues` | Leagues by country |
| `GET /teams` | Teams by league or national |
| `GET /standings` | League standings |
| `GET /fixtures` | League fixtures |
| `GET /active-teams` | Active tournament participants |
| `GET /team/:teamId` | Team fixtures |
| `GET /:fixtureId` | Single fixture |
| `GET /date/:date` | Date fixtures |
| `GET /history/:teamId` | Past results |
| `GET /team-leagues/:teamId` | Team competitions |

### `src/scripts/verify_leagues.js`

League synchronization script.

| Function | Description |
|----------|-------------|
| `validateRequestParams(endpoint, params)` | Validate API params |
| `fetchFromApi(endpoint, params)` | Safe API fetch |
| `fetchAllCurrentLeagues()` | Get all leagues with current=true |
| `verifiedLeagueActive(leagueId, season)` | Check if league has data |
| `runSync()` | Main sync orchestrator |
| `runTest()` | API connection test |

**Usage:**
```bash
node src/scripts/verify_leagues.js --fresh  # Full sync
node src/scripts/verify_leagues.js          # Incremental
node src/scripts/verify_leagues.js --test   # Test only
```

### `src/utils/config.js`

Configuration and season utilities.

| Export | Description |
|--------|-------------|
| `PORT` | Server port (default 3000) |
| `FOOTBALL_API_KEY` | API key from .env |
| `API_BASE_URL` | API-Sports base URL |
| `IS_DEMO_MODE` | True if using demo key |
| `BACKEND_URL` | Python backend URL |
| `getSeasonYear(type)` | Get current season (academic/calendar) |
| `getSeasonWindow()` | Min/max years for sync |

---

## Python Files

### `backend/app.py`

Flask application factory.

| Function | Description |
|----------|-------------|
| `create_app()` | Initialize Flask with extensions and blueprints |

**Registered Blueprints:**
- `auth_bp` → `/api/auth`
- `favorites_bp` → `/api/favorites`
- `fixtures_bp` → `/api/fixtures`
- `calendar_bp` → `/` (root)

### `backend/models.py`

SQLAlchemy models.

| Model | Description |
|-------|-------------|
| `User` | User accounts with password hash |
| `FavoriteTeam` | Team subscriptions with filters |
| `SavedFixture` | Calendar events (fixture JSON) |
| `LoginLog` | Authentication audit log |

### `backend/extensions.py`

Shared Flask extensions (avoids circular imports).

```python
db = SQLAlchemy()      # Database
jwt = JWTManager()     # JWT auth
mail = Mail()          # Email sending
```

### `backend/routes/auth.py`

Authentication endpoints.

| Function | Route | Description |
|----------|-------|-------------|
| `register()` | POST /register | Create account |
| `login()` | POST /login | Get JWT token |
| `get_me()` | GET /me | Current user info |
| `reset_request()` | POST /reset-request | Request password reset |
| `reset_password()` | POST /reset-password | Set new password |
| `promo_seen()` | POST /promo-seen | Mark sync promo seen |
| `_validate_password(pw)` | Helper | Check password rules |

### `backend/routes/favorites.py`

Team subscription management.

| Function | Route | Description |
|----------|-------|-------------|
| `get_favorites()` | GET / | List subscriptions |
| `add_favorite()` | POST / | Add/update subscription |
| `remove_favorite()` | DELETE /:id | Remove subscription |
| `get_all_fixtures()` | GET /fixtures | Aggregated fixtures |
| `_should_include_fixture(f, filters)` | Helper | Filter logic |

**Auto-Sync Logic:**
When a favorite is added, automatically fetches next 10 fixtures and saves to `SavedFixture`.

### `backend/routes/calendar.py`

ICS calendar generation.

| Function | Route | Description |
|----------|-------|-------------|
| `add_to_calendar()` | POST /calendar/add | Save fixtures |
| `get_calendar_events()` | GET /calendar/events | List events |
| `delete_calendar_event()` | DELETE /calendar/events/:id | Remove event |
| `clear_calendar()` | DELETE /calendar/clear | Clear all |
| `get_ics_feed()` | GET /sync/MatchDayByTM/:user.ics | Public ICS |
| `_invalidate_cache(username)` | Helper | Clear ICS cache |

**ICS Caching:**
- Location: `backend/instance/cache/{username}.ics`
- TTL: 6 hours
- Regenerated with fresh API data on cache miss

### `backend/services/football_service.py`

Python API-Sports client.

| Method | Description |
|--------|-------------|
| `get_fixtures_by_team(team_id, next_n)` | Team fixtures |
| `get_fixtures_by_ids(ids)` | Batch fixture fetch |
| `get_fixture_by_id(fixture_id)` | Single fixture |

---

## Frontend Files

### `public/js/app_v2.js`

Main SPA application (3300+ lines).

#### State Management

```javascript
currentState = { step, country, league, team, mode }
userFavorites = Map<teamId, {filters, isNational}>
selectedFixtures = Set<fixtureId>
teamCompetitionsCache = Map<teamId, competitions>
```

#### Key Functions

| Category | Functions |
|----------|-----------|
| **Navigation** | `updateNavigation()`, `showStep()`, `goBack()` |
| **Countries** | `loadCountries()`, `showCountrySelection()`, `showContinentSelection()` |
| **Leagues** | `loadLeagues()`, `selectCountry()` |
| **Teams** | `loadTeams()`, `selectLeague()` |
| **Fixtures** | `loadFixtures()`, `renderFixtures()`, `selectTeam()` |
| **Auth** | `checkAuth()`, `login()`, `register()`, `logout()` |
| **Favorites** | `loadUserFavorites()`, `toggleFavorite()`, `showSubscribeModal()` |
| **Smart Modal** | `openSmartSubscriptionModal()`, `fetchTeamCompetitions()` |
| **Calendar** | `addSelectedToCalendar()`, `downloadAllMatches()` |
| **UI Helpers** | `showError()`, `showSuccess()`, `showLoading()` |

#### Smart Subscription Modal

```javascript
openSmartSubscriptionModal(teamId, teamName, teamLogo, isNational)
  ↓
fetchTeamCompetitions(teamId, isNational)
  → GET /api/fixtures/team-leagues/{teamId}?national={bool}
  ↓
renderCompetitionOptions()
  → Categorized checkboxes (Leagues, Cups, Continental)
  ↓
saveSubscription()
  → POST /api/favorites
```

#### Context-Aware Star System

```javascript
getStarState(teamId)
  → 'not-subscribed' (☆ grey)
  → 'subscribed-here' (★ gold)  
  → 'subscribed-other' (★ muted) // Subscribed but with different filters
```

### `public/index.html`

Single page application shell.

- Tab navigation (Country, Continent, Global)
- Three-step wizard (Country → League → Team)
- Modals (Auth, Subscribe, Calendar)
- Fixtures display area

### `public/css_v2/styles.css`

Application styles.

- Grid layout for cards
- Tab styling
- Modal styling
- Star button states
- Responsive design

---

## Configuration Files

### `package.json`

Node.js dependencies and scripts.

| Script | Command |
|--------|---------|
| `start` | `node src/index.js` |
| `dev` | `nodemon src/index.js` |

### `backend/requirements.txt`

Python dependencies.

```
Flask
Flask-SQLAlchemy
Flask-JWT-Extended
Flask-CORS
Flask-Mail
python-dotenv
Werkzeug
requests
```

### `.vscode/tasks.json`

VS Code task definitions.

| Task | Description |
|------|-------------|
| Run Python Backend | Start Flask server |
| Run Frontend Service | Start Node server |
| Kill Ports | Kill processes on 3000/8000 |
