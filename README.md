# ⚽ Match Calendar

A modern web app to track football matches and sync them to your personal calendar. Browse teams by country or continent, subscribe to your favorites, and get automatic calendar updates.

## ✨ Features

### 🔍 Browse Teams
- **By Country**: Select a country → choose league → pick team
- **By Continent**: Europe, South America, Asia, Africa, North America
  - Club Competitions (Champions League, Libertadores, etc.)
  - National Team Tournaments (World Cup, Euro, Copa America, etc.)
  - Country-specific leagues

### ⭐ Subscriptions
- Subscribe to any team with one click (star button in team list)
- **Filter your subscription**: Choose which matches to sync
  - All Matches
  - League Only
  - Cup Only
  - League + Cup
- **Edit subscriptions**: Click your subscribed team chip to modify filters or unsubscribe
- **Preview matches**: See upcoming fixtures before subscribing

### 🗓️ Calendar Sync
- **Auto-Sync** (Registered users): Get a subscription URL that updates automatically
  - Works with Apple Calendar, Google Calendar, Outlook
- **Manual Download**: Export .ics file for any matches
- **My Calendar**: View all your synced matches, trigger manual sync

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

| Component | Tech | Port | Purpose |
|-----------|------|------|---------|
| Frontend | Node.js/Express | 3000 | UI, static files, API-Sports proxy |
| Backend | Python/Flask | 8000 | Auth, subscriptions, calendar export |
| Database | SQLite | - | Users, favorites, saved fixtures |
| External API | API-Sports | - | Football data |

### Request Routing
| Path | Handler |
|------|---------|
| `/api/fixtures/*` | Node.js |
| `/api/auth/*` | Python (proxied) |
| `/api/favorites/*` | Python (proxied) |
| `/calendar/*`, `/sync` | Python (proxied) |

## 📁 Project Structure

```
sport-calendar/
├── public/                 # Frontend
│   ├── index.html
│   ├── css_v2/styles.css
│   └── js/app_v2.js
├── src/                    # Node.js server
│   ├── index.js
│   ├── api/footballApi.js
│   └── routes/fixtures.js
├── backend/                # Python server
│   ├── app.py
│   ├── models.py
│   └── routes/
│       ├── auth.py
│       ├── favorites.py
│       └── calendar.py
└── docs/                   # Documentation
```

## 🔧 Environment Variables

### `.env` (root)
```
FOOTBALL_API_KEY=your_api_key
PORT=3000
BACKEND_URL=http://127.0.0.1:8000
```

### `backend/.env`
```
FOOTBALL_API_KEY=your_api_key
JWT_SECRET_KEY=your_secret
DATABASE_URL=sqlite:///instance/sport_calendar.db
```

## 🧪 Demo Mode

Set `FOOTBALL_API_KEY=demo_key_12345` for mock data without API calls.

## 📞 Support

- API issues: [api-football.com](https://www.api-football.com/)
- App bugs: Open an issue

## 📄 License

MIT License
