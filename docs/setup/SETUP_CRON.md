# ⚡ Quick Setup Guide - Cron Jobs

## 🚀 **5-Minute Setup:**

### **Step 1: Create Log Directory**
```bash
mkdir -p ~/logs/sport_calendar
```

### **Step 2: Test Scripts Manually**
```bash
cd ~/dev/gitHubTamir/sport_calender

# Test quick check
node src/scripts/quick_check.js

# Test health check (server must be running)
node src/scripts/health_check.js

# Test winner detection
node src/scripts/verify_global_winners.js
```

### **Step 3: Find Your Node Path**
```bash
which node
# Example output: /usr/local/bin/node
```

### **Step 4: Edit Crontab**
```bash
crontab -e
```

### **Step 5: Paste This** (adjust paths if needed):
```bash
# Sport Calendar - Automated Maintenance
PATH=/usr/local/bin:/usr/bin:/bin
SHELL=/bin/bash

# Weekly winner detection (Sunday midnight)
0 0 * * 0 cd ~/dev/gitHubTamir/sport_calender && node src/scripts/verify_global_winners.js >> ~/logs/sport_calendar/winners.log 2>&1

# Daily quick check (3 AM)
0 3 * * * cd ~/dev/gitHubTamir/sport_calender && node src/scripts/quick_check.js >> ~/logs/sport_calendar/daily.log 2>&1

# Log rotation
0 0 1 * * find ~/logs/sport_calendar -name "*.log" -mtime +30 -delete
```

### **Step 6: Save and Exit**
- **Vim:** Press `Esc`, type `:wq`, press `Enter`
- **Nano:** Press `Ctrl+X`, then `Y`, then `Enter`

### **Step 7: Verify**
```bash
crontab -l
```

---

## 📊 **Check if It's Working:**

```bash
# Wait for first run, then check logs:
ls -lh ~/logs/sport_calendar/
tail -f ~/logs/sport_calendar/*.log
```

---

## 🎯 **For Production Server:**

```bash
# 1. SSH to server
ssh sport-calendar-prod

# 2. Create log directory
sudo mkdir -p /var/log/sport_calendar
sudo chown tamir:tamir /var/log/sport_calendar

# 3. Make scripts executable
chmod +x /var/www/sport_calendar/src/scripts/*.sh

# 4. Edit crontab
crontab -e

# 5. Paste production jobs (see crontab.example)

# 6. Test
node /var/www/sport_calendar/src/scripts/quick_check.js
```

---

## ⚠️ **Common Issues:**

### Cron not running?
```bash
# Check cron service (Mac)
sudo launchctl list | grep cron

# Check logs (Mac)
log show --predicate 'process == "cron"' --last 1h
```

### Wrong node path?
```bash
# Find correct path
which node

# Update in crontab
PATH=/usr/local/bin:/usr/bin:/bin
```

### Permissions?
```bash
# Make logs writable
chmod 755 ~/logs/sport_calendar
```

---

## ✅ **Done!**

Your cron jobs will now run automatically:
- 🟢 **Weekly**: Detect new winners
- 🟡 **Daily**: Health check
- 🔵 **Monthly**: Full validation

Check logs: `tail -f ~/logs/sport_calendar/*.log`
