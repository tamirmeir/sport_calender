# Sport Calendar - Production Deployment Guide

This guide outlines the steps to deploy the Sport Calendar application to the production environment (DigitalOcean Droplet) using the automated CI/CD pipeline.

## 1. Prerequisites Setup

### DigitalOcean Droplet
Ensure your droplet is configured with:
*   **Operating System**: Ubuntu 20.04/22.04 LTS recommended.
*   **Node.js**: Version 18.x installed.
*   **Python**: Version 3.10+ installed with `venv` support.
*   **Git**: Installed and authenticated with GitHub (SSH key setup).
*   **Process Manager**: `pm2` installed globally (`npm install -g pm2`) to keep Node.js running.

### GitHub Repository Secrets
Go to **Settings** > **Secrets and variables** > **Actions** in your GitHub repository and add the following:

| Secret Name | Description |
| :--- | :--- |
| `FOOTBALL_API_KEY` | Your live API-Sports Key (v3). |
| `DO_HOST` | The public IP address of your DigitalOcean droplet. |
| `DO_USERNAME` | The SSH username (usually `root` or a sudo user). |
| `DO_SSH_KEY` | The **Private** SSH key content. Ensure the public key is in `~/.ssh/authorized_keys` on the droplet. |

## 2. The Deployment Pipeline

We utilize "Zero-Touch" deployment via GitHub Actions.

**Trigger**: Pushing to the `main` branch.

### Stage 1: Automated Testing (GitHub Runner)
1.  Installs dependencies (`npm install`).
2.  Installs Python dev tools (`pip install -r backend/requirements-dev.txt`).
3.  **Validation Test**: Runs `node src/scripts/verify_leagues.js --test`.
    *   Verifies API request URL formatting.
    *   Ensures mandatory parameters (e.g., `current=true`) are present.
    *   **Result**: If this fails, deployment **stops immediately**.

### Stage 2: Production Deployment (DigitalOcean)
If tests pass, the action connects via SSH and performs:
1.  **Code Update**: `git reset --hard HEAD` and `git pull origin main`.
2.  **Dependency Install**: 
    *   Node: `npm install`
    *   Python: `pip install -r backend/requirements.txt` (Production only, no dev tools).
3.  **Cache Busting**: Updates `public/sw.js` version with a timestamp (e.g., `sport-calendar-v202602031200`) to force mobile clients to refresh.
4.  **Data Sync**: Runs `node src/scripts/verify_leagues.js --fresh` to fetch the latest active leagues using the production API Key.
5.  **Restart**: Reloads the application process via `pm2 restart all`.

## 3. Manual Tasks (First Time Only)

If setting up a fresh server, run these commands once manually:

```bash
# 1. Clone Repo
git clone <your-repo-url> ~/sport_calender
cd ~/sport_calender

# 2. Setup Python Venv
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# 3. Setup Environment Variables
# Create .env (Node)
echo "FOOTBALL_API_KEY=your_key_here" > .env
echo "PORT=3000" >> .env

# Create backend/.env (Python)
echo "FOOTBALL_API_KEY=your_key_here" > backend/.env
echo "DATABASE_URL=sqlite:///instance/sport_calender.db" >> backend/.env
echo "JWT_SECRET_KEY=your_secret" >> backend/.env

# 4. Start with PM2
pm2 start src/index.js --name "sport-calendar"
pm2 save
```

## 4. Verification & rollback

### How to verify success
1.  **GitHub Actions**: Check the "Actions" tab. A green checkmark means code is live.
2.  **Visual Check**: Open the PWA.
    *   Go to "Settings" > "Version". It should match the latest deployed timestamp.
    *   Verify "Ligat Ha'al" is pinned to the top of the Israel hub.

### Rollback Strategy
If a bad deployment occurs:
1.  **Revert in Git**:
    ```bash
    git revert HEAD
    git push origin main
    ```
    *   This will trigger the pipeline again and deploy the previous stable code.

2.  **Emergency Manual Rollback**:
    SSH into the server:
    ```bash
    cd ~/sport_calender
    git reset --hard <previous-commit-hash>
    pm2 restart all
    ```
