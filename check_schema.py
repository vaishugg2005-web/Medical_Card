import sqlite3

conn = sqlite3.connect('backend/medical_system.db')
cur = conn.cursor()

# List tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print("=== TABLES ===")
for t in tables:
    print(t[0])

print("\n=== consultation_requests COLUMNS ===")
try:
    cur.execute("PRAGMA table_info(consultation_requests)")
    cols = cur.fetchall()
    for c in cols:
        print(c)
except Exception as e:
    print(f"Error: {e}")

print("\n=== doctors COLUMNS ===")
try:
    cur.execute("PRAGMA table_info(doctors)")
    cols = cur.fetchall()
    for c in cols:
        print(c)
except Exception as e:
    print(f"Error: {e}")

print("\n=== users (sample) ===")
try:
    cur.execute("SELECT id, email, role FROM users LIMIT 5")
    rows = cur.fetchall()
    for r in rows:
        print(r)
except Exception as e:
    print(f"Error: {e}")

conn.close()
