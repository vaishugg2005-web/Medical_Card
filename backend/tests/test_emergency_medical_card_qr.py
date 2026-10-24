import base64
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.medical_card import MedicalCard
from app.services.qr_service import QRService
from app.core.security import create_access_token

def test_emergency_medical_card_full_lifecycle(client: TestClient, db: Session):
    """
    Tests full Emergency Medical Card & QR lifecycle:
    1. Card retrieval & issue for patient.
    2. Unique card numbers and tokens per patient.
    3. Scannable high-contrast QR generation (Mode A & Mode B).
    4. Secure token QR contains only minimal opaque token (no medical data leakage).
    5. Token rotation invalidates previous token.
    6. Token revocation blocks scans.
    7. Public resolution Level 1 security barrier.
    8. Doctor scan permissions (verified vs unverified).
    """
    # 1. Authenticate patient
    patient = db.query(Patient).filter(Patient.user_id != None).first()
    assert patient is not None
    patient_token = create_access_token(subject=patient.user_id, role="PATIENT")
    patient_headers = {"Authorization": f"Bearer {patient_token}"}

    # 2. Issue / Retrieve Medical Card via GET & POST
    res_get = client.get("/api/v1/patients/me/medical-card", headers=patient_headers)
    assert res_get.status_code == 200, res_get.text
    card_data = res_get.json()
    assert card_data["card_status"] == "ACTIVE"
    assert card_data["patient_name"] == patient.full_name
    assert card_data["blood_group"] == patient.blood_group
    assert "MED-CARD-2026-" in card_data["card_number"]
    assert card_data["token_version"] >= 1
    assert card_data["raw_token_preview"] is not None

    # 3. Retrieve QR Code in Mode A (Default Secure Token)
    res_qr = client.get("/api/v1/patients/me/medical-card/qr?payload_mode=SECURE_TOKEN", headers=patient_headers)
    assert res_qr.status_code == 200, res_qr.text
    qr_json = res_qr.json()
    assert qr_json["payload_mode"] == "SECURE_TOKEN"
    assert qr_json["qr_image_base64"].startswith("data:image/png;base64,")
    
    # Verify QR image is valid base64 PNG
    img_b64 = qr_json["qr_image_base64"].split("base64,")[1]
    decoded_img = base64.b64decode(img_b64)
    assert decoded_img[:8] == b'\x89PNG\r\n\x1a\n', "Generated QR is not a valid PNG header"
    
    # Verify Mode A payload does not leak sensitive clinical data
    payload_preview = qr_json["payload_preview"]
    assert payload_preview["application"] == "Medora"
    assert payload_preview["version"] == 1
    assert "token" in payload_preview
    assert "critical_allergies" not in payload_preview
    assert "medications" not in payload_preview
    assert "diagnoses" not in payload_preview

    active_raw_token = qr_json["token"]

    # 4. Mode B (Encrypted Payload opt-in)
    res_mode_b = client.get("/api/v1/patients/me/medical-card/qr?payload_mode=ENCRYPTED_PAYLOAD", headers=patient_headers)
    assert res_mode_b.status_code == 200, res_mode_b.text
    mode_b_json = res_mode_b.json()
    assert mode_b_json["payload_mode"] == "ENCRYPTED_PAYLOAD"
    assert mode_b_json["payload_preview"]["application"] == "Medora"
    assert "card_id" in mode_b_json["payload_preview"]

    # Switch back to Mode A (default)
    client.get("/api/v1/patients/me/medical-card/qr?payload_mode=SECURE_TOKEN", headers=patient_headers)

    # 5. Public Resolution: Level 1 Minimal Safe Public Response
    res_resolve = client.get(f"/api/v1/medical-cards/resolve/{active_raw_token}")
    assert res_resolve.status_code == 200
    resolve_data = res_resolve.json()
    assert resolve_data["access_level"] == "LEVEL_1_PUBLIC"
    assert resolve_data["token_status"] == "ACTIVE"
    assert resolve_data["is_valid"] is True
    assert resolve_data["patient_name"] == patient.full_name
    assert resolve_data["requires_doctor_verification"] is True

    # 6. Doctor Scan by Verified Doctor
    verified_doctor = db.query(Doctor).filter(Doctor.verification_status == "VERIFIED").first()
    assert verified_doctor is not None
    doc_token = create_access_token(subject=verified_doctor.user_id, role="DOCTOR")
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    res_doc_scan = client.post(f"/api/v1/medical-cards/scan?token={active_raw_token}", headers=doc_headers)
    assert res_doc_scan.status_code == 200, res_doc_scan.text
    scan_json = res_doc_scan.json()
    assert scan_json["is_doctor_verified"] is True
    assert scan_json["patient_id"] == patient.id
    assert "REQUEST_NORMAL_ACCESS" in scan_json["available_actions"]
    assert "EMERGENCY_BREAK_GLASS" in scan_json["available_actions"]

    # 7. Doctor Scan by Unverified / Pending Doctor (MUST BE REJECTED 403)
    pending_doctor = db.query(Doctor).filter(Doctor.verification_status == "PENDING").first()
    if not pending_doctor:
        # Create or update a doctor to pending
        pending_doctor = Doctor(
            user_id=verified_doctor.user_id + 999,
            medical_license_number="TEST-PENDING-99",
            registration_authority="NMC",
            verification_status="PENDING",
            full_name="Dr. Unverified",
            specialization="General"
        )
        db.add(pending_doctor)
        db.commit()
    
    pending_token = create_access_token(subject=pending_doctor.user_id, role="DOCTOR")
    pending_headers = {"Authorization": f"Bearer {pending_token}"}

    res_unverified_scan = client.post(f"/api/v1/medical-cards/scan?token={active_raw_token}", headers=pending_headers)
    assert res_unverified_scan.status_code == 403
    assert "Card Scan Locked" in res_unverified_scan.json()["detail"]

    # 8. Token Rotation: Rotate Token & Verify Old Token is Invalidated
    res_rotate = client.post("/api/v1/patients/me/medical-card/rotate-token", headers=patient_headers)
    assert res_rotate.status_code == 200, res_rotate.text
    rotate_json = res_rotate.json()
    new_token = rotate_json["new_token"]
    assert new_token != active_raw_token
    assert rotate_json["card"]["token_version"] > card_data["token_version"]

    # Old token MUST now be REVOKED / fail
    res_old_resolve = client.get(f"/api/v1/medical-cards/resolve/{active_raw_token}")
    assert res_old_resolve.status_code == 200
    assert res_old_resolve.json()["token_status"] in ["REVOKED", "INVALID"]

    # Old token scanned by doctor MUST fail
    res_old_doc_scan = client.post(f"/api/v1/medical-cards/scan?token={active_raw_token}", headers=doc_headers)
    assert res_old_doc_scan.status_code in [400, 404]

    # New token resolves successfully
    res_new_resolve = client.get(f"/api/v1/medical-cards/resolve/{new_token}")
    assert res_new_resolve.status_code == 200
    assert res_new_resolve.json()["is_valid"] is True
    assert res_new_resolve.json()["token_status"] == "ACTIVE"

    # 9. Token Revocation
    res_revoke = client.post("/api/v1/patients/me/medical-card/revoke", headers=patient_headers)
    assert res_revoke.status_code == 200, res_revoke.text
    assert res_revoke.json()["status"] == "REVOKED"

    # Revoked token resolution fails is_valid
    res_revoked_resolve = client.get(f"/api/v1/medical-cards/resolve/{new_token}")
    assert res_revoked_resolve.status_code == 200
    assert res_revoked_resolve.json()["token_status"] == "REVOKED"
    assert res_revoked_resolve.json()["is_valid"] is False

    # 10. Regenerate Token After Revocation (by rotating again)
    res_regen = client.post("/api/v1/patients/me/medical-card/rotate-token", headers=patient_headers)
    assert res_regen.status_code == 200
    regen_token = res_regen.json()["new_token"]
    res_regen_resolve = client.get(f"/api/v1/medical-cards/resolve/{regen_token}")
    assert res_regen_resolve.status_code == 200
    assert res_regen_resolve.json()["is_valid"] is True
    assert res_regen_resolve.json()["token_status"] == "ACTIVE"
