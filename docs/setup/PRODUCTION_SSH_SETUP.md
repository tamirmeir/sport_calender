# 🎯 Production SSH - Quick Reference

## ✅ Setup Complete!

Your SSH access is fully configured and working.

---

## 🔐 Connection Details

| Item | Value |
|------|-------|
| **Server IP** | `165.227.5.88` |
| **Username** | `tamir` |
| **SSH Alias** | `sport-calendar-prod` |
| **SSH Key** | `~/.ssh/id_rsa` |
| **Project Path** | `/var/www/sport_calendar` |

---

## 🚀 Quick Commands

### Connect to Server
```bash
ssh sport-calendar-prod
```

### Check App Status
```bash
ssh sport-calendar-prod "pm2 status"
```

### View Logs
```bash
# Frontend logs
ssh sport-calendar-prod "pm2 logs matchday-frontend --lines 50"

# All logs with tail
ssh sport-calendar-prod "pm2 logs --lines 100"
```

### Restart Application
```bash
ssh sport-calendar-prod "pm2 restart matchday-frontend"
```

### Check Backend Service
```bash
ssh sport-calendar-prod "systemctl status sport-backend"
```

### Pull Latest Code Manually
```bash
ssh sport-calendar-prod "cd /var/www/sport_calendar && git pull origin main && pm2 restart matchday-frontend"
```

---

## 🎬 GitHub Actions Setup

### Add These 4 Secrets

Go to: **https://github.com/tamirmeir/sport_calender/settings/secrets/actions**

Click **"New repository secret"** for each:

#### 1. DO_HOST
```
165.227.5.88
```

#### 2. DO_USERNAME
```
tamir
```

#### 3. DO_SSH_KEY
Get with this command:
```bash
cat ~/.ssh/id_rsa
```
**Copy EVERYTHING** including `-----BEGIN` and `-----END` lines.

#### 4. FOOTBALL_API_KEY
Get from your local `.env` file:
```bash
grep FOOTBALL_API_KEY .env
```

---

## 🧪 Test GitHub Deployment

After adding secrets, test the deployment:

```bash
# Make a small change
git commit --allow-empty -m "test: verify GitHub Actions deployment"
git push origin main

# Watch deployment
# https://github.com/tamirmeir/sport_calender/actions
```

---

## 📊 Current Production Status

**Frontend:**
- ✅ Running with PM2 as `matchday-frontend`
- 🕐 Uptime: 9+ days
- 📍 Location: `/var/www/sport_calendar/src/index.js`

**Backend:**
- Service: `sport-backend`
- Check: `systemctl status sport-backend`

---

## 🛠️ Common Tasks

### View Production Environment
```bash
ssh sport-calendar-prod "cd /var/www/sport_calendar && cat .env"
```

### Check Disk Space
```bash
ssh sport-calendar-prod "df -h"
```

### Check Memory Usage
```bash
ssh sport-calendar-prod "free -h"
```

### View Git Status
```bash
ssh sport-calendar-prod "cd /var/www/sport_calendar && git status"
```

### Check Recent Commits
```bash
ssh sport-calendar-prod "cd /var/www/sport_calendar && git log --oneline -5"
```

### Backup Database
```bash
ssh sport-calendar-prod "cd /var/www/sport_calendar/backend && cp instance/sport_calendar.db instance/backup_$(date +%Y%m%d).db"
```

---

## 🆘 Troubleshooting

### App Not Responding
```bash
ssh sport-calendar-prod "pm2 restart matchday-frontend"
```

### View Error Logs
```bash
ssh sport-calendar-prod "pm2 logs matchday-frontend --err --lines 100"
```

### Full Restart
```bash
ssh sport-calendar-prod "cd /var/www/sport_calendar && pm2 restart matchday-frontend && systemctl restart sport-backend"
```

### Check Port Usage
```bash
ssh sport-calendar-prod "netstat -tlnp | grep -E ':(3000|8000|80)'"
```

---

## 📝 Useful Aliases

Add these to your local `~/.bashrc` or `~/.zshrc`:

```bash
# Quick aliases
alias prod="ssh sport-calendar-prod"
alias prod-logs="ssh sport-calendar-prod 'pm2 logs --lines 50'"
alias prod-status="ssh sport-calendar-prod 'pm2 status'"
alias prod-restart="ssh sport-calendar-prod 'pm2 restart matchday-frontend'"
```

Reload: `source ~/.bashrc` or `source ~/.zshrc`

---

## 🔒 Security Notes

- ✅ SSH key authentication enabled
- ✅ Private key secured locally
- ⚠️ Never commit private keys to Git
- ⚠️ Keep GitHub secrets secure
- ✅ Connection uses keepalive (60s interval)

---

## 📚 Full Documentation

- **SSH Commands**: `SSH_PRODUCTION_GUIDE.md`
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **Architecture**: `docs/ARCHITECTURE.md`

---

## ✅ Next Steps

1. [ ] Add 4 secrets to GitHub Actions
2. [ ] Test deployment with `git push`
3. [ ] Monitor deployment at GitHub Actions page
4. [ ] Verify app works after deployment

---

## 📞 Quick Help

If something goes wrong:
1. Check logs: `ssh sport-calendar-prod "pm2 logs"`
2. Check GitHub Actions: https://github.com/tamirmeir/sport_calender/actions
3. Restart app: `ssh sport-calendar-prod "pm2 restart matchday-frontend"`
4. SSH in and investigate: `ssh sport-calendar-prod`
