from app.core.config import settings

def test_break_glass_by_verified_doctor_success(client):
    # 1. Login as Verified Doctor
    login_res = client.post("/api/v1/auth/login", json={
        "email": "doctor@example.com",
        "password": settings.DEMO_DOCTOR_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Execute Emergency Break-Glass
    res = client.post("/api/v1/access/emergency", json={
        "qr_token": "demo-emergency-token-9812",
        "hospital_name": "Metropolitan Trauma Emergency",
        "reason_category": "Unconscious Trauma",
        "free_text_justification": "Patient unconscious in motor vehicle collision. Unresponsive, urgent surgical triage required.",
        "patient_consent_incapacitated": True
    }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert data["access_level"] == "LEVEL_3_BREAK_GLASS"
    assert data["blood_group"] == "O+"
    assert len(data["severe_allergies"]) >= 1
    assert any("Penicillin" in a["allergen"] for a in data["severe_allergies"])
    assert any("Warfarin" in m["medicine_name"] for m in data["critical_medications"])
    assert "ai_summary" in data
    assert "break_glass_warning" in data
    assert "session_token" in data

def test_break_glass_by_unverified_doctor_rejected(client):
    # Login as Pending Doctor
    login_res = client.post("/api/v1/auth/login", json={
        "email": "pending.doctor@example.com",
        "password": settings.DEMO_DOCTOR_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt Break-Glass
    res = client.post("/api/v1/access/emergency", json={
        "qr_token": "demo-emergency-token-9812",
        "hospital_name": "Clinic",
        "reason_category": "Emergency",
        "free_text_justification": "Trying to bypass verification",
        "patient_consent_incapacitated": True
    }, headers=headers)

    assert res.status_code == 403
    assert "Only VERIFIED medical personnel can activate emergency access" in res.json()["detail"]

def test_break_glass_missing_justification_rejected(client):
    login_res = client.post("/api/v1/auth/login", json={
        "email": "doctor@example.com",
        "password": settings.DEMO_DOCTOR_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt with empty reason
    res = client.post("/api/v1/access/emergency", json={
        "qr_token": "demo-emergency-token-9812",
        "hospital_name": "Hospital",
        "reason_category": "Emergency",
        "free_text_justification": "",  # Empty
        "patient_consent_incapacitated": True
    }, headers=headers)

    assert res.status_code == 400
    assert "justification is mandatory" in res.json()["detail"]
