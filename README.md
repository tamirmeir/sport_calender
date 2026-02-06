# ⚽ Match Calendar

A modern web app to track football matches and sync them to your personal calendar. Browse teams by country or continent, subscribe to your favorites, and get automatic calendar updates.

## ✨ Features

### 🔍 Browse Teams
- **By Country**: Select a country → choose league → pick team
- **By Continent**: Europe, South America, Asia, Africa, North America
  - Club Competitions (Champions League, Libertadores, etc.)
  - National Team Tournaments (World Cup, Euro, Copa America, etc.)
  - Country-specific leagues
- **Global**: World Cup, Friendlies, Club World Cup

### ⭐ Smart Subscriptions
- Subscribe to any team with one click (star button in team list)
- **Smart competition detection**: Only shows competitions where team has upcoming fixtures
- **Filter your subscription**: Choose which matches to sync
  - All Matches
  - League Only
  - Cup Only
  - Specific competitions (Champions League, Europa League, etc.)
- **Context-aware stars**: Gold = subscribed for current view, Grey = subscribed elsewhere
- **Edit subscriptions**: Click your subscribed team chip to modify filters or unsubscribe

### 🗓️ Calendar Sync
- **Auto-Sync** (Registered users): Get a subscription URL that updates automatically
  - Works with Apple Calendar, Google Calendar, Outlook
- **Manual Download**: Export .ics file for any matches
- **Smart filtering**: Only syncs matches matching your subscription filters

### 👤 User Accounts
- Register/Login with email
- Password reset via email
- Subscriptions persist across devices

## 🚀 Quick Start

**Both servers must run simultaneously:**

```bash
# Terminal 1: Frontend (Node.js)
npm install
npm run dev   # Port 3000

# Terminal 2: Backend (Python)
cd backend
source venv/bin/activate
pip install -r requirements.txt
python app.py  # Port 8000
```

Open `http://localhost:3000`

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                             │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              NODE.JS / EXPRESS (Port 3000)                      │
│  • Serves static files (public/)                                │
│  • Handles /api/fixtures/* (football data)                      │
│  • Proxies /api/auth, /api/favorites, /calendar to Python       │
└───────────────────────────┬─────────────────────────────────────┘
         ┌──────────────────┴──────────────────┐
         ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│  PYTHON / FLASK     │              │  API-SPORTS         │
│  (Port 8000)        │              │  (External API)     │
│  • Authentication   │              │  • Football Data    │
│  • User Management  │              │  • Fixtures/Teams   │
│  • Favorites CRUD   │              └─────────────────────┘
│  • Calendar Export  │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  SQLITE DATABASE    │
│  • users            │
│  • favorite_teams   │
│  • saved_fixtures   │
└─────────────────────┘
```

### Request Routing
| Path | Handler | File |
|------|---------|------|
| `/api/fixtures/*` | Node.js | src/routes/fixtures.js |
| `/api/auth/*` | Python (proxied) | backend/routes/auth.py |
| `/api/favorites/*` | Python (proxied) | backend/routes/favorites.py |
| `/calendar/*`, `/sync/*` | Python (proxied) | backend/routes/calendar.py |

## 📁 Project Structure

```
sport_calender/
├── public/                     # Frontend (Vanilla JS)
│   ├── index.html              # Main SPA page
│   ├── css_v2/styles.css       # Stylesheet
│   └── js/app_v2.js            # App logic (3300+ lines)
│
├── src/                        # Node.js Backend
│   ├── index.js                # Express entry + proxy
│   ├── api/footballApi.js      # API-Sports wrapper (745 lines)
│   ├── routes/fixtures.js      # Fixture endpoints
│   ├── data/active_leagues.json # Verified leagues cache
│   └── scripts/verify_leagues.js # Sync script
│
├── backend/                    # Python Backend
│   ├── app.py                  # Flask entry
│   ├── models.py               # SQLAlchemy models
│   ├── routes/
│   │   ├── auth.py             # Auth endpoints
│   │   ├── favorites.py        # Favorites CRUD
│   │   └── calendar.py         # Calendar sync
│   └── instance/
│       └── sport_calendar.db   # SQLite database
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # System architecture
│   ├── API_REFERENCE.md        # API documentation
│   └── FILE_REFERENCE.md       # File-by-file docs
│
└── .env                        # Environment variables
```

## 🔧 Environment Variables

### `.env` (root - Node.js)
```env
FOOTBALL_API_KEY=your_api_key
PORT=3000
BACKEND_URL=http://127.0.0.1:8000
```

### `backend/.env` (Python)
```env
FOOTBALL_API_KEY=your_api_key
JWT_SECRET_KEY=your_secret
DATABASE_URL=sqlite:///sport_calendar.db
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_app_password
```

## 🔄 League Sync

The app maintains a verified cache of active leagues. To refresh:

```bash
# Full resync (~22 minutes for 1200+ leagues)
node src/scripts/verify_leagues.js --fresh

# Incremental (skips recently verified)
node src/scripts/verify_leagues.js
```

## 🧪 Demo Mode

Set `FOOTBALL_API_KEY=demo_key_12345` for mock data without API calls.

## � League Validation

Automated validation system to ensure tournament statuses are correct:

```bash
# Validate all 975 leagues (runs in ~5 minutes)
./src/scripts/run_validation.sh 10

# Check specific batch (e.g., batch 1 of 10)
node src/scripts/validate_leagues_batch.js 1 10
```

**What it validates:**
- ✅ Finished tournaments are correctly marked
- ⚠️ Leagues without fixtures (candidates for finished status)
- ❌ Errors: Leagues marked finished but still active

**Latest report**: `VALIDATION_REPORT_2026-02-05.md`

## �📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [API Data Flow](docs/API_DATA_FLOW.md) - All API endpoints and sync process
- [File Reference](docs/FILE_REFERENCE.md) - Function documentation

## 🐛 Troubleshooting

**Ports stuck?**
```bash
bash kill_ports.sh
```

**Backend not running?**
Check if both servers are running: Node.js on 3000, Python on 8000.

## 📄 License

MIT License

