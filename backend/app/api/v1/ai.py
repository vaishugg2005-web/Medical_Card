from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_user, get_client_telemetry
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.access import Consent, EmergencyAccessEvent
from app.schemas.ai import AISummaryRequest, AISummaryResponse
from app.services.ai_service import get_ai_service
from app.services.audit_service import AuditService
from app.core.rbac import UserRole, AuditAction

router = APIRouter()

@router.post("/emergency-summary", response_model=AISummaryResponse)
def generate_ai_emergency_summary(
    payload: AISummaryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synthesizes an AI-assisted clinical emergency summary strictly from verified records.
    Access is restricted to:
    1. The patient themselves.
    2. A verified doctor with active consent or an active emergency break-glass event.
    """
    client_ip, user_agent = get_client_telemetry(request)
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Authorization Check
    is_authorized = False
    if current_user.role == UserRole.PATIENT.value and patient.user_id == current_user.id:
        is_authorized = True
    elif current_user.role == UserRole.DOCTOR.value and current_user.doctor_profile:
        doctor = current_user.doctor_profile
        consent = db.query(Consent).filter(
            Consent.patient_id == patient.id,
            Consent.doctor_id == doctor.id,
            Consent.status == "GRANTED"
        ).order_by(Consent.created_at.desc()).first()
        has_consent = False
        if consent and consent.expires_at:
            exp = consent.expires_at.replace(tzinfo=timezone.utc) if consent.expires_at.tzinfo is None else consent.expires_at
            if exp >= datetime.now(timezone.utc):
                has_consent = True

        emergency = db.query(EmergencyAccessEvent).filter(
            EmergencyAccessEvent.patient_id == patient.id,
            EmergencyAccessEvent.doctor_id == doctor.id,
            EmergencyAccessEvent.is_active == True
        ).order_by(EmergencyAccessEvent.created_at.desc()).first()
        has_emergency = False
        if emergency and emergency.expires_at:
            exp_em = emergency.expires_at.replace(tzinfo=timezone.utc) if emergency.expires_at.tzinfo is None else emergency.expires_at
            if exp_em >= datetime.now(timezone.utc):
                has_emergency = True
            else:
                emergency.is_active = False
                db.commit()

        if has_consent or has_emergency:
            is_authorized = True

    if not is_authorized:
        AuditService.log_event(
            db=db,
            action=AuditAction.ACCESS_DENIED.value,
            actor_id=current_user.id,
            actor_email=current_user.email,
            actor_role=current_user.role,
            patient_id=patient.id,
            reason="Unauthorized attempt to generate AI clinical summary",
            ip_address=client_ip,
            user_agent=user_agent,
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot generate AI clinical summary without verified authorization or break-glass access."
        )

    # Compile verified medical dataset
    patient_data = {
        "full_name": patient.full_name,
        "blood_group": patient.blood_group,
        "allergies": [{"id": a.id, "allergen": a.allergen, "severity": a.severity, "reaction": a.reaction} for a in patient.allergies],
        "medications": [{"id": m.id, "medicine_name": m.medicine_name, "dosage": m.dosage, "frequency": m.frequency} for m in patient.medications],
        "conditions": [{"id": c.id, "condition_name": c.condition_name, "status": c.status} for c in patient.conditions],
        "surgeries": [{"id": s.id, "procedure_name": s.procedure_name, "surgery_date": s.surgery_date} for s in patient.surgeries],
        "dnr_status": patient.dnr_status,
        "organ_donor": patient.organ_donor
    }

    ai_service = get_ai_service()
    summary = ai_service.generate_summary(patient_data)

    AuditService.log_event(
        db=db,
        action=AuditAction.AI_SUMMARY_GENERATED.value,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        patient_id=patient.id,
        reason="AI clinical summary generated from verified records",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    return AISummaryResponse(
        patient_id=patient.id,
        patient_name=patient.full_name,
        blood_group=summary["blood_group"],
        critical_allergies=summary["critical_allergies"],
        current_critical_medications=summary["current_critical_medications"],
        major_conditions=summary["major_conditions"],
        recent_procedures=summary["recent_procedures"],
        important_warnings=summary["important_warnings"],
        ai_summary_text=summary["ai_summary_text"],
        traceable_sources=summary["traceable_sources"],
        provider_used=summary["provider_used"]
    )
