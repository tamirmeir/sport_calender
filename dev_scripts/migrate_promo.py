import sqlite3
import os

DB_PATHS = [
    'backend/instance/sport_calendar.db',
    'instance/sport_calendar.db'
]

def migrate_db(db_path):
    if not os.path.exists(db_path):
        print(f"Skipping {db_path} (not found)")
        return

    print(f"Checking {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column exists to avoid error spam
        cursor.execute("SELECT has_seen_sync_promo FROM users LIMIT 1")
        print("  - Column has_seen_sync_promo already exists.")
    except sqlite3.OperationalError:
        print("  - Adding missing column has_seen_sync_promo...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN has_seen_sync_promo BOOLEAN DEFAULT 0")
            conn.commit()
            print("  ✅ Migration successful for this DB")
        except Exception as e:
            print(f"  ❌ Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    for path in DB_PATHS:
        migrate_db(path)
