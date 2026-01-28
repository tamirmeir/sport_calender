#!/bin/bash

# --- Sport Calendar Droplet Setup Script ---
# Run this on your DigitalOcean Droplet

echo "🚀 Starting Deployment Setup..."

# 1. Update System
sudo apt update && sudo apt upgrade -y

# 2. Install Dependencies
echo "📦 Installing Node.js, Python, Nginx..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs python3-pip python3-venv nginx git

# 3. Clone Repository
# Replace with your actual repo URL if private
echo "📂 Cloning Repository..."
cd /var/www
sudo git clone https://github.com/tamirmeir/sport_calender.git sport_calendar
cd sport_calendar

# 4. Setup Python Backend
echo "🐍 Setting up Python Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Create Service File
sudo tee /etc/systemd/system/sport-backend.service <<EOF
[Unit]
Description=Gunicorn instance to serve Sport Calendar Backend
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=/var/www/sport_calendar/backend
Environment="PATH=/var/www/sport_calendar/backend/venv/bin"
Environment="FLASK_ENV=production"
ExecStart=/var/www/sport_calendar/backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 app:create_app()

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl start sport-backend
sudo systemctl enable sport-backend

# 5. Setup Node Frontend
echo "💻 Setting up Node Frontend..."
cd ../
npm install
npm install pm2 -g
pm2 start src/index.js --name "sport-frontend"
pm2 save
pm2 startup

# 6. Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/sport_calendar <<EOF
server {
    listen 80;
    server_name _;  # Replace with your domain if you have one

    # Frontend (Node.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend (Python)
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    
    # Calendar Sync path
    location /sync/ {
        proxy_pass http://127.0.0.1:8000;
    }
    
    location /calendar/ {
        proxy_pass http://127.0.0.1:8000;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/sport_calendar /etc/nginx/sites-enabled
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Deployment Complete! Visit your Droplet IP to see the app."
