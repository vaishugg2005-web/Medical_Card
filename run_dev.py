#!/usr/bin/env python3
"""
EMQ-HS Quick Launcher for Local Development & College Presentations.
Runs the complete full-stack system on port 8000 with automatic SQLite DB seeding.
"""
import os
import sys
import subprocess

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")

    print("\n" + "="*70)
    print("🏥 AI-POWERED SECURE EMERGENCY MEDICAL HISTORY ACCESS SYSTEM")
    print("   Zero-Trust Architecture & Break-Glass Triage Gateway")
    print("="*70)
    print("\n🌱 Starting backend server on http://localhost:8000 ...")
    print("📖 Swagger API Docs:  http://localhost:8000/docs")
    print("🖥️ Full-Stack Web UI: http://localhost:8000/app")
    print("\nDEMO ACCOUNTS (Pre-Seeded):")
    print("  👤 Patient:  patient@example.com / PatientDemo123!")
    print("  🩺 Doctor:   doctor@example.com  / DoctorDemo123!")
    print("  🔑 Admin:    admin@example.com   / AdminSecure123!")
    print("  🪪 QR Token: demo-emergency-token-9812")
    print("="*70 + "\n")

    os.environ["PYTHONPATH"] = backend_dir
    os.chdir(backend_dir)

    try:
        import uvicorn
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
    except ImportError:
        print("Installing required Python dependencies...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        import uvicorn
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    main()
