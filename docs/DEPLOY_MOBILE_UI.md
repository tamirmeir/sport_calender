# 🚀 Deploy Mobile UI to Production

## Quick Deploy (2 minutes)

### **אם השרת כבר רץ:**

```bash
# SSH to your droplet
ssh root@YOUR_DROPLET_IP

# Navigate to project
cd /var/www/sport_calendar

# Pull latest changes
git pull origin main

# Restart PM2 (frontend)
pm2 restart sport-frontend

# Check status
pm2 status
pm2 logs sport-frontend --lines 20
```

**זהו! האתר עודכן ✅**

---

## Full Deploy (First Time or Issues)

### **1. Connect to Server**

```bash
ssh root@YOUR_DROPLET_IP
```

### **2. Update Code**

```bash
cd /var/www/sport_calendar
git pull origin main
```

### **3. Install Dependencies (if needed)**

```bash
# Node packages
npm install

# Python packages (if backend changed)
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### **4. Restart Services**

```bash
# Restart Frontend (Node.js)
pm2 restart sport-frontend

# Restart Backend (Python) - only if needed
sudo systemctl restart sport-backend

# Check status
pm2 status
sudo systemctl status sport-backend
```

### **5. Verify**

```bash
# Check logs
pm2 logs sport-frontend --lines 30

# Test endpoints
curl http://localhost:3000
curl http://localhost:3000/css_v2/modern-design-system.css | head -20
curl http://localhost:3000/js/theme-manager.js | head -20
```

### **6. Access from Browser**

```
http://YOUR_DROPLET_IP
```

**אמור לראות:**
- ✅ כפתור ☀️/🌙 בפינה ימין למעלה
- ✅ Bottom Nav (על מובייל)
- ✅ Glassmorphism על הכרטיסים
- ✅ Dark Mode אוטומטי אחרי 20:00

---

## Troubleshooting

### **Problem: Server not starting**

```bash
# Check PM2 errors
pm2 logs sport-frontend --err --lines 50

# Restart from scratch
pm2 delete sport-frontend
pm2 start src/index.js --name "sport-frontend"
pm2 save
```

### **Problem: CSS/JS not loading**

```bash
# Check file permissions
ls -la /var/www/sport_calendar/public/css_v2/
ls -la /var/www/sport_calendar/public/js/

# Should be readable (644)
chmod 644 /var/www/sport_calendar/public/css_v2/*.css
chmod 644 /var/www/sport_calendar/public/js/*.js
```

### **Problem: Changes not appearing**

```bash
# Clear browser cache
# Or hard refresh: Ctrl+Shift+R (Windows/Linux), Cmd+Shift+R (Mac)

# Check git status
cd /var/www/sport_calendar
git status
git log --oneline -5

# Should see: "🎨 Full Mobile-First UI Upgrade"
```

### **Problem: Dark Mode not working**

```bash
# Check if theme-manager.js loads
curl http://localhost:3000/js/theme-manager.js

# Check browser console (F12)
# Should see: "🎨 Theme Manager initialized"
```

---

## Testing Checklist

### **Desktop (1920x1080):**
- [ ] Header looks good
- [ ] Cards have glassmorphism
- [ ] Dark Mode toggle works
- [ ] No bottom navigation (hidden)

### **Tablet (768px):**
- [ ] 2 columns grid
- [ ] Cards still look good
- [ ] No bottom navigation

### **Mobile (375px - iPhone):**
- [ ] 1 column grid
- [ ] Bottom navigation visible
- [ ] Touch targets 44x44px minimum
- [ ] Safe area padding (iPhone X+)
- [ ] Swipe right = back

### **Dark Mode:**
- [ ] Auto-switch at 20:00
- [ ] Manual toggle works
- [ ] Colors change smoothly
- [ ] Glassmorphism adapts

---

## Performance Check

```bash
# Check server load
htop

# Check PM2 memory usage
pm2 monit

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Rollback (if needed)

```bash
# Go back to previous version
cd /var/www/sport_calendar
git log --oneline -10

# Find commit before "🎨 Full Mobile-First UI Upgrade"
git revert HEAD

# Or reset hard
git reset --hard HEAD~1

# Restart
pm2 restart sport-frontend
```

---

## Files Added (for reference)

```
public/
├── css_v2/
│   ├── modern-design-system.css    ← Core variables + dark mode
│   ├── mobile-nav.css              ← Bottom navigation
│   └── legacy-adapter.css          ← Adapts existing code
└── js/
    ├── theme-manager.js            ← Dark mode controller
    ├── mobile-nav.js               ← Navigation manager
    └── mobile-enhancements.js      ← Mobile optimizations

docs/
└── MOBILE_UI_FEATURES.md           ← Features guide
```

---

## What Changed in index.html

**Added CSS imports:**
```html
<link rel="stylesheet" href="/css_v2/modern-design-system.css">
<link rel="stylesheet" href="/css_v2/mobile-nav.css">
<link rel="stylesheet" href="/css_v2/legacy-adapter.css">
```

**Added JS imports:**
```html
<script src="/js/theme-manager.js"></script>
<script src="/js/mobile-enhancements.js"></script>
<script src="/js/mobile-nav.js"></script>
```

---

## Support

**אם משהו לא עובד:**

1. Check PM2 logs: `pm2 logs sport-frontend`
2. Check browser console (F12)
3. Clear cache and hard refresh
4. Verify git commit is latest
5. Restart services

**Status:** ✅ Tested locally, ready for production
**Version:** 3.0 Mobile-First
**Commit:** 9d6fd02
