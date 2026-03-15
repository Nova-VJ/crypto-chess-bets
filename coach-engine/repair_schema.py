import sqlite3
import os

db_path = "coach-engine/coach.db"

def repair_database():
    if not os.path.exists(db_path):
        print(f"Error: Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check current columns in users table
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    
    required_columns = {
        "achievement_points": "INTEGER DEFAULT 0",
        "achievements_unlocked": "TEXT DEFAULT '[]'",
        "missions_daily": "TEXT DEFAULT '[]'",
        "missions_weekly": "TEXT DEFAULT '[]'",
        "streak_count": "INTEGER DEFAULT 0",
        "last_activity_date": "DATETIME DEFAULT CURRENT_TIMESTAMP",
        "masteries_json": "TEXT DEFAULT '{}'"
    }
    
    for col_name, col_def in required_columns.items():
        if col_name not in columns:
            print(f"Adding missing column: {col_name}")
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
            except Exception as e:
                print(f"Failed to add {col_name}: {e}")
    
    conn.commit()
    conn.close()
    print("Database schema repair completed.")

if __name__ == "__main__":
    repair_database()
