# Deployment & Environment Configuration

## 1. Environment Differences (Dev vs Prod)

This application behaves differently based on the environment it runs in.

| Feature | Development (Local) | Production (Droplet) |
| :--- | :--- | :--- |
| **Frontend Server** | Node.js (`npm start`) | PM2 + Nginx Proxy |
| **Backend Server** | Python Flask (`python app.py`) | Gunicorn + Systemd |
| **Database** | SQLite (`localdev.db`) | SQLite (`sport_calendar.db`) |
| **API URL** | `http://127.0.0.1:8000` | `http://<DROPLET_IP>/` |
| **Proxying** | `http-proxy-middleware` | Nginx `proxy_pass` |
| **HTTPS** | No (HTTP) | Recommended (Certbot) |

---

## 2. Configuration Mismatch Check
**Critical:** The application expects specific environment variable names. Ensure your Production `.env` matches the code requirements.

| Variable Name | Required By | Description |
| :--- | :--- | :--- |
| `FOOTBALL_API_KEY` | Node & Python | API-Sports Key |
| `API_BASE_URL` | Node & Python | **Must be exactly this name.** <br>❌ `FOOTBALL_API_URL` (Invalid) <br>✅ `API_BASE_URL` (Correct) |
| `DATABASE_URL` | Python | Connection string (SQLAlchemy) |
| `FLASK_ENV` | Python | `production` or `development` |
| `SECRET_KEY` | Python | Required for Session security |

### ⚠️ Fix Required for Production `.env`
Your production `.env` currently uses `FOOTBALL_API_URL`. The code in `backend/config.py` looks for `API_BASE_URL`.
**Action:** Rename `FOOTBALL_API_URL` to `API_BASE_URL` in your server's `.env` file.

---

## 3. Deployment Checklist

1.  **System Dependencies**
    ```bash
    sudo apt update
    sudo apt install nodejs python3-pip python3-venv nginx
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt gunicorn
    # Ensure .env has API_BASE_URL, NOT FOOTBALL_API_URL
    ```

3.  **Frontend Setup**
    ```bash
    npm install
    npm run build # (If using a build step, otherwise pm2 start src/index.js)
    ```

4.  **Helper Script**
    refer to `deploy_droplet.sh` in the root directory for a full automation script.

