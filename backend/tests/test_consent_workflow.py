import pytest
from app.core.config import settings

def test_full_consent_workflow(client):
    # 1. Login as verified doctor
    doc_login = client.post("/api/v1/auth/login", json={
        "email": "doctor@example.com",
        "password": settings.DEMO_DOCTOR_PASSWORD
    })
    assert doc_login.status_code == 200, f"Doctor login failed: {doc_login.text}"
    doc_token = doc_login.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    # 2. Login as patient
    pat_login = client.post("/api/v1/auth/login", json={
        "email": "patient@example.com",
        "password": settings.DEMO_PATIENT_PASSWORD
    })
    assert pat_login.status_code == 200, f"Patient login failed: {pat_login.text}"
    pat_token = pat_login.json()["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}

    # Fetch patient profile to get patient ID
    pat_profile = client.get("/api/v1/patients/me", headers=pat_headers)
    assert pat_profile.status_code == 200
    patient_id = pat_profile.json()["id"]

    # 3. Doctor submits an access request
    req_resp = client.post(
        "/api/v1/access/request",
        headers=doc_headers,
        json={
            "patient_id": patient_id,
            "reason": "Routine consultation and cardiology checkup"
        }
    )
    assert req_resp.status_code == 200, f"Access request failed: {req_resp.text}"
    req_data = req_resp.json()
    request_id = req_data["id"]
    assert req_data["status"] == "PENDING"
    assert req_data["patient_name"] is not None

    # 4. Doctor checks their requests list
    doc_requests = client.get("/api/v1/access/requests/doctor", headers=doc_headers)
    assert doc_requests.status_code == 200
    requests_list = doc_requests.json()
    assert any(r["id"] == request_id for r in requests_list)

    # 5. Patient views pending requests
    pending = client.get("/api/v1/access/requests/pending", headers=pat_headers)
    assert pending.status_code == 200
    pending_list = pending.json()
    assert any(p["id"] == request_id for p in pending_list)

    # 6. Patient approves the request
    review_resp = client.post(
        f"/api/v1/access/requests/{request_id}/review",
        headers=pat_headers,
        json={"status": "APPROVED"}
    )
    assert review_resp.status_code == 200, f"Review failed: {review_resp.text}"

    # 7. Doctor checks non-destructive status endpoint
    status_check = client.get(f"/api/v1/access/status/{patient_id}", headers=doc_headers)
    assert status_check.status_code == 200
    status_info = status_check.json()
    assert status_info["has_active_consent"] is True
    assert status_info["status"] == "APPROVED"

    # 8. Doctor now retrieves the normal medical records -> HTTP 200
    post_access = client.get(f"/api/v1/access/normal/{patient_id}", headers=doc_headers)
    assert post_access.status_code == 200, f"Access failed after approval: {post_access.text}"
    records = post_access.json()
    assert "allergies" in records
    assert "medications" in records
    assert "conditions" in records
    assert records["patient_id"] == patient_id
