# 🚨 תיקון דחוף - Nginx Routing

## מה הבעיה?
Nginx שולח את **כל** `/api/*` ל-Python, אבל `/api/fixtures` צריך ללכת ל-Node.js!

---

## ✅ פתרון (4 פקודות פשוטות):

### 1️⃣ התחבר לשרת:
```bash
ssh tamir@165.227.5.88
```

### 2️⃣ גיבוי + החלפת הקובץ:
```bash
sudo cp /etc/nginx/sites-available/sport_calendar /etc/nginx/sites-available/sport_calendar.backup && sudo cp /tmp/sport_calendar_nginx.conf /etc/nginx/sites-available/sport_calendar
```

### 3️⃣ בדוק שהקובץ תקין:
```bash
sudo nginx -t
```

אם אתה רואה `syntax is ok` ו-`test is successful` - תמשיך! ✅

### 4️⃣ טען מחדש את Nginx:
```bash
sudo systemctl reload nginx
```

---

## 🎯 אחרי זה:
1. פתח את האתר ב-**Incognito**: https://matchdaybytm.com
2. הכל יעבוד! 🎉

---

## 🔍 למה זה עובד?
הוספתי rule חדש ש**לפני** `location /api`:

```nginx
location /api/fixtures {
    proxy_pass http://127.0.0.1:3000;  ← Node.js ✅
}
```

עכשיו Nginx יודע לשלוח:
- `/api/fixtures/*` → Node.js (port 3000) ✅
- `/api/auth/*` → Python (port 8000) ✅
- `/api/favorites/*` → Python (port 8000) ✅

---

**תריץ את 4 הפקודות ותגיד לי אם יש שגיאה!** 🚀
