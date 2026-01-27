# Sport Calendar Backend - Python Flask API

Professional backend server for Sport Calendar application.

## 📋 Project Structure

```
backend/
├── app.py                    # Main Flask application
├── config.py                 # Configuration settings
├── extensions.py             # Database (db) and JWT extensions
├── models.py                 # Database models (User, FavoriteTeam)
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── run.sh                    # Start script (Mac/Linux)
├── run.bat                   # Start script (Windows)
├── routes/                   # API route handlers
│   ├── __init__.py
│   ├── auth.py               # User registration & login
│   ├── favorites.py          # Favorite teams management
│   └── fixtures.py           # Football fixtures endpoints
└── services/                 # Business logic
    ├── __init__.py
    └── football_service.py   # API-Sports integration
```

## 🚀 Quick Start

### **Option 1: Using Shell Script (Mac/Linux)**

```bash
cd backend
chmod +x run.sh
./run.sh
```

### **Option 2: Using Batch File (Windows)**

```batch
cd backend
run.bat
```

### **Option 3: Manual Setup**

**1. Create Virtual Environment:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate     # Windows
```

**2. Install Dependencies:**
```bash
pip install -r requirements.txt
```

**3. Setup Environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

**4. Run Server:**
```bash
python app.py
```

Server will start on **http://localhost:8000**

## 🔑 API Endpoints

### **Health Check**
- `GET /health` - Check server status

### **Authentication** (No token required)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

**Example:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### **Fixtures** (No token required)
- `GET /api/fixtures/team/<team_id>?next=10` - Get team fixtures
- `GET /api/fixtures/team/<team_id>/info` - Get team info

**Example:**
```bash
curl http://localhost:8000/api/fixtures/team/604?next=10
```

### **Favorites** (Requires JWT Token)
- `GET /api/favorites` - Get user's favorite teams
- `POST /api/favorites` - Add favorite team
- `DELETE /api/favorites/<team_id>` - Remove favorite
- `GET /api/favorites/matches` - Get all matches of favorite teams

**Example with Token:**
```bash
curl -X GET http://localhost:8000/api/favorites \
  -H "Authorization: Bearer <your_jwt_token>"
```

## 📊 Database

- **Type:** SQLite (default)
- **File:** `sport_calendar.db` (created automatically)
- **Tables:**
  - `users` - User accounts
  - `favorite_teams` - User's favorite teams

## 🔐 Environment Variables

Create `.env` file in backend directory:

```env
FLASK_ENV=development
FLASK_APP=app.py
DATABASE_URL=sqlite:///sport_calendar.db
JWT_SECRET_KEY=your_secret_key_here_change_in_production
FOOTBALL_API_KEY=your_api_sports_key
API_BASE_URL=https://v3.football.api-sports.io
FLASK_PORT=8000
```

## 📦 Dependencies

- **Flask** - Web framework
- **Flask-SQLAlchemy** - Database ORM
- **Flask-JWT-Extended** - JWT authentication
- **Flask-CORS** - Cross-origin requests
- **python-dotenv** - Environment variables
- **requests** - HTTP client
- **Werkzeug** - Security utilities

## 🔗 Integration with Frontend

Frontend (Node.js on port 3000) communicates with backend on port 8000.

Update frontend API base URL:
```javascript
const API_BASE = 'http://localhost:8000/api';
```

## 🧪 Testing Endpoints

### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123"
  }'
```

Response will include `access_token` - save this!

### Add Favorite Team
```bash
curl -X POST http://localhost:8000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": 604,
    "team_name": "Manchester United",
    "team_logo": "https://..."
  }'
```

### Get Favorite Matches
```bash
curl -X GET http://localhost:8000/api/favorites/matches \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🐛 Troubleshooting

**Port 8000 already in use:**
```bash
# Change port in .env
FLASK_PORT=8001
```

**Database locked:**
```bash
# Delete the database file and let it recreate
rm sport_calendar.db
```

**Module not found errors:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

## 🚀 Deployment

For production:

1. Set `FLASK_ENV=production`
2. Change `JWT_SECRET_KEY` to a strong random string
3. Use PostgreSQL instead of SQLite
4. Deploy to Heroku, AWS, or similar

## 📝 Notes

- All responses are JSON
- Timestamps are in ISO 8601 format
- JWT tokens expire after 15 minutes by default
- Database is created automatically on first run
