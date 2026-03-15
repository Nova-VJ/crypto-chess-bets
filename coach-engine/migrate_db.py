import sqlite3
import os

db_path = "coach.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Update users table
    columns_users = [
        ("xp", "INTEGER DEFAULT 0"),
        ("level", "INTEGER DEFAULT 1"),
        ("unlocked_assets", "TEXT DEFAULT '[]'"),
        ("current_board", "TEXT DEFAULT 'default'"),
        ("current_pieces", "TEXT DEFAULT 'default'")
    ]
    for col, type_def in columns_users:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {type_def}")
            print(f"Added {col} to users")
        except sqlite3.OperationalError:
            print(f"Column {col} already exists in users")

    # Update games table
    columns_games = [
        ("master_rating", "INTEGER"),
        ("master_review", "TEXT"),
        ("neuro_metrics", "TEXT"),
        ("time_control", "INTEGER")
    ]
    for col, type_def in columns_games:
        try:
            cursor.execute(f"ALTER TABLE games ADD COLUMN {col} {type_def}")
            print(f"Added {col} to games")
        except sqlite3.OperationalError:
            print(f"Column {col} already exists in games")

    conn.commit()
    conn.close()
    print("Migration complete.")
else:
    print("No database found to migrate.")
