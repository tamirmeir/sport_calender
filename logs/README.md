# 📝 Logs Directory

Application log files (local development).

## 📋 Files

### **log.txt**
Main application log file.

### **log.new.txt**
Newer log entries.

### **backend_log.txt**
Python/Flask backend logs.

### **backend_log.new.txt**
Recent backend logs.

## ⚠️ Important Notes

**This directory is for local development only.**

Production logs are stored in:
- **Production:** `~/logs/sport_calendar/` on the server
- **PM2 logs:** `~/.pm2/logs/`

## 📊 Production Logs Location

```bash
# On production server
~/logs/sport_calendar/
├── winners.log          # Winner verification
├── missing.log          # Missing winners detection
├── health.log           # Health checks
├── daily.log            # Daily validation
├── validation.log       # Monthly validation
├── commits.log          # Auto-commit log
└── pm2.log             # PM2 operations
```

## 🔍 Viewing Logs

**Local:**
```bash
tail -f logs/log.txt
tail -f logs/backend_log.txt
```

**Production:**
```bash
ssh tamir@matchdaybytm.com
tail -f ~/logs/sport_calendar/winners.log
tail -f ~/.pm2/logs/matchday-frontend-out.log
tail -f ~/.pm2/logs/matchday-frontend-error.log
```

## 🧹 Log Cleanup

**Local:**
```bash
# Clear old logs
> logs/log.txt
> logs/backend_log.txt
```

**Production:**
Automatic cleanup via crontab (monthly, files >30 days old):
```bash
0 6 1 * * find ~/logs/sport_calendar -name "*.log" -mtime +30 -delete
```

## 🚫 Git Ignore

Log files are automatically ignored via `.gitignore`:
```
*.log
*.txt
logs/
```

---

**Last Updated**: February 7, 2026
