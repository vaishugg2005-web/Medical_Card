EMQ-HS HOTFIX — ACCESS REQUESTS AND API ERRORS

This patch updates three files:
  backend/app/api/v1/access.py
  backend/app/schemas/access.py
  backend/app/static/index.html

HOW TO APPLY ON WINDOWS
1. Stop the running server with Ctrl+C in the terminal.
2. Extract this ZIP into your project root folder:
   C:\Users\LENOVO\Downloads\secure-emergency-medical-system\secure-emergency-medical-system
   Choose Extract All / overwrite the existing files when Windows asks.
   The extracted 'backend' folder should merge into your existing 'backend' folder.
3. Open PowerShell in that project root and run:
   cd backend
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
4. Open http://127.0.0.1:8000/app and test patient consent again.

The patch does not replace your database or the rest of your project.
It is a development prototype patch; do not use demo credentials or synthetic demo data in production.
