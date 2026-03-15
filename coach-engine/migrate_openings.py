import sqlite3

def migrate():
    conn = sqlite3.connect('coach.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE games ADD COLUMN opening TEXT")
        print("Added 'opening' column.")
    except sqlite3.OperationalError as e:
        print(f"'opening' column error: {e}")
        
    try:
        cursor.execute("ALTER TABLE games ADD COLUMN eco TEXT")
        print("Added 'eco' column.")
    except sqlite3.OperationalError as e:
        print(f"'eco' column error: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == '__main__':
    migrate()
