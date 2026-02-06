# 🏗️ Architecture Quick Reference

## Request Flow

```
Browser → https://matchdaybytm.com
    ↓
Nginx (443) - SSL + Routing
    ↓
    ├─ /api/fixtures/*    → Node.js:3000 → API-Sports
    ├─ /api/auth/*        → Python:8000  → SQLite
    ├─ /api/favorites/*   → Python:8000  → SQLite
    ├─ /calendar/*        → Python:8000  → ICS Generator
    ├─ /sync/*            → Python:8000  → Sync Service
    └─ /* (static files)  → Node.js:3000 → public/
```

## Services

| Service | Port | Manager | Config File | Purpose |
|---------|------|---------|-------------|---------|
| Node.js | 3000 | PM2 | `src/index.js` | Frontend + Football API |
| Python | 8000 | Systemd | `backend/app.py` | User Auth + Favorites |
| Nginx | 80/443 | Systemd | `/etc/nginx/sites-available/sport_calendar` | Reverse Proxy + SSL |

## Node.js Endpoints (Port 3000)

```javascript
GET /api/fixtures/countries              // All countries
GET /api/fixtures/leagues?country=...    // Leagues by country
GET /api/fixtures/teams?league=...       // Teams in league
GET /api/fixtures/tournament/:id         // Tournament details
GET /api/fixtures/tournaments/status/all // All tournament statuses
GET /api/fixtures/league-next/:id        // Next fixture for league
```

## Python Endpoints (Port 8000)

```python
POST /api/auth/register                  // User registration
POST /api/auth/login                     // User login
GET  /api/favorites                      // Get user favorites
POST /api/favorites                      // Add favorite
GET  /calendar/user/:email               // User calendar (ICS)
POST /sync                               // Sync calendar
```

## Key Commands

### Check Status
```bash
pm2 status                              # Node.js status
sudo systemctl status sport-backend     # Python status
sudo systemctl status nginx             # Nginx status
```

### View Logs
```bash
pm2 logs matchday-frontend              # Node.js logs
sudo journalctl -u sport-backend        # Python logs
sudo tail -f /var/log/nginx/access.log  # Nginx access
sudo tail -f /var/log/nginx/error.log   # Nginx errors
```

### Restart Services
```bash
pm2 restart matchday-frontend           # Node.js
sudo systemctl restart sport-backend    # Python
sudo systemctl reload nginx             # Nginx (no downtime)
```

### Deploy New Code
```bash
cd /var/www/sport_calendar
git pull origin main
npm install
pm2 restart matchday-frontend
```

## File Locations

### Production Server
```
/var/www/sport_calendar/              # Project root
├── src/                              # Node.js source
│   ├── index.js                      # Express server
│   └── routes/fixtures.js            # Football API routes
├── backend/                          # Python source
│   ├── app.py                        # Flask app
│   └── routes/                       # Auth & favorites
├── public/                           # Static files
│   └── js/app_v2.js                  # Frontend JS
└── .env                              # Node.js env vars

/etc/nginx/sites-available/
└── sport_calendar                    # Nginx config

~/.pm2/logs/
└── matchday-frontend-*.log           # PM2 logs
```

### Local Development
```
/Users/tamirmei/dev/gitHubTamir/sport_calender/
├── .env                              # Local Node.js vars
└── backend/.env                      # Local Python vars
```

## Environment Variables

### Node.js (.env)
```
FOOTBALL_API_KEY=xxx
API_BASE_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
PORT=3000
NODE_ENV=production
```

### Python (backend/.env)
```
MAIL_SERVER=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=xxx
MAIL_PASSWORD=xxx
JWT_SECRET_KEY=xxx
```

## Common Issues

### Issue: 404 on /api/fixtures
**Cause:** Nginx routing to wrong backend  
**Fix:** Ensure `/api/fixtures` location block comes BEFORE `/api` in Nginx config

### Issue: "No matches" on production
**Cause:** Browser cache or Service Worker  
**Fix:** Open in Incognito mode or clear cache

### Issue: EADDRINUSE on port 3000
**Cause:** Multiple PM2 processes or orphaned node process  
**Fix:** `pm2 delete all && pm2 start src/index.js --name matchday-frontend`

### Issue: Changes not reflected
**Cause:** PM2 didn't restart or old code cached  
**Fix:** `git pull && pm2 restart matchday-frontend` + Incognito window

---

**Last Updated:** February 6, 2026
