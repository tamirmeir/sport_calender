#!/bin/bash
# Update JWT Secret in Production
# Run this script and enter your SSH password when prompted

echo "🔐 Connecting to production server..."
echo "Enter SSH password when prompted"
echo ""

ssh tamir@165.227.5.88 << 'ENDSSH'
cd /var/www/sport_calendar

echo "=== Current JWT in production ==="
tail -3 backend/.env

echo ""
echo "=== Restarting backend ==="
pkill -f gunicorn
sleep 2

cd backend
source venv/bin/activate
nohup gunicorn --bind 0.0.0.0:8000 app:app > gunicorn.log 2>&1 &

sleep 3

echo ""
echo "=== Testing backend ==="
curl -s http://localhost:8000/health

echo ""
echo "=== Checking for JWT warning in logs ==="
tail -20 gunicorn.log | grep -i "InsecureKeyLength" || echo "✅ No JWT warning found!"

ENDSSH

echo ""
echo "✅ Done! Check output above."
