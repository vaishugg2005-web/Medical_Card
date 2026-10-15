from app.core.config import settings

def test_audit_logs_recorded_and_viewable_by_admin(client):
    # 1. Trigger an action (login)
    client.post("/api/v1/auth/login", json={
        "email": "doctor@example.com",
        "password": settings.DEMO_DOCTOR_PASSWORD
    })

    # 2. Login as Admin
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@example.com",
        "password": settings.DEMO_ADMIN_PASSWORD
    })
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Fetch Audit Logs
    res = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
    assert any(l["action"] == "LOGIN" for l in logs)
