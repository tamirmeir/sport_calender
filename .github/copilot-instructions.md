# Sport Calendar - AI Agent Instructions

## Project Overview
Sport Calendar is a **dual-stack application** for browsing football fixtures from API-Sports Football API:
- **Frontend**: Node.js/Express + Vanilla JavaScript (port 3000)
- **Backend**: Python Flask REST API (port 8000)
- **Data**: JSON file storage for favorites and preferences (Node.js) + SQLAlchemy models (Python)

The app supports searching fixtures by team ID, favoriting matches, and tracking teams.

---

## Architecture & Data Flow

### Request Flow
1. **Frontend** (`public/index.html` + `src/`) → User enters team ID
2. **Node.js Router** (`src/routes/fixtures.js`) → Forwards to API service
3. **Football API Client** (`src/api/footballApi.js`) → Calls external API-Sports API
4. **Response** → JSON stored in `src/data/database.json` (locally for favorites)

### Database Strategy
- **Node.js**: File-based (JSON) using `src/utils/database.js` - read/write operations persist to `src/data/database.json`
- **Python Backend**: SQLAlchemy ORM with SQLite/PostgreSQL support; User + FavoriteTeam models in `backend/models.py`
- **No connection** between Node DB and Python DB - they operate independently

### API-Sports Integration
- Both frontends call the same external API (handles demo mode if key is `demo_key_12345`)
- Services implement fallback to mock data when API fails
- API key required: set in `.env` as `FOOTBALL_API_KEY`

---

## Key Directories & Responsibilities

| Directory | Purpose | Note |
|-----------|---------|------|
| `src/` | Node.js server & routes | Main entry: `src/index.js` |
| `src/api/` | API client wrapper | `footballApi.js` handles API-Sports calls |
| `src/utils/` | Shared utilities | `config.js` loads env vars; `database.js` handles JSON persistence |
| `public/` | Frontend HTML/CSS/JS | Static files served by Express |
| `backend/` | Python Flask API | Optional alternative backend |
| `backend/services/` | Business logic | `football_service.py` duplicates API integration |
| `backend/routes/` | Flask endpoints | Separate from Node endpoints |
| `backend/models.py` | ORM models | User/FavoriteTeam relationships |

---

## Developer Workflows

### Running the Application
```bash
# Frontend/Node.js (primary)
npm install
npm run dev          # Auto-reload with nodemon
npm start            # Production

# Backend/Python (optional)
cd backend
source venv/bin/activate
pip install -r requirements.txt
python app.py        # Starts on port 8000
```

### Key Configuration Files
- `.env` - Required for `FOOTBALL_API_KEY`, `API_BASE_URL`, `PORT`
- `backend/.env` - Python backend config: `DATABASE_URL`, `JWT_SECRET_KEY`

### Common Tasks
- **Add fixture route**: Create new route in `src/routes/fixtures.js`; update `footballApi.js` with API call
- **Modify favorites logic**: Edit `src/routes/preferences.js` and `src/utils/database.js`
- **Add Python endpoint**: Create blueprint in `backend/routes/`, register in `backend/app.py`

---

## Project-Specific Patterns & Conventions

### Route Structure
- **Node.js**: Separate routers for `fixtures` and `preferences` mounted in `src/index.js`
- **Python**: Flask blueprints in `backend/routes/` (auth, fixtures, favorites); registered via `create_app()` factory
- All endpoints return `{ success, data, error }` format in Node; `{ error, ... }` in Python

### Error Handling
- Node.js: Try/catch in routes, error middleware catches unhandled errors
- Python: Flask `@app.errorhandler()` decorators for 404, 500 responses
- Both fall back to demo/mock data on API failure

### API Key Management
- Demo mode triggered when key equals `demo_key_12345` (checked in `football_service.py` + `footballApi.js`)
- Never commit real keys; use `.env.example` as template

### Database Persistence
- Node: `src/utils/database.js` provides `readDB()`, `writeDB()`, `addFavorite()`, `removeFavorite()` helpers
- Python: SQLAlchemy with cascade deletes; call `db.session.commit()` to persist
- File-based node DB has no transaction support; read/write operations are atomic via `fs.writeFileSync()`

---

## Integration Points & External Dependencies

### API-Sports Football API
- **Endpoint**: `https://v3.football.api-sports.io`
- **Headers Required**: `x-apisports-key` (API key), `x-apisports-host`
- **Key Calls**:
  - `GET /fixtures?team={id}&next={n}` - Next N fixtures for a team
  - `GET /teams?id={id}` - Team info
  - `GET /fixtures?date={date}` - Fixtures by date

### CORS & Cross-Origin
- Node.js handles static frontend
- Python backend has `CORS(app)` enabled for all `/api/*` routes (open origins)

### Optional Dependencies
- `nodemon` - Dev dependency for auto-reload
- `dotenv` - Load environment variables
- `axios` - HTTP client for API calls (Node.js)
- `requests` - HTTP library (Python)

---

## Important Conventions to Maintain

1. **Naming**: Routes use kebab-case (`/api/preferences/favorites`); Python functions use snake_case
2. **Query Parameters**: `next=10` for fixture limit (default 10, max 100 in Python validation)
3. **Error Response Format**:
   - Node.js: `{ success: false, error: "message" }`
   - Python: `{ error: "message" }, 400`
4. **Timestamps**: Fixture dates use ISO 8601 format (`date.toISOString()` in JS, `.isoformat()` in Python)
5. **Database ID**: `lastUpdated` field added to JSON db on every write
6. **Fixture Objects**: Standardized structure from API-Sports (fixture, league, teams, goals)

---

## Critical Implementation Notes

- **No shared database**: Frontend (JSON) and backend (SQLAlchemy) store data independently
- **No auth enforcement**: Node routes don't validate JWT; Python backend includes JWT setup but not enforced in fixtures
- **Stateless services**: Both backends are stateless; API calls are read-only except favorites/preferences
- **Fallback behavior**: Always include mock data as fallback for API failures
- **File permissions**: Node DB requires writable `src/data/` directory
