import os
import sqlite3
from sqlalchemy import event
from sqlalchemy.orm import Session
from app.database.session import engine, SessionLocal
from app.database.base import Base

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PATIENT_DB_PATH = os.path.join(BASE_DIR, "patient.db")
DOCTOR_DB_PATH = os.path.join(BASE_DIR, "doctor.db")
ADMIN_DB_PATH = os.path.join(BASE_DIR, "admin.db")

# Table domain groupings
PATIENT_TABLES = [
    "patients", "emergency_contacts", "allergies", "medications",
    "medical_conditions", "surgeries", "medical_visits", "prescriptions",
    "medical_documents", "qr_tokens", "consents", "consultation_requests",
    "medical_cards"
]

DOCTOR_TABLES = [
    "doctors", "hospitals", "doctor_verifications", "doctor_documents"
]

ADMIN_TABLES = [
    "users", "audit_logs", "emergency_access_events", "notifications", "access_requests"
]

def init_multidb_schemas():
    """Initializes schemas and syncs tables across patient.db, doctor.db, and admin.db."""
    for db_path in [PATIENT_DB_PATH, DOCTOR_DB_PATH, ADMIN_DB_PATH]:
        conn = sqlite3.connect(db_path)
        conn.close()

def sync_all_multidb():
    """Copies current state of tables from primary database to patient.db, doctor.db, and admin.db."""
    init_multidb_schemas()
    primary_db = os.path.join(BASE_DIR, "medical_system.db")
    if not os.path.exists(primary_db):
        return

    src_conn = sqlite3.connect(primary_db)
    src_conn.row_factory = sqlite3.Row
    src_cur = src_conn.cursor()

    # Sync patient.db
    p_conn = sqlite3.connect(PATIENT_DB_PATH)
    p_cur = p_conn.cursor()
    _sync_tables(src_cur, p_cur, p_conn, PATIENT_TABLES)
    p_conn.close()

    # Sync doctor.db
    d_conn = sqlite3.connect(DOCTOR_DB_PATH)
    d_cur = d_conn.cursor()
    _sync_tables(src_cur, d_cur, d_conn, DOCTOR_TABLES)
    d_conn.close()

    # Sync admin.db
    a_conn = sqlite3.connect(ADMIN_DB_PATH)
    a_cur = a_conn.cursor()
    _sync_tables(src_cur, a_cur, a_conn, ADMIN_TABLES)
    a_conn.close()

    src_conn.close()

def _sync_tables(src_cur, dest_cur, dest_conn, tables):
    for table in tables:
        src_cur.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
        row = src_cur.fetchone()
        if not row or not row[0]:
            continue
        create_sql = row[0]
        dest_cur.execute(f"DROP TABLE IF EXISTS {table}")
        dest_cur.execute(create_sql)

        # Copy data
        src_cur.execute(f"SELECT * FROM {table}")
        rows = src_cur.fetchall()
        if rows:
            cols = [col[0] for col in src_cur.description]
            placeholders = ",".join(["?"] * len(cols))
            dest_cur.executemany(f"INSERT INTO {table} ({','.join(cols)}) VALUES ({placeholders})", [tuple(r) for r in rows])
    dest_conn.commit()

# SQLAlchemy hook: whenever any session commits, synchronize patient.db, doctor.db, admin.db
@event.listens_for(Session, "after_commit")
def receive_after_commit(session):
    try:
        sync_all_multidb()
    except Exception as e:
        print(f"[MultiDB Warning] Failed to sync db: {e}")
