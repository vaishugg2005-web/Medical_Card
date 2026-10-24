import os
import sqlite3
from sqlalchemy import inspect
from app.database.base import Base
import app.models  # ensure all models are registered

def get_column_sql_type(col):
    col_type = str(col.type).upper()
    if "INT" in col_type:
        return "INTEGER"
    elif "BOOL" in col_type:
        return "BOOLEAN"
    elif "FLOAT" in col_type or "NUMERIC" in col_type or "DECIMAL" in col_type:
        return "REAL"
    elif "DATE" in col_type or "TIME" in col_type:
        return "DATETIME"
    else:
        return "TEXT"

def migrate_db(db_path_or_engine):
    """
    Inspects a SQLite database (file path or SQLAlchemy engine) and automatically
    adds any missing columns declared in SQLAlchemy models.
    """
    if hasattr(db_path_or_engine, "connect"):
        insp = inspect(db_path_or_engine)
        for table_name, table in Base.metadata.tables.items():
            if not insp.has_table(table_name):
                continue
            existing_cols = {c["name"] for c in insp.get_columns(table_name)}
            for col in table.columns:
                if col.name not in existing_cols:
                    sql_type = get_column_sql_type(col)
                    try:
                        with db_path_or_engine.begin() as conn:
                            from sqlalchemy import text
                            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {sql_type}"))
                        print(f"[MIGRATION] Added column {table_name}.{col.name} ({sql_type})")
                    except Exception as e:
                        print(f"[MIGRATION ERROR] Could not add {table_name}.{col.name}: {e}")
    else:
        db_path = str(db_path_or_engine)
        if not os.path.exists(db_path):
            return
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {r[0] for r in cur.fetchall()}
        for table_name, table in Base.metadata.tables.items():
            if table_name not in tables:
                continue
            cur.execute(f"PRAGMA table_info({table_name})")
            existing_cols = {r[1] for r in cur.fetchall()}
            for col in table.columns:
                if col.name not in existing_cols:
                    sql_type = get_column_sql_type(col)
                    try:
                        cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {sql_type}")
                        conn.commit()
                        print(f"[MIGRATION] Added {table_name}.{col.name} to {db_path}")
                    except Exception as e:
                        print(f"[MIGRATION ERROR] Could not add {table_name}.{col.name} to {db_path}: {e}")
        conn.close()

def auto_migrate_all():
    """Migrates the primary engine and all localized SQLite databases."""
    from app.database.session import engine
    migrate_db(engine)

    # Check common db locations
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    root_dir = os.path.dirname(base_dir)
    
    candidate_paths = [
        os.path.join(base_dir, "medical_system.db"),
        os.path.join(base_dir, "patient.db"),
        os.path.join(base_dir, "doctor.db"),
        os.path.join(base_dir, "admin.db"),
        os.path.join(root_dir, "medical_system.db"),
    ]
    for path in candidate_paths:
        if os.path.exists(path):
            migrate_db(path)
