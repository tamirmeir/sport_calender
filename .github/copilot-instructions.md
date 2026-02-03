# Sport Calendar - AI Agent Instructions

## Project Overview
A **hybrid dual-stack application** (Node.js + Python) for browsing football fixtures with user accounts and calendar sync.
- **Node.js/Express (Port 3000)**: Primary gateway, serves UI, handles fixture data directly from API-Sports.
- **Python/Flask (Port 8000)**: Auth, favorites persistence (SQLite/SQLAlchemy), calendar export.
- **External API**: API-Sports Football API v3.

## Critical Architecture: Request Routing

The proxy configuration in [src/index.js](src/index.js#L10-L21) determines which backend handles each request:

| Path Pattern | Handler | File |
|--------------|---------|------|
| `/api/fixtures/*` | Node.js | [src/routes/fixtures.js](src/routes/fixtures.js) |
| `/api/auth/*` | Python (proxied) | [backend/routes/auth.py](backend/routes/auth.py) |
| `/api/favorites/*` | Python (proxied) | [backend/routes/favorites.py](backend/routes/favorites.py) |
| `/calendar/*`, `/sync` | Python (proxied) | [backend/routes/calendar.py](backend/routes/calendar.py) |
| `/*` (static) | Node.js | `public/` directory |

**⚠️ Key Rule**: Adding a new proxied route requires updating `pathFilter` array in `src/index.js`.

## Running the Application

**Both servers must run simultaneously:**
```bash
# Terminal 1: Frontend
npm run dev   # Port 3000, uses nodemon

# Terminal 2: Backend  
cd backend && source venv/bin/activate && python app.py  # Port 8000
```

**Environment files required:**
- `.env`: `FOOTBALL_API_KEY`, `PORT=3000`, `BACKEND_URL=http://127.0.0.1:8000`
- `backend/.env`: `FOOTBALL_API_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`

## Code Patterns

### Node.js (`src/`)
- **Always use** [src/api/footballApi.js](src/api/footballApi.js) for API-Sports calls—never raw axios in routes.
- **Caching**: Built-in memory cache in `footballApi.js` (6h fixtures, 24h static data).
- **Season logic**: Use `getSeasonYear()` from [src/utils/config.js](src/utils/config.js) for academic (Jul-Jun) vs calendar year seasons.

### Python (`backend/`)
- **Blueprints**: Routes in `backend/routes/` registered in [backend/app.py](backend/app.py#L52-L58).
- **Extensions**: Import `db`, `jwt`, `mail` from [backend/extensions.py](backend/extensions.py) (avoids circular imports).
- **Models**: [backend/models.py](backend/models.py) defines `User`, `FavoriteTeam`, `SavedFixture`, `LoginLog`.

### Frontend (`public/`)
- Vanilla JS with no build step. Main logic in [public/js/app_v2.js](public/js/app_v2.js).
- **Safe unwrap pattern**: API responses may be raw arrays or `{response: [...]}`. Always handle both:
  ```javascript
  const list = Array.isArray(data) ? data : (data.response || []);
  ```

## Common Tasks

| Task | Where to implement |
|------|-------------------|
| New read-only data endpoint | Node.js: `src/routes/fixtures.js` |
| New user-state endpoint | Python: `backend/routes/` + update proxy in `src/index.js` |
| Database schema change | Edit `backend/models.py`, restart app (uses `db.create_all()`, no migrations) |
| Test without API key | Set `FOOTBALL_API_KEY=demo_key_12345` for mock data mode |

## Database Schema (SQLite)
- `users`: id, username, email, password_hash, has_seen_sync_promo, created_at
- `favorite_teams`: id, user_id (FK), team_id, team_name, team_logo, filters (JSON), added_at
- `saved_fixtures`: id, user_id (FK), fixture_id, fixture_data (JSON), added_at

## Kill Stuck Ports
If ports 3000/8000 are stuck, run: `bash kill_ports.sh`
