# Sport Calendar - AI Agent Instructions

## Project Overview
Sport Calendar is a **hybrid dual-stack application** that combines a Node.js/Express frontend server with a Python/Flask backend API.
- **Node.js**: Serves the UI, proxies auth requests, and handles public football data fetching directly.
- **Python**: Manages user authentication, favorites persistence (SQLite), and calendar synchronization.
- **External Data**: API-Sports Football API (v3).

## Architecture & Service Boundaries

### Request Routing Strategy (Crucial)
The Node.js server (`src/index.js`) acts as the primary gateway (Port 3000). Requests are routed as follows:

| Path Pattern | Handled By | Implementation |
|--------------|------------|----------------|
| `/api/fixtures/*` | **Node.js** | `src/routes/fixtures.js` (Direct API-Sports calls) |
| `/api/auth/*` | **Python** | Proxied to Port 8000 (`backend/routes/auth.py`) |
| `/api/favorites/*` | **Python** | Proxied to Port 8000 (`backend/routes/favorites.py`) |
| `/calendar/*` | **Python** | Proxied to Port 8000 (`backend/routes/calendar.py`) |
| `/sync` | **Python** | Proxied to Port 8000 |
| `/*` (Static) | **Node.js** | `public/` directory |

**Implementation Note**: Explicit proxy rules are defined in `src/index.js` using `http-proxy-middleware`. Any route NOT in the proxy list is handled by Node.js.

### Data Persistence
- **Python (Primary)**: `instance/sport_calendar.db` (SQLite) uses SQLAlchemy (`backend/models.py`). Stores Users, Favorite Teams, and Saved Fixtures.
- **Node.js (Legacy/Local)**: `src/data/database.json` accessed via `src/utils/database.js`. *Note: The active `/api/favorites` route is currently proxied to Python, bypassing this local file.*

## Developer Workflows

### Environment Setup
Requires **two** `.env` files:
1.  **Node (`.env`)**: `FOOTBALL_API_KEY`, `PORT` (3000), `BACKEND_URL`.
2.  **Python (`backend/.env`)**: `FOOTBALL_API_KEY`, `DATABASE_URL`, `JWT_SECRET_KEY`, `FLASK_APP=app.py`.

### Running the Stack
The application requires **both** servers running simultaneously:

```bash
# Terminal 1: Node.js Frontend (Port 3000)
npm run dev      # Uses nodemon via src/index.js

# Terminal 2: Python Backend (Port 8000)
cd backend
source venv/bin/activate
python app.py
```

## Key code conventions

### Node.js Patterns (`src/`)
- **API Client**: `src/api/footballApi.js` wraps external calls. Always use this wrapper, do not make raw `axios` calls in routes.
- **Frontend Assets**: Raw HTML/JS/CSS in `public/`. No build step (Webpack/Vite) is currently used; standard script tags.

### Python Patterns (`backend/`)
- **Blueprints**: All routes are organized in `backend/routes/` as Flask Blueprints.
- **Services**: Business logic for API fetching stays in `backend/services/football_service.py` (mirrors Node's API client).
- **Extensions**: `db`, `jwt`, `mail` are initialized in `extensions.py` to avoid circular imports.

## Common Tasks & "Gotchas"
- **Adding a Read-Only Data Route**: Add to **Node.js** (`src/routes/fixtures.js`) to reduce latency (avoids proxy hop).
- **Adding User/State Logic**: Add to **Python** (`backend/routes/`) & update `src/index.js` proxy list if the URL prefix is new.
- **Database Migrations**: Python uses `db.create_all()` in `app.py` on startup. No Alembic setup is visible currently; schema changes may require manual handling or recreating the DB file in dev.
- **Mock Data**: Both backends support a "Demo Mode" if `FOOTBALL_API_KEY` is set to `demo_key_12345`.
