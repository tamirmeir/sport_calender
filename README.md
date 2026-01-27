# Sport Calendar App

A responsive sports calendar application to display upcoming football fixtures from the API-Sports Football API.

## ✨ Features

- 🔐 **User Authentication** - Secure Login and Registration
- 🏆 **View upcoming fixtures** for any team
- 📅 **Display match details** (teams, dates, times, venues)
- 🔴 **Real-time status** (Live, Finished, Upcoming)
- ⭐ **Manage Favorites** - Save teams to your account and sync across devices
- 🎯 **Filter fixtures** by status
- 📱 **Responsive design** - works on all devices
- ⚡ **Fast API integration** with API-Sports Football API

## 🏗️ Architecture

This is a **Dual-Stack Application**:
- **Frontend Server (Node.js/Express):** Serves the UI app and handles static assets. Running on Port `3000`.
- **Backend API (Python/Flask):** Handles User Authentication, Database interactions (SQLite), and proxies requests to the Football API. Running on Port `8000`.

## 🚀 Quick Start

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cd ..
```

### 2. Set Up Environment Variables

**Frontend (`.env`):**
```env
FOOTBALL_API_KEY=your_apisports_key
API_BASE_URL=https://v3.football.api-sports.io
PORT=3000
```

**Backend (`backend/.env`):**
```env
FLASK_APP=app.py
FLASK_ENV=development
JWT_SECRET_KEY=your_super_secret_jwt_key
DATABASE_URL=sqlite:///instance/sport_calendar.db
FOOTBALL_API_KEY=your_apisports_key
```

### 3. Start the Application

You need to run **both** servers.

**Terminal 1 (Backend):**
```bash
cd backend
python3 app.py
```

**Terminal 2 (Frontend):**
```bash
# Production
npm start

# Development with auto-reload
npm run dev
```

The app will be available at `http://localhost:3000`. Authentication requests will be proxied to the Python backend at `http://localhost:8000`.

## 📚 API Endpoints

### Fixtures
- `GET /api/fixtures/team/:teamId?next=10` - Get next fixtures for a team
- `GET /api/fixtures/:fixtureId` - Get specific fixture details
- `GET /api/fixtures/date/:date` - Get fixtures by date

### Preferences
- `GET /api/preferences/favorites` - Get favorite fixtures
- `POST /api/preferences/favorites` - Add favorite
- `DELETE /api/preferences/favorites/:fixtureId` - Remove favorite
- `GET /api/preferences/teams` - Get tracked teams
- `POST /api/preferences/teams` - Add tracked team
- `DELETE /api/preferences/teams/:teamId` - Remove tracked team

## 📁 Project Structure

```
sport-calendar/
├── public/
│   ├── index.html        # Main HTML
│   ├── css/
│   │   └── styles.css    # Styling
│   └── js/
│       └── app.js        # Frontend logic
├── src/
│   ├── index.js          # Server entry point
│   ├── api/
│   │   └── footballApi.js # API service
│   ├── routes/
│   │   ├── fixtures.js   # Fixtures routes
│   │   └── preferences.js# Preferences routes
│   └── utils/
│       ├── config.js     # Configuration
│       └── database.js   # Local database
├── data/
│   └── database.json     # Stored favorites & preferences
├── package.json
└── README.md
```

## 🔧 Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **API**: API-Sports Football API
- **Database**: JSON file storage (local)

## 📊 Example Usage

### Search for Team 604 (Next 10 Fixtures)
1. Go to `http://localhost:3000`
2. Enter Team ID: `604`
3. Enter Number of Fixtures: `10`
4. Click "Search Fixtures"

### Popular Team IDs
- **604** - Manchester United
- **33** - Manchester City
- **42** - Arsenal
- **49** - Chelsea
- **47** - Liverpool

## 🎨 Features

### Status Indicators
- 🔵 **Upcoming** - Blue badge
- 🔴 **Live** - Red badge with animation
- ✅ **Finished** - Green badge

### Filters
- All - Show all fixtures
- Upcoming - Not yet played
- Live - Currently playing
- Finished - Already completed

## 📝 Notes

- Data is stored locally in `data/database.json`
- API requests are rate-limited; check API documentation
- Team IDs can be found at [api-football.com](https://www.api-football.com/)

## 🛠️ Development

### Run in Development Mode
```bash
npm run dev
```
Uses nodemon to auto-restart on file changes

### Run Tests
```bash
npm test
```

## 📄 License

MIT License - feel free to use this project for learning and personal use!

## 🤝 Contributing

Contributions are welcome! Feel free to fork and submit pull requests.

## 📞 Support

For issues with the API, visit [api-football.com](https://www.api-football.com/)
For bugs in this app, please open an issue.
