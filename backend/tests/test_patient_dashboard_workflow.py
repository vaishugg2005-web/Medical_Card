import pytest
from app.models.patient import Patient
from app.models.notification import Notification

def test_full_patient_dashboard_workflow(client, db):
    # 1. Patient Registration via API
    reg_payload = {
        "email": "new.patient.test@medora.health",
        "password": "Password123!",
        "full_name": "Oliver Queen",
        "phone": "+91 99887 66554",
        "address": "Star City Medical District",
        "blood_group": "AB+",
        "date_of_birth": "1990-05-16",
        "gender": "Male",
        "emergency_contact_name": "Felicity Smoak",
        "emergency_contact_phone": "+91 99887 11223",
        "emergency_contact_relationship": "Spouse",
        "organ_donor": True,
        "dnr_status": False
    }
    reg_resp = client.post("/api/v1/auth/register/patient", json=reg_payload)
    assert reg_resp.status_code == 201
    token_data = reg_resp.json()
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    patient_id = token_data["patient_id"]

    # 2. Fetch Profile & Completeness
    profile_resp = client.get("/api/v1/patients/me", headers=headers)
    assert profile_resp.status_code == 200
    p_data = profile_resp.json()
    assert p_data["full_name"] == "Oliver Queen"
    assert p_data["blood_group"] == "AB+"

    comp_resp = client.get("/api/v1/patients/me/completeness", headers=headers)
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert comp_data["score"] >= 80
    assert "Legal Full Name" in comp_data["completed_fields"]

    # 3. Permitted Personal Profile Editing
    update_resp = client.put("/api/v1/patients/me", headers=headers, json={
        "phone": "+91 99887 00000",
        "address": "456 Queen Manor, Star City",
        "emergency_instructions": "Speaks English, allergic to penicillin"
    })
    assert update_resp.status_code == 200
    updated_p = update_resp.json()
    assert updated_p["phone"] == "+91 99887 00000"
    assert updated_p["address"] == "456 Queen Manor, Star City"
    # Blood group is not changed by normal patient update if protected
    assert updated_p["blood_group"] == "AB+"

    # 4. Retrieve Medical History, Allergies, Medications, Conditions
    allg_resp = client.get("/api/v1/patients/me/allergies", headers=headers)
    assert allg_resp.status_code == 200
    assert isinstance(allg_resp.json(), list)

    med_resp = client.get("/api/v1/patients/me/medications", headers=headers)
    assert med_resp.status_code == 200

    cond_resp = client.get("/api/v1/patients/me/conditions", headers=headers)
    assert cond_resp.status_code == 200

    # 5. Ground-Truth AI Clinical Summary
    ai_resp = client.get("/api/v1/patients/me/ai-summary", headers=headers)
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()
    assert "AB+" in ai_data.get("blood_group", "")

    # 6. Verified Doctor Directory Discovery
    doc_resp = client.get("/api/v1/patients/doctors", headers=headers)
    assert doc_resp.status_code == 200
    verified_docs = doc_resp.json()
    assert len(verified_docs) > 0
    test_doc = verified_docs[0]
    assert test_doc["verification_status"] == "VERIFIED"

    # Search filter testing
    doc_search = client.get(f"/api/v1/patients/doctors?search={test_doc['full_name'][:4]}", headers=headers)
    assert doc_search.status_code == 200
    assert len(doc_search.json()) >= 1

    # Non-matching filter returns empty list (triggering frontend no-doctor message)
    doc_empty = client.get("/api/v1/patients/doctors?specialization=NonExistentSpecialtyXYZ", headers=headers)
    assert doc_empty.status_code == 200
    assert len(doc_empty.json()) == 0

    # 7. Appointment Request Submission
    appt_resp = client.post("/api/v1/appointments", headers=headers, json={
        "doctor_id": test_doc["id"],
        "request_type": "CONSULTATION",
        "reason": "Routine fitness examination",
        "preferred_date": "2026-11-20",
        "consultation_mode": "IN_PERSON",
        "slot_time": "09:00 AM"
    })
    assert appt_resp.status_code == 200
    appt = appt_resp.json()
    assert appt["status"] == "PENDING"
    assert appt["slot_time"] == "09:00 AM"
    appt_id = appt["id"]

    # 8. Patient can view and cancel appointment
    my_appts = client.get("/api/v1/appointments/patient", headers=headers)
    assert my_appts.status_code == 200
    assert any(a["id"] == appt_id for a in my_appts.json())

    cancel_resp = client.post(f"/api/v1/appointments/{appt_id}/cancel", headers=headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    # 9. Notifications and Mark All Read
    notif_resp = client.get("/api/v1/patients/me/notifications", headers=headers)
    assert notif_resp.status_code == 200

    read_all = client.post("/api/v1/patients/me/notifications/read-all", headers=headers)
    assert read_all.status_code == 200

    # 10. Access History & Audit Trail
    hist_resp = client.get("/api/v1/patients/me/access-history", headers=headers)
    assert hist_resp.status_code == 200
    assert isinstance(hist_resp.json(), list)

    # 11. Password Change
    pwd_resp = client.post("/api/v1/patients/me/change-password", headers=headers, json={
        "current_password": "Password123!",
        "new_password": "NewSecretPassword456!"
    })
    assert pwd_resp.status_code == 200
    assert pwd_resp.json()["status"] == "success"

    # Re-login with new password
    new_login = client.post("/api/v1/auth/login", json={
        "email": "new.patient.test@medora.health",
        "password": "NewSecretPassword456!"
    })
    assert new_login.status_code == 200
