from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_patient, get_current_doctor, get_client_telemetry
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.access import QRToken
from app.schemas.qr import QRGenerateResponse, QRResolvePublicResponse, QRCardData
from app.services.qr_service import QRService
from app.services.audit_service import AuditService
from app.core.rbac import AuditAction, AccessLevel, DoctorVerificationStatus

router = APIRouter()

@router.post("/generate", response_model=QRGenerateResponse)
def generate_patient_qr(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient only) Generates or rotates the opaque secure QR emergency token.
    Rotates previous tokens to ensure zero replay attacks.
    """
    token_obj = QRService.generate_token_for_patient(db, patient)
    qr_b64 = QRService.generate_qr_image_base64(token_obj.token_hash)

    AuditService.log_event(
        db=db,
        action=AuditAction.QR_GENERATED.value,
        actor_id=patient.user_id,
        patient_id=patient.id,
        reason="Patient generated/rotated emergency QR token",
        details=f"Token {token_obj.token_hash}"
    )

    return QRGenerateResponse(
        token=token_obj.token_hash,
        qr_image_base64=qr_b64,
        issued_at=token_obj.issued_at,
        expires_at=token_obj.expires_at,
        resolve_url=f"/qr/{token_obj.token_hash}"
    )

@router.get("/card", response_model=QRCardData)
def get_physical_card_data(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient only) Provides data for printing/downloading the physical medical card.
    Contains non-sensitive identifiers and the secure opaque QR code.
    """
    active_token = db.query(QRToken).filter(
        QRToken.patient_id == patient.id,
        QRToken.status == "ACTIVE"
    ).first()

    if not active_token:
        active_token = QRService.generate_token_for_patient(db, patient)

    qr_b64 = QRService.generate_qr_image_base64(active_token.token_hash)
    primary_contact = patient.emergency_contacts[0] if patient.emergency_contacts else None

    return QRCardData(
        patient_name=patient.full_name,
        unique_patient_id=patient.unique_patient_id,
        blood_group_masked=patient.blood_group,  # Visible on physical card badge
        qr_image_base64=qr_b64,
        token=active_token.token_hash,
        emergency_instructions=patient.emergency_instructions or "In case of emergency, scan QR code using authorized healthcare system or hospital portal.",
        emergency_contact_name=primary_contact.contact_name if primary_contact else None,
        emergency_contact_phone=primary_contact.phone_encrypted if primary_contact else None
    )

@router.get("/resolve/{token}", response_model=QRResolvePublicResponse)
def resolve_qr_public(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    LEVEL 1 — PUBLIC / MINIMAL QR RESPONSE.
    Unauthenticated public scan endpoint.
    CRUCIAL SECURITY RULE: NEVER EXPOSES MEDICAL RECORDS.
    Returns only patient name, emergency identifier, and notice that doctor auth is required.
    """
    client_ip, user_agent = get_client_telemetry(request)
    qr_token = QRService.validate_token(db, token)

    if not qr_token:
        AuditService.log_event(
            db=db,
            action=AuditAction.QR_SCANNED.value,
            reason="Attempted scan of invalid or expired QR token",
            access_scope=AccessLevel.LEVEL_1_PUBLIC.value,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired QR token. Please verify the physical medical card."
        )

    patient = db.query(Patient).filter(Patient.id == qr_token.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient record not found.")

    AuditService.log_event(
        db=db,
        action=AuditAction.QR_SCANNED.value,
        patient_id=patient.id,
        reason="Public Level 1 QR scan executed",
        access_scope=AccessLevel.LEVEL_1_PUBLIC.value,
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    return QRResolvePublicResponse(
        access_level=AccessLevel.LEVEL_1_PUBLIC.value,
        token=token,
        patient_name=patient.full_name,
        unique_patient_id=patient.unique_patient_id,
        emergency_contact_available=len(patient.emergency_contacts) > 0,
        requires_doctor_verification=True,
        message="Verified healthcare provider login required to access medical information. No medical data is exposed publicly."
    )

@router.post("/doctor-scan/{token}")
def doctor_scan_qr(
    token: str,
    request: Request,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Doctor portal QR scan.
    Identifies patient and checks verification status.
    Does NOT reveal medical history until Normal Access (with consent) or Emergency Break-Glass is chosen.
    """
    client_ip, user_agent = get_client_telemetry(request)
    qr_token = QRService.validate_token(db, token)

    if not qr_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired QR token.")

    patient = db.query(Patient).filter(Patient.id == qr_token.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    AuditService.log_event(
        db=db,
        action=AuditAction.QR_SCANNED.value,
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else None,
        actor_role="DOCTOR",
        patient_id=patient.id,
        reason=f"Doctor scanned patient QR (Doctor status: {doctor.verification_status})",
        access_scope="DOCTOR_PORTAL_SCAN",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    is_verified = (doctor.verification_status == DoctorVerificationStatus.VERIFIED.value)
    if not is_verified:
        AuditService.log_event(
            db=db,
            action=AuditAction.ACCESS_DENIED.value,
            actor_id=doctor.user_id,
            actor_email=doctor.user.email if doctor.user else None,
            actor_role="DOCTOR",
            patient_id=patient.id,
            reason=f"Unverified doctor attempted QR card scan (status: {doctor.verification_status})",
            ip_address=client_ip,
            user_agent=user_agent,
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Card Scan Locked: Your account status is '{doctor.verification_status}'. Only official verified members whose license credentials and degree certificates have been approved by hospital administration can scan patient medical cards."
        )

    return {
        "token": token,
        "patient_id": patient.id,
        "patient_name": patient.full_name,
        "unique_patient_id": patient.unique_patient_id,
        "doctor_verification_status": doctor.verification_status,
        "is_doctor_verified": True,
        "available_actions": [
            "REQUEST_NORMAL_ACCESS",
            "EMERGENCY_BREAK_GLASS"
        ],
        "notice": "Medical records are protected. Select access method to proceed."
    }
