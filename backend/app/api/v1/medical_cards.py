from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_patient, get_current_doctor, get_client_telemetry
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.medical_card import MedicalCard
from app.schemas.medical_card import (
    MedicalCardResponse,
    MedicalCardQRResponse,
    RotateTokenResponse,
    RevokeCardResponse,
    CardResolveResponse,
    DoctorCardScanResponse
)
from app.services.qr_service import QRService
from app.services.audit_service import AuditService
from app.core.rbac import AuditAction, AccessLevel, DoctorVerificationStatus

router = APIRouter()

def build_card_response(card: MedicalCard, patient: Patient) -> MedicalCardResponse:
    primary_contact = patient.emergency_contacts[0] if patient.emergency_contacts else None
    return MedicalCardResponse(
        id=card.id,
        card_uuid=card.card_uuid,
        card_number=card.card_number,
        patient_id=card.patient_id,
        card_status=card.card_status,
        payload_mode=card.payload_mode,
        payload_schema_version=card.payload_schema_version,
        raw_token_preview=card.raw_token_preview,
        token_version=card.token_version,
        issued_at=card.issued_at,
        expires_at=card.expires_at,
        revoked_at=card.revoked_at,
        last_updated_at=card.last_updated_at,
        issued_by_actor=card.issued_by_actor,
        triage_classification=card.triage_classification,
        emergency_notes=card.emergency_notes,
        patient_name=patient.full_name,
        unique_patient_id=patient.unique_patient_id,
        blood_group=patient.blood_group,
        emergency_contact_phone=primary_contact.phone_encrypted if primary_contact else patient.phone,
        emergency_contact_name=primary_contact.contact_name if primary_contact else None,
        emergency_instructions=patient.emergency_instructions
    )

@router.post("", response_model=MedicalCardResponse)
@router.post("/", response_model=MedicalCardResponse)
def issue_or_get_medical_card(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient only) Generates an active emergency medical card or retrieves the existing active one.
    """
    card, _ = QRService.generate_or_get_card(db, patient, force_rotate=False, actor_name=f"PATIENT:{patient.unique_patient_id}")
    return build_card_response(card, patient)

@router.get("", response_model=MedicalCardResponse)
@router.get("/", response_model=MedicalCardResponse)
def get_my_medical_card(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient only) Retrieves the active medical card details, token validity, and timestamps.
    """
    card, _ = QRService.generate_or_get_card(db, patient, force_rotate=False)
    return build_card_response(card, patient)

@router.get("/qr", response_model=MedicalCardQRResponse)
def get_my_medical_card_qr(
    payload_mode: Optional[str] = Query("SECURE_TOKEN", pattern="^(SECURE_TOKEN|ENCRYPTED_PAYLOAD)$"),
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient only) Generates the high-contrast QR image data URI for the patient's card.
    Supports Mode A (SECURE_TOKEN - default) and Mode B (ENCRYPTED_PAYLOAD - opt-in authenticated encryption).
    """
    card, raw_token = QRService.generate_or_get_card(db, patient, force_rotate=False)
    
    # Update payload mode if changed
    if payload_mode and card.payload_mode != payload_mode:
        card.payload_mode = payload_mode
        db.commit()
        db.refresh(card)

    payload_string, payload_dict = QRService.build_qr_payload(patient, raw_token, payload_mode=card.payload_mode)
    qr_b64 = QRService.generate_qr_image_base64(payload_string)

    return MedicalCardQRResponse(
        card=build_card_response(card, patient),
        qr_image_base64=qr_b64,
        token=raw_token,
        payload_mode=card.payload_mode,
        payload_preview=payload_dict,
        resolve_url=f"/qr/{raw_token}"
    )

@router.post("/rotate-token", response_model=RotateTokenResponse)
def rotate_my_card_token(
    request: Request,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient only) Revokes previous token and issues a fresh cryptographically random card token.
    Prevents token replay attacks if physical card was compromised or replaced.
    """
    client_ip, user_agent = get_client_telemetry(request)
    card, raw_token = QRService.generate_or_get_card(
        db,
        patient,
        force_rotate=True,
        actor_name=f"PATIENT:{patient.unique_patient_id}"
    )

    payload_string, _ = QRService.build_qr_payload(patient, raw_token, payload_mode=card.payload_mode)
    qr_b64 = QRService.generate_qr_image_base64(payload_string)

    AuditService.log_event(
        db=db,
        action=AuditAction.QR_GENERATED.value,
        actor_id=patient.user_id,
        patient_id=patient.id,
        reason="Patient rotated emergency medical card token",
        details=f"New Card Version: {card.token_version}, Card Number: {card.card_number}",
        ip_address=client_ip,
        user_agent=user_agent
    )

    return RotateTokenResponse(
        message="Emergency medical card token successfully rotated. Previous tokens are now invalid.",
        new_token=raw_token,
        card=build_card_response(card, patient),
        qr_image_base64=qr_b64
    )

@router.post("/revoke", response_model=RevokeCardResponse)
def revoke_my_card_token(
    request: Request,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient only) Revokes the active card token immediately.
    Revoked cards fail resolution and cannot be scanned for emergency access.
    """
    client_ip, user_agent = get_client_telemetry(request)
    card = QRService.revoke_card(db, patient)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active medical card found to revoke.")

    AuditService.log_event(
        db=db,
        action="TOKEN_REVOKED",
        actor_id=patient.user_id,
        patient_id=patient.id,
        reason="Patient revoked emergency medical card",
        details=f"Card Number: {card.card_number}",
        ip_address=client_ip,
        user_agent=user_agent
    )

    return RevokeCardResponse(
        message="Emergency medical card has been revoked. Scans will fail until a new token is generated.",
        card_number=card.card_number,
        revoked_at=card.revoked_at,
        status=card.card_status
    )

# Public resolution & Doctor scanning routes
resolution_router = APIRouter()

@resolution_router.get("/resolve/{token}", response_model=CardResolveResponse)
def resolve_medical_card(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    PUBLIC RESOLUTION: Level 1 Minimal Safe Public Response.
    Never exposes medical records, clinical diagnoses, or full history.
    Validates token, checks revocation/expiry, and returns minimal identification.
    """
    client_ip, user_agent = get_client_telemetry(request)
    validation = QRService.validate_card_token(db, token)

    if not validation:
        AuditService.log_event(
            db=db,
            action=AuditAction.QR_SCANNED.value,
            reason="Scanned token was not found or has invalid structure",
            access_scope=AccessLevel.LEVEL_1_PUBLIC.value,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False
        )
        return CardResolveResponse(
            access_level=AccessLevel.LEVEL_1_PUBLIC.value,
            token_status="INVALID",
            is_valid=False,
            requires_doctor_verification=True,
            message="Invalid or unrecognized emergency card token."
        )

    patient, card_status, card_identifier = validation

    if card_status == "REVOKED":
        AuditService.log_event(
            db=db,
            action=AuditAction.ACCESS_DENIED.value,
            patient_id=patient.id,
            reason=f"Attempted scan of REVOKED card token ({card_identifier})",
            access_scope=AccessLevel.LEVEL_1_PUBLIC.value,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False
        )
        return CardResolveResponse(
            access_level=AccessLevel.LEVEL_1_PUBLIC.value,
            token_status="REVOKED",
            is_valid=False,
            patient_name=patient.full_name,
            card_number=card_identifier,
            unique_patient_id=patient.unique_patient_id,
            requires_doctor_verification=True,
            message="This emergency card has been REVOKED by the patient. Scans are disabled."
        )

    if card_status == "EXPIRED":
        AuditService.log_event(
            db=db,
            action=AuditAction.ACCESS_DENIED.value,
            patient_id=patient.id,
            reason=f"Attempted scan of EXPIRED card token ({card_identifier})",
            access_scope=AccessLevel.LEVEL_1_PUBLIC.value,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False
        )
        return CardResolveResponse(
            access_level=AccessLevel.LEVEL_1_PUBLIC.value,
            token_status="EXPIRED",
            is_valid=False,
            patient_name=patient.full_name,
            card_number=card_identifier,
            unique_patient_id=patient.unique_patient_id,
            requires_doctor_verification=True,
            message="This emergency medical card token has EXPIRED. Patient renewal required."
        )

    # Valid ACTIVE card
    AuditService.log_event(
        db=db,
        action=AuditAction.QR_SCANNED.value,
        patient_id=patient.id,
        reason=f"Public Level 1 emergency card resolution ({card_identifier})",
        access_scope=AccessLevel.LEVEL_1_PUBLIC.value,
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    return CardResolveResponse(
        access_level=AccessLevel.LEVEL_1_PUBLIC.value,
        token_status="ACTIVE",
        is_valid=True,
        patient_name=patient.full_name,
        card_number=card_identifier,
        unique_patient_id=patient.unique_patient_id,
        requires_doctor_verification=True,
        message="Valid Medora Emergency Medical Card. Verified physician authentication required to unlock medical records."
    )

@resolution_router.post("/scan", response_model=DoctorCardScanResponse)
def doctor_scan_medical_card(
    token: str = Query(..., description="Scanned token or payload string"),
    request: Request = None,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    DOCTOR SCAN ENDPOINT:
    Executed from the Doctor Portal QR scanner.
    Checks doctor verification status. If doctor is unverified, access is forbidden.
    If valid, returns patient identification and prompts for Level 2 (Consent) or Level 3 (Emergency Break-Glass).
    """
    client_ip, user_agent = get_client_telemetry(request)
    validation = QRService.validate_card_token(db, token)

    if not validation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scanned emergency card token is invalid or does not exist."
        )

    patient, card_status, card_identifier = validation

    if card_status == "REVOKED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security Alert: This emergency card token has been REVOKED by the patient."
        )

    if card_status == "EXPIRED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card Expired: This emergency card token has expired."
        )

    # Verify doctor licensure status
    is_verified = (doctor.verification_status == DoctorVerificationStatus.VERIFIED.value)
    if not is_verified:
        AuditService.log_event(
            db=db,
            action=AuditAction.ACCESS_DENIED.value,
            actor_id=doctor.user_id,
            actor_email=doctor.user.email if doctor.user else None,
            actor_role="DOCTOR",
            patient_id=patient.id,
            reason=f"Unverified doctor attempted card scan (status: {doctor.verification_status})",
            ip_address=client_ip,
            user_agent=user_agent,
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Card Scan Locked: Your account status is '{doctor.verification_status}'. Only officially verified medical practitioners whose NMC/State Council license has been approved by administration can scan emergency medical cards."
        )

    AuditService.log_event(
        db=db,
        action=AuditAction.QR_SCANNED.value,
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else None,
        actor_role="DOCTOR",
        patient_id=patient.id,
        reason=f"Verified doctor scanned patient emergency card ({card_identifier})",
        access_scope="DOCTOR_PORTAL_SCAN",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    return DoctorCardScanResponse(
        token=token,
        patient_id=patient.id,
        patient_name=patient.full_name,
        unique_patient_id=patient.unique_patient_id,
        card_number=card_identifier,
        blood_group=patient.blood_group,
        card_status=card_status,
        is_doctor_verified=True,
        doctor_verification_status=doctor.verification_status,
        available_actions=[
            "REQUEST_NORMAL_ACCESS",
            "EMERGENCY_BREAK_GLASS"
        ],
        notice="Emergency card successfully validated. Full clinical history remains locked until patient consent or Level 3 emergency override is executed."
    )
