import pytest
from fastapi.testclient import TestClient

def test_patient_consultation_request_workflow(client: TestClient):
    # 1. Login as patient
    patient_res = client.post(
        "/api/v1/auth/login",
        json={"email": "patient@example.com", "password": "PatientDemo123!"}
    )
    assert patient_res.status_code == 200
    p_token = patient_res.json()["access_token"]
    p_headers = {"Authorization": f"Bearer {p_token}"}

    # 2. Get verified doctors list
    docs_res = client.get("/api/v1/patients/doctors/verified", headers=p_headers)
    assert docs_res.status_code == 200
    doctors = docs_res.json()
    assert len(doctors) > 0
    doc_id = doctors[0]["id"]

    # 3. Patient requests consultation
    create_res = client.post(
        "/api/v1/patients/me/consultations",
        headers=p_headers,
        json={
            "doctor_id": doc_id,
            "request_type": "CONSULTATION",
            "reason": "Cardiac consultation regarding chest tightness and palpitations",
            "preferred_date": "Tomorrow at 10:00 AM"
        }
    )
    assert create_res.status_code == 200
    req_data = create_res.json()
    assert req_data["status"] == "PENDING"
    assert req_data["reason"] == "Cardiac consultation regarding chest tightness and palpitations"
    req_id = req_data["id"]

    # 4. Doctor logs in and reviews consultation request
    doc_login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "doctor@example.com", "password": "DoctorDemo123!"}
    )
    assert doc_login_res.status_code == 200
    d_token = doc_login_res.json()["access_token"]
    d_headers = {"Authorization": f"Bearer {d_token}"}

    doc_reqs = client.get("/api/v1/doctors/me/consultations", headers=d_headers)
    assert doc_reqs.status_code == 200
    assert any(r["id"] == req_id for r in doc_reqs.json())

    # 5. Doctor accepts consultation with remarks
    respond_res = client.post(
        f"/api/v1/doctors/me/consultations/{req_id}/respond",
        headers=d_headers,
        json={
            "status": "ACCEPTED",
            "doctor_response": "Confirmed for tomorrow 10:00 AM in OPD Cardiology Room 4"
        }
    )
    assert respond_res.status_code == 200
    assert respond_res.json()["status"] == "ACCEPTED"
    assert "OPD Cardiology" in respond_res.json()["doctor_response"]

    # 6. Patient views updated consultation list
    p_reqs_res = client.get("/api/v1/patients/me/consultations", headers=p_headers)
    assert p_reqs_res.status_code == 200
    accepted_req = next(r for r in p_reqs_res.json() if r["id"] == req_id)
    assert accepted_req["status"] == "ACCEPTED"
