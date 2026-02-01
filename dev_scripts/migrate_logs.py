import sqlite3
import os

DB_PATH = 'backend/instance/sport_calendar.db'
if not os.path.exists(DB_PATH):
    DB_PATH = 'instance/sport_calendar.db'

if not os.path.exists(DB_PATH):
    print(f"Database not found at {DB_PATH}")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print(f"Migrating {DB_PATH} to add login_logs table...")
try:
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS login_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(80) NOT NULL,
        email VARCHAR(120),
        status VARCHAR(20) NOT NULL,
        ip_address VARCHAR(50),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    conn.commit()
    print("Migration successful: Added login_logs table.")
except Exception as e:
    print(f"Migration failed: {e}")
finally:
    conn.close()
