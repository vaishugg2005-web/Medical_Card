import sqlite3
import os

dbs = ['patient.db', 'doctor.db', 'admin.db', 'medical_system.db']
base_dir = os.path.dirname(os.path.abspath(__file__))

for db_name in dbs:
    db_path = os.path.join(base_dir, db_name)
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        print(f"\n--- {db_name} (Size: {os.path.getsize(db_path)} bytes) ---")
        for t in tables:
            count = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            print(f"  • {t}: {count} records")
        conn.close()
    else:
        print(f"{db_name} not found")
