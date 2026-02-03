import os
import sys
import time
import subprocess
import shutil
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load .env before anything else
load_dotenv()

from app import create_app
from extensions import db
from models import User, FavoriteTeam, SavedFixture, LoginLog
from config import FOOTBALL_API_KEY
from werkzeug.security import generate_password_hash
from sqlalchemy import func, case

# --- Configuration ---
INSTANCE_DB = os.path.join('instance', 'sport_calendar.db')
BACKEND_DB = os.path.join('backend', 'instance', 'sport_calendar.db')
CACHE_DIR = os.path.join(os.getcwd(), 'instance', 'cache')

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    print("\n==========================================")
    print("      🏆 Sport Calendar Admin Console     ")
    print("==========================================\n")

# --- 1. System Monitor ---
def system_monitor():
    print("--- 📊 System Monitor ---")
    
    # Check Ports (Simplified check)
    def check_port(port):
        try:
            # Use lsof to check if port is listening
            result = subprocess.run(f"lsof -i :{port} | grep LISTEN", shell=True, stdout=subprocess.PIPE)
            return result.returncode == 0
        except:
            return False

    frontend = check_port(3000)
    backend = check_port(8000)
    
    print(f"Frontend (:3000): {'✅ Online' if frontend else '❌ Offline'}")
    print(f"Backend  (:8000): {'✅ Online' if backend else '❌ Offline'}")
    
    # HTTP Health Check
    import urllib.request
    try:
        with urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3) as r:
            print(f"Health Check:    ✅ {r.read().decode()[:50]}")
    except Exception as e:
        print(f"Health Check:    ❌ Failed ({str(e)[:30]})")
    
    # DB Stats
    try:
        users = User.query.count()
        favs = FavoriteTeam.query.count()
        fixtures = SavedFixture.query.count()
        print(f"\nStats:")
        print(f"- Users: {users}")
        print(f"- Active Favorites: {favs}")
        print(f"- Saved Fixtures: {fixtures}")
    except Exception as e:
        print(f"Error reading DB: {e}")

    # Cache Size
    if os.path.exists(CACHE_DIR):
        files = os.listdir(CACHE_DIR)
        size = sum(os.path.getsize(os.path.join(CACHE_DIR, f)) for f in files) / 1024
        print(f"\nCache: {len(files)} files ({size:.2f} KB)")
    else:
        print("\nCache: Empty")

    input("\nPress Enter to continue...")

# --- 2. User Management ---
def list_users():
    users = User.query.all()
    print(f"\n{'ID':<5} {'Username':<20} {'Email':<30} {'Joined':<12}")
    print("-" * 70)
    for u in users:
        print(f"{u.id:<5} {u.username:<20} {u.email:<30} {u.created_at.strftime('%Y-%m-%d')}")
    print("-" * 70)
    return users

def manage_users():
    while True:
        clear_screen()
        print("--- 👥 User Management ---")
        users = list_users()
        
        print("\nOptions:")
        print("1. Delete User")
        print("2. Reset User Password")
        print("3. Back")
        
        choice = input("\nSelect: ")
        
        if choice == '1':
            uid = input("Enter User ID to delete: ")
            if uid:
                user = User.query.get(uid)
                if user:
                    if input(f"Delete {user.username}? (y/n): ") == 'y':
                        db.session.delete(user)
                        db.session.commit()
                        print("User deleted.")
                        time.sleep(1)
                else:
                    print("User not found.")
                    time.sleep(1)
        
        elif choice == '2':
            uid = input("Enter User ID to reset: ")
            if uid:
                user = User.query.get(uid)
                if user:
                    new_pass = input(f"Enter new password for {user.username}: ")
                    if new_pass:
                        user.password_hash = generate_password_hash(new_pass)
                        db.session.commit()
                        print("Password updated!")
                        time.sleep(1)

        elif choice == '3':
            break

# --- 3. Maintenance ---
def maintenance_menu():
    while True:
        clear_screen()
        print("--- 🧹 Maintenance ---")
        print("1. Clear ICS Cache")
        print("2. Prune Old Fixtures (Past dates)")
        print("3. Wipe Database (Reset All)")
        print("4. Back")
        
        choice = input("\nSelect: ")
        
        if choice == '1':
            if os.path.exists(CACHE_DIR):
                shutil.rmtree(CACHE_DIR)
                os.makedirs(CACHE_DIR)
                print("Cache cleared.")
            else:
                print("Cache already empty.")
            time.sleep(1)
            
        elif choice == '2':
            print("Feature coming soon (requires JSON query support).")
            time.sleep(2)
            
        elif choice == '3':
            if input("TYPE 'DESTROY' TO CONFIRM DATA WIPE: ") == 'DESTROY':
                db.drop_all()
                db.create_all()
                print("Database reset complete.")
                time.sleep(1)
                
        elif choice == '4':
            break

# --- 4. Server Ops ---
def server_ops():
    while True:
        clear_screen()
        print("--- ⚡ Server Operations ---")
        print("1. Stop All Servers (Kill Ports)")
        print("2. Restart Services (Env specific)")
        print("3. View Backend Logs")
        print("4. Back")
        
        choice = input("\nSelect: ")
        
        if choice == '1':
            os.system("bash kill_ports.sh")
            print("Ports killed.")
            time.sleep(1)
            
        elif choice == '2':
            # Check if running in production (simple check)
            if os.path.exists('/var/www/sport_calendar'):
                print("Detected Production Environment...")
                print("NOTE: You should use 'systemctl restart' manually for full effect.")
            
            print("Restarting local dev services...")
            os.system("bash kill_ports.sh && npm start > log.txt 2>&1 & source backend/venv/bin/activate && python3 backend/app.py > backend_log.new.txt 2>&1 &")
            print("Restart command issued.")
            time.sleep(2)
            
        elif choice == '3':
            print("\n--- Last 20 lines of Backend Log ---")
            
            # Possible locations
            candidates = [
                "backend_log.new.txt", 
                "backend_log.txt",
                os.path.join("..", "backend_log.new.txt"),
                os.path.join("..", "backend_log.txt")
            ]
            
            found = False
            for log_file in candidates:
                if os.path.exists(log_file):
                    print(f"Reading {log_file}...")
                    # Use cat for short files to avoid paging issues with tail sometimes
                    os.system(f"tail -n 20 {log_file}")
                    found = True
                    break
            
            if not found:
                print(f"Log file not found.")
                print(f"Current Directory: {os.getcwd()}")
                print(f"Files in dir: {os.listdir(os.getcwd())}")
                
            input("\nPress Enter...")
            
        elif choice == '4':
            break

# --- 3. Log Analysis ---
def analyze_logs():
    clear_screen()
    print("--- 🔍 Log Analysis ---")
    print("Select Time Range:")
    print("1. Last 24 Hours")
    print("2. Last 7 Days")
    print("3. Last 30 Days")
    print("4. All Time")
    
    choice = input("\nSelect: ")
    days = 0
    if choice == '1': days = 1
    elif choice == '2': days = 7
    elif choice == '3': days = 30
    
    try:
        query = db.session.query(
            LoginLog.username,
            LoginLog.email,
            func.sum(case((LoginLog.status == 'SUCCESS', 1), else_=0)).label('successes'),
            func.sum(case((LoginLog.status == 'FAILURE', 1), else_=0)).label('failures')
        )
        
        if days > 0:
            cutoff = datetime.utcnow() - timedelta(days=days)
            query = query.filter(LoginLog.timestamp >= cutoff)
            
        results = query.group_by(LoginLog.username, LoginLog.email).all()
        
        print(f"\n{'Username':<20} {'Email':<30} {'SUCCESS':<8} {'FAILED':<8}")
        print("-" * 80)
        
        if not results:
            print("No logs found for this period.")
            
        for row in results:
            email = row.email if row.email else "-"
            s_count = int(row.successes) if row.successes else 0
            f_count = int(row.failures) if row.failures else 0
            print(f"{row.username:<20} {email:<30} {s_count:<8} {f_count:<8}")
            
        print("-" * 80)
    except Exception as e:
        print(f"Error querying logs: {e}")
        
    input("\nPress Enter to continue...")

# --- 6. Full Diagnostics ---
def run_full_diagnostics():
    import urllib.request
    import json
    
    clear_screen()
    print("--- 🔧 Full Diagnostics ---\n")
    
    # 1. Port checks
    def check_port(port):
        try:
            result = subprocess.run(f"lsof -i :{port} | grep LISTEN", shell=True, stdout=subprocess.PIPE)
            return result.returncode == 0
        except:
            return False
    
    print("📡 Server Status:")
    frontend = check_port(3000)
    backend = check_port(8000)
    print(f"  Frontend (:3000): {'✅ Online' if frontend else '❌ Offline'}")
    print(f"  Backend  (:8000): {'✅ Online' if backend else '❌ Offline'}")
    
    # 2. HTTP Health Checks
    print("\n🌐 HTTP Health Checks:")
    endpoints = [
        ('http://127.0.0.1:8000/health', 'Backend /health'),
        ('http://127.0.0.1:3000/api/health', 'Frontend -> Backend (proxy)'),
        ('http://127.0.0.1:3000/api/fixtures/countries', 'Fixtures API'),
    ]
    
    for url, name in endpoints:
        try:
            with urllib.request.urlopen(url, timeout=5) as r:
                status = r.status
                print(f"  {name}: ✅ {status}")
        except Exception as e:
            print(f"  {name}: ❌ {str(e)[:40]}")
    
    # 3. Database Stats
    print("\n📊 Database Stats:")
    try:
        users = User.query.count()
        favs = FavoriteTeam.query.count()
        fixtures = SavedFixture.query.count()
        print(f"  Users: {users}")
        print(f"  Favorite Teams: {favs}")
        print(f"  Saved Fixtures: {fixtures}")
    except Exception as e:
        print(f"  ❌ DB Error: {e}")
    
    # 4. External API Check
    print("\n⚽ External API Check:")
    if FOOTBALL_API_KEY and FOOTBALL_API_KEY != 'demo_key_12345':
        try:
            import requests
            resp = requests.get(
                'https://v3.football.api-sports.io/status',
                headers={'x-apisports-key': FOOTBALL_API_KEY},
                timeout=10
            )
            data = resp.json()
            account = data.get('response', {}).get('account', {})
            requests_info = data.get('response', {}).get('requests', {})
            print(f"  ✅ Key: {FOOTBALL_API_KEY[:8]}...{FOOTBALL_API_KEY[-4:]}")
            print(f"  Account: {account.get('firstname', 'N/A')} ({account.get('email', 'N/A')})")
            print(f"  Requests Today: {requests_info.get('current', '?')}/{requests_info.get('limit_day', '?')}")
        except Exception as e:
            print(f"  ⚠️ Key loaded ({FOOTBALL_API_KEY[:8]}...) but API check failed: {str(e)[:40]}")
    else:
        print("  ⚠️ FOOTBALL_API_KEY not set (using demo mode)")
    
    # 5. Cache Status
    print("\n📁 Cache Status:")
    if os.path.exists(CACHE_DIR):
        files = os.listdir(CACHE_DIR)
        size = sum(os.path.getsize(os.path.join(CACHE_DIR, f)) for f in files) / 1024
        print(f"  Files: {len(files)}, Size: {size:.2f} KB")
    else:
        print("  Cache directory empty/missing")
    
    print("\n" + "─" * 40)
    print("✅ Diagnostics complete")
    input("\nPress Enter to continue...")

# --- Main Loop ---
def main():
    app = create_app()
    with app.app_context():
        while True:
            clear_screen()
            print_header()
            print("1. 📊 System Monitor")
            print("2. 👥 User Management")
            print("3. 📈 Log Analysis")
            print("4. 🧹 Cleanup & Maintenance")
            print("5. ⚡ Server Operations")
            print("6. 🔧 Full Diagnostics")
            print("7. Exit")
            
            choice = input("\nSelect Option: ")
            
            if choice == '1':
                system_monitor()
            elif choice == '2':
                manage_users()
            elif choice == '3':
                analyze_logs()
            elif choice == '4':
                maintenance_menu()
            elif choice == '5':
                server_ops()
            elif choice == '6':
                run_full_diagnostics()
            elif choice == '7':
                sys.exit()

if __name__ == "__main__":
    main()