# Match Calendar Backend (Python/Flask)

## Overview
Backend service handling authentication, subscriptions, and calendar sync for the Match Calendar app.

## Features
- JWT-based authentication (register, login, password reset)
- Team subscriptions with match filters
- Calendar export (ICS) with auto-sync support
- SQLite database for persistence

## Quick Start
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python app.py  # Port 8000
```

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create account |
| POST | `/login` | Login (username or email) |
| POST | `/logout` | Logout (clears token) |
| POST | `/reset-request` | Request password reset email |
| POST | `/reset-password` | Set new password with token |
| GET | `/me` | Get current user info |

### Subscriptions (`/api/favorites`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user's subscriptions |
| POST | `/` | Add/update subscription (upsert) |
| DELETE | `/<team_id>` | Remove subscription |
| POST | `/sync` | Refresh fixtures for all subscriptions |
| GET | `/matches` | Get filtered matches for subscribed teams |

**Subscription Filters:**
```json
// All matches
{ "filters": null }

// League only
{ "filters": { "type": "League" } }

// Cup only  
{ "filters": { "type": "Cup" } }

// League + Cup
{ "filters": { "type": ["League", "Cup"] } }
```

### Calendar (`/calendar`, `/sync`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/calendar/add` | Save fixtures to calendar |
| GET | `/calendar/events` | List saved events |
| DELETE | `/calendar/events/<id>` | Remove saved event |
| GET | `/sync/MatchDayByTM/<username>.ics` | Auto-sync ICS feed |

## Database Schema

```sql
-- Users
users(id, username, email, password_hash, has_seen_sync_promo, created_at)

-- Subscriptions
favorite_teams(id, user_id, team_id, team_name, team_logo, filters, added_at)

-- Saved Calendar Events
saved_fixtures(id, user_id, fixture_id, fixture_data, added_at)

-- Login History
login_logs(id, user_id, login_time, ip_address, user_agent)
```

## Environment Variables
```
FOOTBALL_API_KEY=your_key
JWT_SECRET_KEY=your_secret
DATABASE_URL=sqlite:///instance/sport_calendar.db
MAIL_SERVER=smtp.example.com
MAIL_USERNAME=...
MAIL_PASSWORD=...
```

## Demo Mode
Set `FOOTBALL_API_KEY=demo_key_12345` for mock data without API calls.

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
