"""
One-time migration script to add missing columns to the `doctors` table.
Run with: python migrate_doctors_table.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "medical_system.db")

migrations = [
    ("registration_authority", "ALTER TABLE doctors ADD COLUMN registration_authority VARCHAR(150) DEFAULT 'State Medical Council'"),
    ("state_jurisdiction",     "ALTER TABLE doctors ADD COLUMN state_jurisdiction VARCHAR(100) DEFAULT 'National'"),
    ("medical_qualification",  "ALTER TABLE doctors ADD COLUMN medical_qualification VARCHAR(100) DEFAULT 'MBBS'"),
    ("professional_address",   "ALTER TABLE doctors ADD COLUMN professional_address VARCHAR(255)"),
    ("years_of_experience",    "ALTER TABLE doctors ADD COLUMN years_of_experience INTEGER DEFAULT 5"),
    ("application_reference",  "ALTER TABLE doctors ADD COLUMN application_reference VARCHAR(100)"),
    ("rejection_reason",       "ALTER TABLE doctors ADD COLUMN rejection_reason TEXT"),
    ("information_requested",  "ALTER TABLE doctors ADD COLUMN information_requested TEXT"),
]

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Get existing columns
cur.execute("PRAGMA table_info(doctors)")
existing_cols = {row[1] for row in cur.fetchall()}
print(f"Existing columns: {existing_cols}\n")

applied = 0
for col_name, sql in migrations:
    if col_name in existing_cols:
        print(f"  SKIP  (already exists): {col_name}")
    else:
        cur.execute(sql)
        print(f"  ADDED: {col_name}")
        applied += 1

conn.commit()
conn.close()

print(f"\nMigration complete. {applied} column(s) added.")
