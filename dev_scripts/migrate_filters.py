import sqlite3
import os

DB_PATHS = [
    'backend/instance/sport_calendar.db',
    'instance/sport_calendar.db'
]

for db_path in DB_PATHS:
    if not os.path.exists(db_path):
        print(f"Skipping {db_path} (not found)")
        continue

    print(f"Migrating {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE favorite_teams ADD COLUMN filters TEXT DEFAULT NULL")
        conn.commit()
        print(f"✅ Migration successful for {db_path}: Added filters column")
    except Exception as e:
        print(f"❌ Migration failed for {db_path} (maybe column exists?): {e}")
    finally:
        conn.close()
