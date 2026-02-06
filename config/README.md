# ⚙️ Configuration Files

System configuration files for various environments.

## 📋 Files

### **crontab.example**
Example crontab configuration for automated tasks.

```bash
# Copy to user crontab
crontab -e
# Then paste contents from this file
```

### **production.crontab**
Production crontab configuration.

**Active Jobs:**
- Winner verification (Weekly, Sunday 00:00)
- Missing winners detection (Weekly, Monday 02:00)
- Health checks (Daily, 03:00)
- Quick validation (Daily, 04:00)
- League validation (Monthly)
- PM2 save (Daily, 05:00)
- Log cleanup (Monthly)

**Install:**
```bash
crontab config/production.crontab
```

**Verify:**
```bash
crontab -l
```

## 🔐 Environment Variables

Main environment configuration is in `.env` file (root directory).

**Key Variables:**
- `FOOTBALL_API_KEY` - API-Sports.io key
- `PORT` - Server port (default: 3000)
- `BACKEND_URL` - Backend API URL
- `JWT_SECRET_KEY` - JWT authentication secret

## 🌍 Environment Files

- **`.env`** - Local development (NOT in git)
- **`.env.example`** - Template for .env file
- **Production** - Set via server environment or PM2 config

## 📝 Notes

- Never commit `.env` files with actual secrets
- Keep `production.crontab` updated with docs
- Test cron jobs before deploying to production
- Use absolute paths in crontab entries
- Redirect cron output to log files

## 🔄 Updating Configuration

1. **Development:**
   - Edit `.env` locally
   - Test changes

2. **Production:**
   - SSH to server
   - Edit production `.env`
   - Restart services: `pm2 restart all`
   - Update crontab if needed

---

**Last Updated**: February 7, 2026
