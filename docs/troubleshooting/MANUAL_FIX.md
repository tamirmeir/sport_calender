# ✋ תיקון ידני - Nginx Config

## 📝 פתח את הקובץ:
```bash
ssh tamir@165.227.5.88
sudo nano /etc/nginx/sites-available/sport_calendar
```

## ➕ הוסף את הבלוק הזה **לפני** השורה שמתחילה ב-`location /api {`:

```nginx
    # IMPORTANT: /api/fixtures goes to Node.js (must be BEFORE /api)
    location /api/fixtures {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

```

## 💾 שמור:
- לחץ `Ctrl+O` (שמירה)
- לחץ `Enter` (אישור)
- לחץ `Ctrl+X` (יציאה)

## ✅ בדוק ואז טען מחדש:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📋 או - סתם תריץ:
```bash
ssh tamir@165.227.5.88 /tmp/fix_nginx.sh
```

**זה יעשה הכל בשבילך!** 🎉
