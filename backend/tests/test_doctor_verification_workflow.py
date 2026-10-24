import pytest
from app.models.user import User
from app.models.doctor import Doctor, DoctorVerification
from app.models.patient import Patient
from app.models.audit import AuditLog

def test_full_doctor_verification_and_appointment_lifecycle(client, db):
    # 1. Register a new physician
    doc_reg_payload = {
        "email": "dr.verif.test@medora.health",
        "password": "Password123!",
        "full_name": "Dr. Verification Test",
        "phone": "+91 98765 11223",
        "medical_license_number": "MCI-TEST-99881",
        "registration_authority": "National Medical Commission",
        "state_jurisdiction": "Delhi",
        "medical_qualification": "MBBS, MD",
        "specialization": "Cardiology",
        "hospital_name": "AIIMS Trauma Center",
        "professional_address": "Ansari Nagar, New Delhi",
        "years_of_experience": 10
    }
    reg_resp = client.post("/api/v1/auth/register/doctor", json=doc_reg_payload)
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert reg_data["verification_status"] == "PENDING"
    assert "application_reference" in reg_data
    assert reg_data["application_reference"].startswith("DOC-APP-2026-")

    # Log in as newly registered doctor
    doc_login_resp = client.post("/api/v1/auth/login", json={
        "email": "dr.verif.test@medora.health",
        "password": "Password123!"
    })
    assert doc_login_resp.status_code == 200
    doc_token = doc_login_resp.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    # Verify doctor profile shows PENDING status
    doc_profile = client.get("/api/v1/doctors/me", headers=doc_headers).json()
    assert doc_profile["verification_status"] == "PENDING"
    new_doc_id = doc_profile["id"]

    # Log in as patient
    patient_login = client.post("/api/v1/auth/login", json={
        "email": "patient@example.com",
        "password": "PatientDemo123!"
    })
    assert patient_login.status_code == 200
    patient_token = patient_login.json()["access_token"]
    patient_headers = {"Authorization": f"Bearer {patient_token}"}

    # 2. Strict Security: Pending doctor must NOT appear in patient consultation directory
    dir_resp = client.get("/api/v1/patients/doctors", headers=patient_headers)
    assert dir_resp.status_code == 200
    directory_doctors = dir_resp.json()
    pending_ids = [d["id"] for d in directory_doctors if d["id"] == new_doc_id]
    assert len(pending_ids) == 0, "Pending doctor must NEVER appear in patient directory"

    # 3. Patient cannot book appointment with a PENDING doctor
    book_attempt = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": new_doc_id,
        "request_type": "CONSULTATION",
        "reason": "Chest pain checkup",
        "preferred_date": "2026-11-01",
        "consultation_mode": "IN_PERSON",
        "slot_time": "10:00 AM"
    })
    assert book_attempt.status_code == 400
    assert "cannot accept patient appointments" in book_attempt.json()["detail"]

    # 4. Doctor cannot approve their own application
    self_approve = client.post(f"/api/v1/admin/doctor-applications/{new_doc_id}/approve", headers=doc_headers, json={
        "notes": "Self approval attempt"
    })
    assert self_approve.status_code == 403, "Doctor cannot access administrator verification actions"

    # 5. Patient cannot approve doctor application
    patient_approve = client.post(f"/api/v1/admin/doctor-applications/{new_doc_id}/approve", headers=patient_headers, json={
        "notes": "Patient approval attempt"
    })
    assert patient_approve.status_code == 403, "Patient cannot access administrator verification actions"

    # Log in as Administrator
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@example.com",
        "password": "AdminSecure123!"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 6. Admin inspects application queue
    queue_resp = client.get("/api/v1/admin/doctor-applications", headers=admin_headers)
    assert queue_resp.status_code == 200
    queue_data = queue_resp.json()
    assert queue_data["counts"]["pending"] >= 1
    target_apps = [a for a in queue_data["items"] if a["id"] == new_doc_id]
    assert len(target_apps) == 1
    assert target_apps[0]["verification_status"] == "PENDING"

    # 7. Admin marks application UNDER_REVIEW
    review_resp = client.post(f"/api/v1/admin/doctor-applications/{new_doc_id}/review", headers=admin_headers, json={
        "notes": "Admin initiated NMC portal check"
    })
    assert review_resp.status_code == 200
    assert review_resp.json()["verification_status"] == "UNDER_REVIEW"

    # 8. Admin approves application
    approve_resp = client.post(f"/api/v1/admin/doctor-applications/{new_doc_id}/approve", headers=admin_headers, json={
        "notes": "NMC license cross-verified. Approved.",
        "verification_method": "NMC Public Medical Register"
    })
    assert approve_resp.status_code == 200
    assert approve_resp.json()["verification_status"] == "VERIFIED"

    # Verify audit trail recorded verification decision
    verif_history = db.query(DoctorVerification).filter(DoctorVerification.doctor_id == new_doc_id).all()
    assert len(verif_history) >= 2  # Registration + Under Review + Approved

    # 9. Approved doctor now appears in patient consultation directory
    dir_after = client.get("/api/v1/patients/doctors", headers=patient_headers)
    assert dir_after.status_code == 200
    active_docs = dir_after.json()
    verified_match = [d for d in active_docs if d["id"] == new_doc_id]
    assert len(verified_match) == 1
    assert verified_match[0]["verification_status"] == "VERIFIED"

    # Search filter test
    search_resp = client.get("/api/v1/patients/doctors?search=Verification", headers=patient_headers)
    assert search_resp.status_code == 200
    assert len(search_resp.json()) >= 1

    # 10. Patient successfully books appointment with now-verified doctor
    book_resp = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": new_doc_id,
        "request_type": "CONSULTATION",
        "reason": "Annual cardiovascular checkup",
        "preferred_date": "2026-11-15",
        "consultation_mode": "IN_PERSON",
        "slot_time": "11:30 AM"
    })
    assert book_resp.status_code == 200
    appt_data = book_resp.json()
    appt_id = appt_data["id"]
    assert appt_data["status"] == "PENDING"
    assert appt_data["consultation_mode"] == "IN_PERSON"
    assert appt_data["slot_time"] == "11:30 AM"

    # 11. Conflicting booking for the same slot must be rejected (409 Conflict)
    conflict_resp = client.post("/api/v1/appointments", headers=patient_headers, json={
        "doctor_id": new_doc_id,
        "request_type": "CONSULTATION",
        "reason": "Duplicate time slot attempt",
        "preferred_date": "2026-11-15",
        "consultation_mode": "IN_PERSON",
        "slot_time": "11:30 AM"
    })
    assert conflict_resp.status_code == 409

    # 12. Doctor views appointment in their queue and accepts it
    doc_appts = client.get("/api/v1/appointments/doctor", headers=doc_headers)
    assert doc_appts.status_code == 200
    my_appts = doc_appts.json()
    assert any(a["id"] == appt_id for a in my_appts)

    accept_resp = client.post(f"/api/v1/appointments/{appt_id}/accept", headers=doc_headers, json={
        "doctor_response": "Appointment confirmed. Please bring previous ECG records."
    })
    assert accept_resp.status_code == 200
    assert accept_resp.json()["status"] == "CONFIRMED"

    # 13. Patient sees appointment confirmed
    pat_appts = client.get("/api/v1/appointments/patient", headers=patient_headers)
    assert pat_appts.status_code == 200
    confirmed_appt = next(a for a in pat_appts.json() if a["id"] == appt_id)
    assert confirmed_appt["status"] == "CONFIRMED"
    assert "ECG" in confirmed_appt["doctor_response"]

    # 14. Booking does NOT automatically grant medical record access (Zero-Trust)
    pat_record_attempt = client.get(f"/api/v1/doctors/patients/{confirmed_appt['patient_id']}/full-record", headers=doc_headers)
    assert pat_record_attempt.status_code == 403, "Appointment booking must NOT grant clinical record access without explicit consent"
    assert "Level 2 Patient Consent" in pat_record_attempt.json()["detail"]

    # 15. Admin suspends doctor
    suspend_resp = client.post(f"/api/v1/admin/doctors/{new_doc_id}/suspend", headers=admin_headers, json={
        "notes": "Temporary suspension for audit"
    })
    assert suspend_resp.status_code == 200
    assert suspend_resp.json()["verification_status"] == "SUSPENDED"

    # Suspended doctor is immediately removed from patient directory
    dir_suspended = client.get("/api/v1/patients/doctors", headers=patient_headers)
    assert not any(d["id"] == new_doc_id for d in dir_suspended.json())
