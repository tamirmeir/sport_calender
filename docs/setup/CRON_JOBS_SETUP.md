# ⏰ Cron Jobs Setup - Automated Maintenance

## 🎯 **מטרה:**
הרצת scripts אוטומטית בצורה קבועה כדי:
1. לזהות זוכי טורנירים חדשים
2. לאמת תקינות הנתונים
3. לעדכן את הקבצים המקומיים
4. לשמור logs לצורך debugging

---

## 📋 **Recommended Cron Jobs:**

### 1️⃣ **Weekly Winner Detection** (שבועי - זיהוי זוכים)
**מה זה עושה:** מזהה אוטומטית זוכי טורנירים שהסתיימו

**תדירות:** כל יום ראשון בחצות (אחרי סוף השבוע - הרבה גמרים!)

```bash
# Every Sunday at 00:00
0 0 * * 0 cd /var/www/sport_calendar && /usr/bin/node src/scripts/verify_global_winners.js >> /var/log/sport_calendar/winners.log 2>&1
```

### 2️⃣ **Monthly Validation** (חודשי - בדיקת תקינות)
**מה זה עושה:** בודק שכל הליגות והמיפויים תקינים

**תדירות:** ה-1 בכל חודש בלילה

```bash
# First day of every month at 02:00
0 2 1 * * cd /var/www/sport_calendar && /usr/bin/node src/scripts/validate_leagues_batch.js >> /var/log/sport_calendar/validation.log 2>&1
```

### 3️⃣ **Daily Quick Check** (יומי - בדיקה מהירה)
**מה זה עושה:** בדיקה מהירה של טורנירים פעילים

**תדירות:** כל יום ב-3 בלילה

```bash
# Every day at 03:00
0 3 * * * cd /var/www/sport_calendar && /usr/bin/node src/scripts/quick_check.js >> /var/log/sport_calendar/daily.log 2>&1
```

### 4️⃣ **After Big Events** (אחרי אירועים גדולים)
**מה זה עושה:** אימות מיידי אחרי גמר חשוב

**תדירות:** ידני או מופעל דרך webhook

```bash
# Manual trigger or webhook
/usr/bin/node src/scripts/verify_global_winners.js --league=385 --force
```

---

## 🛠️ **Setup Instructions:**

### **Development (Local Mac):**

#### 1. יצירת תיקיית Logs:
```bash
mkdir -p ~/logs/sport_calendar
```

#### 2. עריכת Crontab:
```bash
crontab -e
```

#### 3. הוסף את ה-Cron Jobs:
```bash
# Sport Calendar - Automated Maintenance
# ======================================

# Weekly winner detection (Sunday at midnight)
0 0 * * 0 cd ~/dev/gitHubTamir/sport_calender && /usr/local/bin/node src/scripts/verify_global_winners.js >> ~/logs/sport_calendar/winners.log 2>&1

# Monthly validation (1st of month at 2 AM)
0 2 1 * * cd ~/dev/gitHubTamir/sport_calender && /usr/local/bin/node src/scripts/validate_leagues_batch.js >> ~/logs/sport_calendar/validation.log 2>&1

# Daily quick check (3 AM)
0 3 * * * cd ~/dev/gitHubTamir/sport_calender && /usr/local/bin/node src/scripts/quick_check.js >> ~/logs/sport_calendar/daily.log 2>&1

# Log rotation (monthly cleanup)
0 0 1 * * find ~/logs/sport_calendar -name "*.log" -mtime +30 -delete
```

#### 4. שמור ויציאה:
- Vim: `:wq`
- Nano: `Ctrl+X` → `Y` → `Enter`

#### 5. אימות:
```bash
crontab -l
```

---

### **Production (DigitalOcean Server):**

#### 1. SSH לשרת:
```bash
ssh sport-calendar-prod
```

#### 2. יצירת תיקיית Logs:
```bash
sudo mkdir -p /var/log/sport_calendar
sudo chown tamir:tamir /var/log/sport_calendar
```

#### 3. עריכת Crontab:
```bash
crontab -e
```

#### 4. הוסף את ה-Production Cron Jobs:
```bash
# Sport Calendar Production - Automated Maintenance
# ==================================================

# Environment
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
SHELL=/bin/bash
FOOTBALL_API_KEY=YOUR_API_KEY_HERE

# Weekly winner detection + Auto Deploy (Sunday 00:00 UTC)
0 0 * * 0 cd /var/www/sport_calendar && /usr/bin/node src/scripts/verify_global_winners.js >> /var/log/sport_calendar/winners.log 2>&1 && pm2 restart matchday-frontend

# Monthly validation (1st of month at 02:00 UTC)
0 2 1 * * cd /var/www/sport_calendar && /usr/bin/node src/scripts/validate_leagues_batch.js >> /var/log/sport_calendar/validation.log 2>&1

# Daily health check (03:00 UTC)
0 3 * * * cd /var/www/sport_calendar && /usr/bin/node src/scripts/health_check.js >> /var/log/sport_calendar/health.log 2>&1

# Auto-commit updates (if winners detected)
0 1 * * 1 cd /var/www/sport_calendar && /usr/bin/bash src/scripts/auto_commit_winners.sh >> /var/log/sport_calendar/commits.log 2>&1

# Log rotation (monthly - keep last 30 days)
0 0 1 * * find /var/log/sport_calendar -name "*.log" -mtime +30 -delete

# PM2 save (daily backup of process list)
0 4 * * * pm2 save >> /var/log/sport_calendar/pm2.log 2>&1
```

---

## 📝 **Create Missing Scripts:**

### 1️⃣ **Quick Check Script** (`src/scripts/quick_check.js`)

```javascript
const fs = require('fs');
const path = require('path');

console.log(`[${new Date().toISOString()}] Quick Check Started`);

// Check if required files exist
const requiredFiles = [
    'src/data/finished_tournaments.json',
    'src/data/world_tournaments_master.json',
    'src/data/country_mappings.json'
];

let allOk = true;
requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '../..', file);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Missing file: ${file}`);
        allOk = false;
    } else {
        const size = fs.statSync(filePath).size;
        console.log(`✅ ${file} (${size} bytes)`);
    }
});

// Check if Node.js server is running (production)
if (process.env.NODE_ENV === 'production') {
    const { execSync } = require('child_process');
    try {
        const pm2Status = execSync('pm2 jlist').toString();
        const processes = JSON.parse(pm2Status);
        const frontend = processes.find(p => p.name === 'matchday-frontend');
        
        if (frontend && frontend.pm2_env.status === 'online') {
            console.log('✅ Node.js server: online');
        } else {
            console.error('❌ Node.js server: offline or not found');
            allOk = false;
        }
    } catch (error) {
        console.error('❌ PM2 check failed:', error.message);
        allOk = false;
    }
}

console.log(`[${new Date().toISOString()}] Quick Check ${allOk ? 'PASSED ✅' : 'FAILED ❌'}`);
process.exit(allOk ? 0 : 1);
```

### 2️⃣ **Health Check Script** (`src/scripts/health_check.js`)

```javascript
const axios = require('axios');

const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'http://localhost:3000' 
    : 'http://localhost:3000';

console.log(`[${new Date().toISOString()}] Health Check Started`);

async function checkEndpoint(url, name) {
    try {
        const response = await axios.get(url, { timeout: 5000 });
        console.log(`✅ ${name}: ${response.status}`);
        return true;
    } catch (error) {
        console.error(`❌ ${name}: ${error.message}`);
        return false;
    }
}

async function runHealthCheck() {
    const endpoints = [
        { url: `${BASE_URL}/api/fixtures/countries`, name: 'Countries API' },
        { url: `${BASE_URL}/api/fixtures/tournaments/status/all`, name: 'Tournaments API' },
        { url: `${BASE_URL}/`, name: 'Frontend' }
    ];

    const results = await Promise.all(
        endpoints.map(ep => checkEndpoint(ep.url, ep.name))
    );

    const allHealthy = results.every(r => r === true);
    console.log(`[${new Date().toISOString()}] Health Check ${allHealthy ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    // If unhealthy, try to restart (production only)
    if (!allHealthy && process.env.NODE_ENV === 'production') {
        console.log('Attempting to restart services...');
        const { execSync } = require('child_process');
        try {
            execSync('pm2 restart matchday-frontend');
            console.log('✅ Services restarted');
        } catch (error) {
            console.error('❌ Restart failed:', error.message);
        }
    }

    process.exit(allHealthy ? 0 : 1);
}

runHealthCheck();
```

### 3️⃣ **Auto Commit Winners Script** (`src/scripts/auto_commit_winners.sh`)

```bash
#!/bin/bash

cd /var/www/sport_calendar

# Check if there are changes in data files
if git diff --quiet src/data/finished_tournaments.json src/data/world_tournaments_master.json; then
    echo "[$(date)] No changes detected"
    exit 0
fi

echo "[$(date)] Changes detected - committing..."

# Commit changes
git add src/data/finished_tournaments.json
git add src/data/world_tournaments_master.json

git commit -m "Auto-update: Tournament winners detected on $(date +%Y-%m-%d)

- Updated by verify_global_winners.js cron job
- Detected new tournament winners
- Auto-committed by cron"

# Optional: Push to GitHub (if you want auto-push)
# git push origin main

echo "[$(date)] Changes committed successfully"
```

---

## 🎓 **Cron Schedule Explained:**

```
* * * * *  Command to execute
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 and 7 are Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### **Examples:**

| Cron Expression | Meaning |
|----------------|---------|
| `0 0 * * 0` | Every Sunday at midnight |
| `0 2 1 * *` | 1st of every month at 2 AM |
| `0 3 * * *` | Every day at 3 AM |
| `*/30 * * * *` | Every 30 minutes |
| `0 0 * * 1-5` | Weekdays at midnight |
| `0 0 1,15 * *` | 1st and 15th of month |

---

## 📊 **Monitoring Logs:**

### **View Logs:**

```bash
# Development (Mac)
tail -f ~/logs/sport_calendar/winners.log
tail -f ~/logs/sport_calendar/validation.log
tail -f ~/logs/sport_calendar/daily.log

# Production (Server)
tail -f /var/log/sport_calendar/winners.log
tail -f /var/log/sport_calendar/validation.log
tail -f /var/log/sport_calendar/health.log
```

### **Check Last Run:**

```bash
# Development
ls -lht ~/logs/sport_calendar/*.log | head -5

# Production
ls -lht /var/log/sport_calendar/*.log | head -5
```

### **Search for Errors:**

```bash
# Development
grep -i "error\|failed" ~/logs/sport_calendar/*.log

# Production
grep -i "error\|failed" /var/log/sport_calendar/*.log
```

---

## 🔔 **Email Notifications (Optional):**

### **Install mailutils:**
```bash
sudo apt-get install mailutils
```

### **Add to Cron:**
```bash
# Send email on failure
MAILTO=your-email@example.com

# Winner detection with email on error
0 0 * * 0 cd /var/www/sport_calendar && /usr/bin/node src/scripts/verify_global_winners.js >> /var/log/sport_calendar/winners.log 2>&1 || echo "Winner detection failed!" | mail -s "Sport Calendar Alert" your-email@example.com
```

---

## ⚡ **Quick Commands:**

### **List Cron Jobs:**
```bash
crontab -l
```

### **Edit Cron Jobs:**
```bash
crontab -e
```

### **Remove All Cron Jobs:**
```bash
crontab -r
```

### **Test a Cron Job Manually:**
```bash
# Run as if cron ran it
cd /var/www/sport_calendar && /usr/bin/node src/scripts/verify_global_winners.js
```

---

## 🎯 **Recommended Setup:**

### **For Development (Your Mac):**
```bash
# Minimal - just weekly winner check
0 0 * * 0 cd ~/dev/gitHubTamir/sport_calender && node src/scripts/verify_global_winners.js >> ~/logs/sport_calendar/winners.log 2>&1
```

### **For Production (Server):**
```bash
# Full automation
# 1. Weekly winner detection
0 0 * * 0 cd /var/www/sport_calendar && node src/scripts/verify_global_winners.js >> /var/log/sport_calendar/winners.log 2>&1

# 2. Daily health check
0 3 * * * cd /var/www/sport_calendar && node src/scripts/health_check.js >> /var/log/sport_calendar/health.log 2>&1

# 3. Monthly validation
0 2 1 * * cd /var/www/sport_calendar && node src/scripts/validate_leagues_batch.js >> /var/log/sport_calendar/validation.log 2>&1
```

---

## 🚨 **Important Notes:**

### 1️⃣ **Use Absolute Paths:**
```bash
# ❌ Bad (relative path)
node src/scripts/verify_global_winners.js

# ✅ Good (absolute path)
/usr/bin/node /var/www/sport_calendar/src/scripts/verify_global_winners.js
```

### 2️⃣ **Set Environment Variables:**
```bash
# Add at top of crontab
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
FOOTBALL_API_KEY=your_api_key_here
NODE_ENV=production
```

### 3️⃣ **Redirect Output:**
```bash
# Both stdout and stderr to log
>> /var/log/file.log 2>&1

# Only errors to log
2>> /var/log/error.log

# Discard all output
> /dev/null 2>&1
```

### 4️⃣ **Log Rotation:**
Always add log rotation to prevent disk fill:
```bash
# Keep only last 30 days
0 0 1 * * find /var/log/sport_calendar -name "*.log" -mtime +30 -delete
```

---

## 📝 **Installation Checklist:**

### Development:
- [ ] Create log directory: `mkdir -p ~/logs/sport_calendar`
- [ ] Create quick_check.js script
- [ ] Add to crontab: `crontab -e`
- [ ] Test manually: run each script once
- [ ] Verify logs: `ls -l ~/logs/sport_calendar/`

### Production:
- [ ] SSH to server
- [ ] Create log directory: `sudo mkdir -p /var/log/sport_calendar`
- [ ] Set permissions: `sudo chown tamir:tamir /var/log/sport_calendar`
- [ ] Create all scripts (quick_check, health_check, auto_commit)
- [ ] Make scripts executable: `chmod +x src/scripts/*.sh`
- [ ] Add to crontab with full paths
- [ ] Test each script manually
- [ ] Wait for first cron run
- [ ] Check logs for success

---

## 🎓 **Summary:**

### **What to Run:**

| Script | When | Purpose |
|--------|------|---------|
| `verify_global_winners.js` | Weekly (Sunday) | Detect new winners |
| `validate_leagues_batch.js` | Monthly (1st) | Full validation |
| `quick_check.js` | Daily | Quick health check |
| `health_check.js` | Daily | API health check |

### **Where to Check:**

| Log File | Content |
|----------|---------|
| `winners.log` | Winner detection results |
| `validation.log` | Monthly validation |
| `daily.log` | Daily quick checks |
| `health.log` | API health status |

---

**Ready to automate!** 🚀

```bash
# Quick start:
crontab -e
# Add the recommended jobs
# Save and exit
# Check logs tomorrow!
```
