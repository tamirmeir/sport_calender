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

# --- 7. League Management ---
def league_management():
    import json
    import urllib.request
    
    ACTIVE_LEAGUES_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src', 'data', 'active_leagues.json')
    VERIFY_LOG = '/tmp/verify_progress.log'
    
    while True:
        clear_screen()
        print("--- ⚽ League Management ---\n")
        
        # Show current stats
        try:
            with open(ACTIVE_LEAGUES_FILE, 'r') as f:
                leagues = json.load(f)
            print(f"📊 Active Leagues Cache: {len(leagues)} leagues")
            
            # Count by country
            countries = {}
            for l in leagues:
                country = l.get('country', {}).get('name', 'Unknown')
                countries[country] = countries.get(country, 0) + 1
            top_countries = sorted(countries.items(), key=lambda x: -x[1])[:5]
            print(f"   Top countries: {', '.join([f'{c}({n})' for c,n in top_countries])}")
        except FileNotFoundError:
            print("📊 Active Leagues Cache: ❌ File not found")
        except json.JSONDecodeError:
            print("📊 Active Leagues Cache: ⚠️ Invalid JSON (sync in progress?)")
        
        print("\nOptions:")
        print("1. 🔄 Start Fresh League Sync (--fresh)")
        print("2. 📈 Check Sync Progress")
        print("3. 🔍 Search League by Name/ID")
        print("4. 🧪 Test Competition Structure API")
        print("5. ⏹️  Stop Running Sync")
        print("6. 📋 List All Leagues (paged)")
        print("7. Back")
        
        choice = input("\nSelect: ")
        
        if choice == '1':
            print("\n🚀 Starting league sync...")
            os.chdir(os.path.dirname(os.path.dirname(__file__)))
            os.system(f"node src/scripts/verify_leagues.js --fresh > {VERIFY_LOG} 2>&1 &")
            print(f"✅ Sync started! Monitor with option 2")
            time.sleep(2)
            
        elif choice == '2':
            print("\n--- 📈 Sync Progress ---")
            # Check if process is running
            result = subprocess.run("pgrep -f 'verify_leagues'", shell=True, stdout=subprocess.PIPE)
            if result.returncode == 0:
                print("Status: 🟢 Running")
            else:
                print("Status: ⚪ Not running")
            
            # Count current leagues
            try:
                with open(ACTIVE_LEAGUES_FILE, 'r') as f:
                    leagues = json.load(f)
                print(f"Leagues saved: {len(leagues)}")
            except:
                print("Leagues saved: Unable to read")
            
            # Show last 10 log lines
            if os.path.exists(VERIFY_LOG):
                print("\n--- Last 10 log entries ---")
                os.system(f"tail -10 {VERIFY_LOG}")
            input("\nPress Enter to continue...")
            
        elif choice == '3':
            search = input("\nEnter league name or ID: ").strip()
            if search:
                try:
                    with open(ACTIVE_LEAGUES_FILE, 'r') as f:
                        leagues = json.load(f)
                    
                    results = []
                    for l in leagues:
                        lid = str(l.get('league', {}).get('id', ''))
                        name = l.get('league', {}).get('name', '').lower()
                        country = l.get('country', {}).get('name', '').lower()
                        
                        if search.lower() in name or search.lower() in country or search == lid:
                            results.append(l)
                    
                    if results:
                        print(f"\n🔍 Found {len(results)} matches:\n")
                        for r in results[:15]:
                            league = r.get('league', {})
                            country = r.get('country', {})
                            print(f"  ID: {league.get('id'):<5} | {league.get('name'):<35} | {country.get('name')}")
                        if len(results) > 15:
                            print(f"  ... and {len(results) - 15} more")
                    else:
                        print("❌ No matches found")
                except Exception as e:
                    print(f"Error: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == '4':
            lid = input("\nEnter league ID to test: ").strip()
            if lid:
                try:
                    url = f'http://127.0.0.1:3000/api/fixtures/competition-structure/{lid}'
                    with urllib.request.urlopen(url, timeout=5) as r:
                        data = json.loads(r.read().decode())
                    print(f"\n📋 Competition Structure for League {lid}:\n")
                    print(f"  Name: {data.get('name')}")
                    print(f"  Country: {data.get('country')}")
                    print(f"  Format: {data.get('format')}")
                    print(f"  Stages: {len(data.get('stages', []))}")
                    if data.get('qualificationZones'):
                        print(f"\n  🏆 Qualification Zones:")
                        for zone in data.get('qualificationZones', []):
                            print(f"     {zone.get('positions')}: {zone.get('description')}")
                except Exception as e:
                    print(f"❌ Error: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == '5':
            print("\n⏹️ Stopping sync process...")
            os.system("pkill -f 'verify_leagues' 2>/dev/null")
            print("Done.")
            time.sleep(1)
            
        elif choice == '6':
            try:
                with open(ACTIVE_LEAGUES_FILE, 'r') as f:
                    leagues = json.load(f)
                
                page = 0
                per_page = 20
                total_pages = (len(leagues) + per_page - 1) // per_page
                
                while True:
                    clear_screen()
                    print(f"--- 📋 All Leagues (Page {page+1}/{total_pages}) ---\n")
                    start = page * per_page
                    end = start + per_page
                    
                    print(f"{'ID':<6} {'Name':<40} {'Country':<20}")
                    print("-" * 70)
                    for l in leagues[start:end]:
                        league = l.get('league', {})
                        country = l.get('country', {})
                        print(f"{league.get('id'):<6} {league.get('name', '')[:38]:<40} {country.get('name', '')[:18]}")
                    
                    print(f"\n[N]ext | [P]rev | [Q]uit")
                    nav = input("Navigate: ").lower()
                    if nav == 'n' and page < total_pages - 1:
                        page += 1
                    elif nav == 'p' and page > 0:
                        page -= 1
                    elif nav == 'q':
                        break
            except Exception as e:
                print(f"Error: {e}")
                input("\nPress Enter to continue...")
            
        elif choice == '7':
            break

# --- 8. API Testing & Qualification Zones ---
def api_testing():
    import urllib.request
    import json
    
    LEAGUES_TO_TEST = [
        # (id, country, name)
        (39, "England", "Premier League"),
        (140, "Spain", "La Liga"),
        (78, "Germany", "Bundesliga"),
        (135, "Italy", "Serie A"),
        (61, "France", "Ligue 1"),
        (88, "Netherlands", "Eredivisie"),
        (94, "Portugal", "Primeira Liga"),
        (144, "Belgium", "Pro League"),
        (203, "Turkey", "Super Lig"),
        (179, "Scotland", "Premiership"),
        (218, "Austria", "Bundesliga"),
        (197, "Greece", "Super League"),
        (106, "Poland", "Ekstraklasa"),
        (332, "Ukraine", "Premier Liga"),
        (333, "Serbia", "Super Liga"),
        (286, "Croatia", "HNL"),
        (345, "Czech", "Fortuna Liga"),
        (271, "Hungary", "NB I"),
        (283, "Bosnia", "Premijer Liga"),
        (210, "Cyprus", "First Division"),
        (103, "Norway", "Eliteserien"),
        (113, "Sweden", "Allsvenskan"),
        (119, "Denmark", "Superliga"),
        (207, "Switzerland", "Super League"),
        (383, "Israel", "Ligat Ha'al"),
        (71, "Brazil", "Serie A"),
        (128, "Argentina", "Liga Profesional"),
        (98, "Japan", "J1 League"),
        (292, "S. Korea", "K League 1"),
        (307, "Saudi Arabia", "Saudi Pro League"),
        (188, "Australia", "A-League"),
        (253, "USA", "MLS"),
        (262, "Mexico", "Liga MX"),
        (288, "South Africa", "PSL"),
        (233, "Egypt", "Premier League"),
        (200, "Morocco", "Botola Pro"),
    ]
    
    while True:
        clear_screen()
        print("--- 🧪 API Testing ---\n")
        print("1. 🏆 Test Single League Structure")
        print("2. 🌍 Test ALL Qualification Zones")
        print("3. 🔍 Test Country Fixtures")
        print("4. 👟 Test Team Fixtures")
        print("5. 🔎 Search League Cache")
        print("6. ✅ Verify League IDs")
        print("7. 📊 API Usage Stats")
        print("8. Back")
        
        choice = input("\nSelect: ")
        
        if choice == '1':
            # Test Single League
            lid = input("\nEnter league ID (or press Enter for 39): ").strip() or "39"
            try:
                url = f'http://127.0.0.1:3000/api/fixtures/competition-structure/{lid}'
                with urllib.request.urlopen(url, timeout=10) as r:
                    data = json.loads(r.read().decode())
                
                print(f"\n📋 League {lid} Structure:")
                print(f"  Name: {data.get('name')}")
                print(f"  Country: {data.get('country')}")
                print(f"  Format: {data.get('format')}")
                
                stages = data.get('stages', [])
                if stages:
                    print(f"\n  📅 Stages ({len(stages)}):")
                    for s in stages:
                        print(f"     - {s.get('name')}: {s.get('description', 'N/A')}")
                
                zones = data.get('qualificationZones', [])
                if zones:
                    print(f"\n  🏆 Qualification Zones ({len(zones)}):")
                    for z in zones:
                        start = z.get('start', '?')
                        end = z.get('end', '?')
                        pos = f"{start}-{end}" if start != end else str(start)
                        print(f"     {pos:>5}: {z.get('label')}")
                else:
                    print(f"\n  ⚠️ No qualification zones defined")
                
                if data.get('promotion'):
                    print(f"\n  ⬆️ Promotion: {data.get('promotion')}")
                if data.get('relegation'):
                    print(f"  ⬇️ Relegation: {data.get('relegation')}")
                    
            except urllib.error.URLError as e:
                print(f"❌ Connection error: {e}")
            except json.JSONDecodeError:
                print(f"❌ Invalid JSON response")
            except Exception as e:
                print(f"❌ Error: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == '2':
            # Test ALL Qualification Zones
            print("\n🌍 Testing ALL Qualification Zones...\n")
            success = 0
            failed = 0
            errors = 0
            
            for lid, country, name in LEAGUES_TO_TEST:
                try:
                    url = f'http://127.0.0.1:3000/api/fixtures/competition-structure/{lid}'
                    with urllib.request.urlopen(url, timeout=10) as r:
                        data = json.loads(r.read().decode())
                    
                    zones = data.get('qualificationZones', [])
                    if zones:
                        labels = ", ".join([z.get('label', '?') for z in zones[:2]])
                        print(f"  ✅ {country:14} ({lid:3}) | {len(zones)} zones | {labels}...")
                        success += 1
                    else:
                        print(f"  ⚠️  {country:14} ({lid:3}) | NO ZONES")
                        failed += 1
                except Exception as e:
                    print(f"  ❌ {country:14} ({lid:3}) | ERROR: {str(e)[:30]}")
                    errors += 1
            
            total = success + failed + errors
            pct = (success * 100 // total) if total > 0 else 0
            print(f"\n{'─' * 50}")
            print(f"  Results: {success} ✅ | {failed} ⚠️ | {errors} ❌")
            print(f"  Coverage: {pct}%")
            print(f"{'─' * 50}")
            input("\nPress Enter to continue...")
            
        elif choice == '3':
            # Test Country Fixtures
            country = input("\nEnter country name (e.g., England): ").strip()
            if country:
                try:
                    url = f'http://127.0.0.1:3000/api/fixtures/by-country/{country}'
                    with urllib.request.urlopen(url, timeout=15) as r:
                        data = json.loads(r.read().decode())
                    
                    fixtures = data if isinstance(data, list) else data.get('response', [])
                    print(f"\n📋 Found {len(fixtures)} fixtures for {country}")
                    
                    if fixtures:
                        print("\nFirst 5 fixtures:")
                        for f in fixtures[:5]:
                            fixture = f.get('fixture', {})
                            teams = f.get('teams', {})
                            home = teams.get('home', {}).get('name', '?')
                            away = teams.get('away', {}).get('name', '?')
                            date = fixture.get('date', '?')[:10]
                            print(f"  • {date}: {home} vs {away}")
                except Exception as e:
                    print(f"❌ Error: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == '4':
            # Test Team Fixtures
            team_id = input("\nEnter team ID (e.g., 33 for Man United): ").strip()
            if team_id:
                try:
                    url = f'http://127.0.0.1:3000/api/fixtures/team/{team_id}'
                    with urllib.request.urlopen(url, timeout=15) as r:
                        data = json.loads(r.read().decode())
                    
                    fixtures = data if isinstance(data, list) else data.get('response', [])
                    print(f"\n📋 Found {len(fixtures)} fixtures for team {team_id}")
                    
                    if fixtures:
                        print("\nUpcoming fixtures:")
                        for f in fixtures[:5]:
                            fixture = f.get('fixture', {})
                            teams = f.get('teams', {})
                            home = teams.get('home', {}).get('name', '?')
                            away = teams.get('away', {}).get('name', '?')
                            date = fixture.get('date', '?')[:10]
                            print(f"  • {date}: {home} vs {away}")
                except Exception as e:
                    print(f"❌ Error: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == '5':
            # Search League Cache
            search = input("\nSearch term (name/country): ").strip()
            if search:
                ACTIVE_LEAGUES_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src', 'data', 'active_leagues.json')
                try:
                    with open(ACTIVE_LEAGUES_FILE, 'r') as f:
                        leagues = json.load(f)
                    
                    results = []
                    for l in leagues:
                        lid = str(l.get('league', {}).get('id', ''))
                        name = l.get('league', {}).get('name', '').lower()
                        country = l.get('country', {}).get('name', '').lower()
                        
                        if search.lower() in name or search.lower() in country or search == lid:
                            results.append(l)
                    
                    if results:
                        print(f"\n🔍 Found {len(results)} matches:\n")
                        for r in results[:20]:
                            league = r.get('league', {})
                            country = r.get('country', {})
                            print(f"  ID: {league.get('id'):<5} | {league.get('name'):<35} | {country.get('name')}")
                        if len(results) > 20:
                            print(f"  ... and {len(results) - 20} more")
                    else:
                        print("❌ No matches found")
                except Exception as e:
                    print(f"Error: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == '6':
            # Verify League IDs
            print("\n✅ Verifying league IDs against cache...\n")
            ACTIVE_LEAGUES_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src', 'data', 'active_leagues.json')
            
            try:
                with open(ACTIVE_LEAGUES_FILE, 'r') as f:
                    leagues = json.load(f)
                
                cache_ids = {l.get('league', {}).get('id') for l in leagues}
                
                found = 0
                missing = []
                for lid, country, name in LEAGUES_TO_TEST:
                    if lid in cache_ids:
                        print(f"  ✅ {lid:3} | {name}")
                        found += 1
                    else:
                        print(f"  ❌ {lid:3} | {name} - NOT IN CACHE")
                        missing.append((lid, country, name))
                
                print(f"\n{'─' * 40}")
                print(f"  In cache: {found}/{len(LEAGUES_TO_TEST)}")
                if missing:
                    print(f"  Missing: {', '.join([str(m[0]) for m in missing])}")
                print(f"{'─' * 40}")
            except Exception as e:
                print(f"Error: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == '7':
            # API Usage Stats
            print("\n📊 API Usage Stats:\n")
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
                    subscription = data.get('response', {}).get('subscription', {})
                    
                    print(f"  Account: {account.get('firstname', 'N/A')} {account.get('lastname', '')}")
                    print(f"  Email: {account.get('email', 'N/A')}")
                    print(f"  Plan: {subscription.get('plan', 'N/A')}")
                    print(f"  End Date: {subscription.get('end', 'N/A')}")
                    print(f"\n  📈 Requests:")
                    print(f"     Today: {requests_info.get('current', '?')}/{requests_info.get('limit_day', '?')}")
                    remaining = int(requests_info.get('limit_day', 0)) - int(requests_info.get('current', 0))
                    print(f"     Remaining: {remaining}")
                except Exception as e:
                    print(f"  ❌ Error: {e}")
            else:
                print("  ⚠️ Demo mode - no API key configured")
            input("\nPress Enter to continue...")
            
        elif choice == '8':
            break

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
            print("7. ⚽ League Management")
            print("8. 🧪 API Testing")
            print("9. Exit")
            
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
                league_management()
            elif choice == '8':
                api_testing()
            elif choice == '9':
                sys.exit()

if __name__ == "__main__":
    main()