import sqlite3

try:
    conn = sqlite3.connect('d:/Community Chat room/The Main Project/football-chat-platform/backend/football_chat.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE users ADD COLUMN bio VARCHAR(255)")
    conn.commit()
    print("Added bio to users table")
except sqlite3.OperationalError as e:
    print(f"OperationalError: {e} (Bio might already exist)")
except Exception as e:
    print(f"Error: {e}")
finally:
    if conn:
        conn.close()
