# 🚀 SSH Production Server Guide

## Quick Access

```bash
# Connect to production server
ssh sport-calendar-prod

# Or with IP directly
ssh root@YOUR_SERVER_IP -i ~/.ssh/sport_calendar_key
```

---

## Common Production Tasks

### 📊 Check Application Status

```bash
# Check frontend (Node.js)
pm2 status
pm2 logs sport-frontend --lines 50

# Check backend (Python)
sudo systemctl status sport-backend
sudo journalctl -u sport-backend -n 50 --no-pager
```

### 🔄 Restart Services

```bash
# Restart frontend
pm2 restart sport-frontend

# Restart backend
sudo systemctl restart sport-backend

# Restart Nginx
sudo systemctl restart nginx
```

### 📥 Manual Deployment

```bash
cd ~/sport_calender

# Pull latest code
git pull origin main

# Update dependencies
npm install
cd backend && source venv/bin/activate && pip install -r requirements.txt

# Restart services
pm2 restart all
sudo systemctl restart sport-backend
```

### 🗄️ Database Operations

```bash
cd ~/sport_calender/backend

# Backup database
cp instance/sport_calendar.db instance/sport_calendar_backup_$(date +%Y%m%d).db

# Check database size
du -h instance/sport_calendar.db

# Open database (SQLite)
sqlite3 instance/sport_calendar.db
# Inside sqlite:
.tables
.schema users
SELECT COUNT(*) FROM users;
.exit
```

### 📝 View Logs

```bash
cd ~/sport_calender

# Backend logs
tail -f backend_log.txt

# Node.js logs
pm2 logs

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs for backend service
sudo journalctl -u sport-backend -f
```

### 🔍 Check Environment Variables

```bash
cd ~/sport_calender

# Check .env file exists
ls -la .env backend/.env

# View (but hide sensitive values)
grep -v 'PASSWORD\|SECRET\|KEY' .env
```

### 🧹 Cleanup

```bash
# Clear PM2 logs
pm2 flush

# Clear old log files
cd ~/sport_calender
rm -f *.log.old validation_run_*.log

# Clear cache
rm -rf backend/instance/cache/*
```

### 🔒 Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services after kernel updates
sudo reboot
```

### 📈 Monitor Resources

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU and processes
htop
# (Press q to quit)

# Check active connections
sudo netstat -tlnp | grep -E ':(3000|8000|80)'
```

### 🔐 SSH Key Management

```bash
# View authorized keys
cat ~/.ssh/authorized_keys

# Add a new SSH key
echo "ssh-ed25519 AAAAC3Nz..." >> ~/.ssh/authorized_keys

# Remove old keys (edit file)
nano ~/.ssh/authorized_keys
```

---

## 🆘 Emergency Procedures

### App Not Responding

```bash
# 1. Check if services are running
pm2 status
sudo systemctl status sport-backend

# 2. Check ports
sudo netstat -tlnp | grep -E ':(3000|8000)'

# 3. Kill stuck processes
bash kill_ports.sh

# 4. Restart everything
pm2 restart all
sudo systemctl restart sport-backend
sudo systemctl restart nginx
```

### Out of Disk Space

```bash
# 1. Check space
df -h

# 2. Find large files
du -h --max-depth=1 /var | sort -hr | head -10

# 3. Clear logs
sudo journalctl --vacuum-time=7d
pm2 flush

# 4. Clear old backups
cd ~/sport_calender/backend/instance
rm -f sport_calendar_backup_*.db
```

### Database Corrupted

```bash
cd ~/sport_calender/backend/instance

# 1. Backup current database
cp sport_calendar.db sport_calendar_corrupted.db

# 2. Try to repair
sqlite3 sport_calendar.db "PRAGMA integrity_check;"

# 3. If repair fails, restore from backup
ls -lh sport_calendar_backup_*.db
cp sport_calendar_backup_YYYYMMDD.db sport_calendar.db

# 4. Restart backend
sudo systemctl restart sport-backend
```

---

## 📋 Pre-Deployment Checklist

Before deploying major changes:

- [ ] Backup database: `cp instance/sport_calendar.db instance/backup_$(date +%Y%m%d).db`
- [ ] Test locally with production data
- [ ] Check GitHub Actions workflow passes
- [ ] Verify `.env` variables are correct
- [ ] Have rollback plan ready

---

## 🔗 Useful Aliases

Add these to your **local** `~/.bashrc` or `~/.zshrc`:

```bash
# SSH to production
alias prod="ssh sport-calendar-prod"

# Quick deploy
alias deploy="git push origin main"

# View production logs
alias prod-logs="ssh sport-calendar-prod 'pm2 logs --lines 50'"

# Check production status
alias prod-status="ssh sport-calendar-prod 'pm2 status && sudo systemctl status sport-backend'"
```

Reload with: `source ~/.bashrc` or `source ~/.zshrc`

---

## 📞 Support

If you encounter issues:

1. Check logs first (see "View Logs" section above)
2. Try restarting services
3. Check GitHub Actions build logs
4. Review recent commits for breaking changes
