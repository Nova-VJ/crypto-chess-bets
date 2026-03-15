import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'coach.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE games ADD COLUMN opponent_persona VARCHAR")
    print("Column opponent_persona added successfully.")
except sqlite3.OperationalError as e:
    print(f"OperationalError (might already exist): {e}")

conn.commit()
conn.close()
