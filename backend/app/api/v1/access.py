from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import (
    get_current_doctor,
    get_current_verified_doctor,
    get_current_patient,
    get_client_telemetry
)
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.access import Consent, AccessRequest, EmergencyAccessEvent
from app.models.medical import Allergy, Medication, MedicalCondition, Surgery, MedicalVisit
from app.schemas.access import (
    BreakGlassRequest,
    EmergencyTriageResponse,
    ConsentCreate,
    ConsentResponse,
    AccessRequestCreate,
    AccessRequestResponse,
    AccessRequestReview
)
from app.schemas.medical import AllergyResponse, MedicationResponse, ConditionResponse, SurgeryResponse, MedicalVisitResponse, DocumentResponse
from app.schemas.patient import EmergencyContactResponse
from app.services.break_glass_service import BreakGlassService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.services.ai_service import get_ai_service
from app.core.rbac import AuditAction, AccessLevel

router = APIRouter()

# ==============================================================================
# LEVEL 3: EMERGENCY BREAK-GLASS ACCESS
# ==============================================================================
@router.post("/emergency", response_model=EmergencyTriageResponse)
def execute_emergency_break_glass(
    payload: BreakGlassRequest,
    request: Request,
    doctor: Doctor = Depends(get_current_doctor),  # Checks doctor status inside service
    db: Session = Depends(get_db)
):
    """
    LEVEL 3 — EMERGENCY BREAK-GLASS ACCESS.
    Unlocks vital triage dataset for unconscious or incapacitated patients.
    Enforces mandatory clinical reason, logs immutable audit entry, and notifies patient.
    """
    client_ip, user_agent = get_client_telemetry(request)

    result = BreakGlassService.execute_break_glass(
        db=db,
        doctor=doctor,
        qr_token_hash=payload.qr_token,
        hospital_name=payload.hospital_name,
        reason_category=payload.reason_category,
        free_text_justification=payload.free_text_justification,
        patient_consent_incapacitated=payload.patient_consent_incapacitated,
        emergency_incident_id=payload.emergency_incident_id,
        ip_address=client_ip,
        user_agent=user_agent
    )

    patient = result["patient"]

    # Synthesize AI Emergency Summary directly from verified records
    ai_service = get_ai_service()
    ai_summary_dict = ai_service.generate_summary({
        "full_name": patient.full_name,
        "blood_group": patient.blood_group,
        "allergies": [{"id": a.id, "allergen": a.allergen, "severity": a.severity, "reaction": a.reaction} for a in result["severe_allergies"]],
        "medications": [{"id": m.id, "medicine_name": m.medicine_name, "dosage": m.dosage, "frequency": m.frequency} for m in result["critical_medications"]],
        "conditions": [{"id": c.id, "condition_name": c.condition_name, "status": c.status} for c in result["major_conditions"]],
        "surgeries": [{"id": s.id, "procedure_name": s.procedure_name, "surgery_date": s.surgery_date} for s in result["recent_surgeries"]],
        "dnr_status": patient.dnr_status,
        "organ_donor": patient.organ_donor
    })

    return EmergencyTriageResponse(
        session_token=result["session_token"],
        access_level=AccessLevel.LEVEL_3_BREAK_GLASS.value,
        patient_id=patient.id,
        unique_patient_id=patient.unique_patient_id,
        full_name=patient.full_name,
        blood_group=patient.blood_group,
        organ_donor=patient.organ_donor,
        dnr_status=patient.dnr_status,
        emergency_instructions=patient.emergency_instructions,
        severe_allergies=[AllergyResponse.model_validate(a) for a in result["severe_allergies"]],
        critical_medications=[MedicationResponse.model_validate(m) for m in result["critical_medications"]],
        major_conditions=[ConditionResponse.model_validate(c) for c in result["major_conditions"]],
        recent_surgeries=[SurgeryResponse.model_validate(s) for s in result["recent_surgeries"]],
        emergency_contacts=[EmergencyContactResponse.model_validate(ec) for ec in result["emergency_contacts"]],
        ai_summary=ai_summary_dict["ai_summary_text"],
        expires_at=result["expires_at"],
        break_glass_warning="Break-glass emergency session active. This access is recorded in immutable audit logs and dispatched to patient emergency proxies."
    )

# ==============================================================================
# LEVEL 2: NORMAL VERIFIED ACCESS (CONSENT REQUIRED)
# ==============================================================================
@router.post("/request", response_model=AccessRequestResponse)
def request_normal_access(
    payload: AccessRequestCreate,
    request: Request,
    doctor: Doctor = Depends(get_current_verified_doctor),
    db: Session = Depends(get_db)
):
    """(Verified Doctor) Requests non-emergency consent to view a patient's medical records."""
    client_ip, user_agent = get_client_telemetry(request)

    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    acc_req = AccessRequest(
        patient_id=patient.id,
        doctor_id=doctor.id,
        reason=payload.reason,
        requested_scope=payload.requested_scope,
        status="PENDING"
    )
    db.add(acc_req)
    db.commit()
    db.refresh(acc_req)

    # Notify patient
    NotificationService.send_notification(
        db=db,
        user_id=patient.user_id,
        title="📋 New Doctor Access Request",
        message=f"Dr. {doctor.full_name} ({doctor.hospital_name}) is requesting access to your medical history for: '{payload.reason}'."
    )

    AuditService.log_event(
        db=db,
        action=AuditAction.ACCESS_REQUESTED.value,
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else None,
        actor_role="DOCTOR",
        patient_id=patient.id,
        reason=payload.reason,
        access_scope=payload.requested_scope,
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    return AccessRequestResponse(
        id=acc_req.id,
        patient_id=acc_req.patient_id,
        doctor_id=acc_req.doctor_id,
        doctor_name=doctor.full_name,
        reason=acc_req.reason,
        requested_scope=acc_req.requested_scope,
        status=acc_req.status,
        requested_at=acc_req.requested_at
    )

@router.get("/normal/{patient_id}")
def get_normal_verified_records(
    patient_id: int,
    request: Request,
    doctor: Doctor = Depends(get_current_verified_doctor),
    db: Session = Depends(get_db)
):
    """
    LEVEL 2 — NORMAL VERIFIED ACCESS.
    Checks whether active patient consent exists.
    If granted, returns permitted medical history.
    """
    client_ip, user_agent = get_client_telemetry(request)

    # Check active consent
    consent = db.query(Consent).filter(
        Consent.patient_id == patient_id,
        Consent.doctor_id == doctor.id,
        Consent.status == "GRANTED"
    ).first()

    is_expired = False
    if consent and consent.expires_at:
        exp = consent.expires_at.replace(tzinfo=timezone.utc) if consent.expires_at.tzinfo is None else consent.expires_at
        if exp < datetime.now(timezone.utc):
            is_expired = True

    if not consent or is_expired:
        AuditService.log_event(
            db=db,
            action=AuditAction.ACCESS_DENIED.value,
            actor_id=doctor.user_id,
            actor_role="DOCTOR",
            patient_id=patient_id,
            reason="No active patient consent on record",
            access_scope=AccessLevel.LEVEL_2_NORMAL.value,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Patient has not granted active consent for normal clinical access. Request consent or initiate Break-Glass if emergency."
        )

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    AuditService.log_event(
        db=db,
        action=AuditAction.RECORD_VIEW.value,
        actor_id=doctor.user_id,
        actor_role="DOCTOR",
        patient_id=patient.id,
        reason="Normal consented clinical review",
        access_scope=AccessLevel.LEVEL_2_NORMAL.value,
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    return {
        "access_level": AccessLevel.LEVEL_2_NORMAL.value,
        "patient_id": patient.id,
        "unique_patient_id": patient.unique_patient_id,
        "full_name": patient.full_name,
        "phone": patient.phone,
        "address": patient.address,
        "date_of_birth": patient.date_of_birth,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "organ_donor": patient.organ_donor,
        "dnr_status": patient.dnr_status,
        "emergency_instructions": patient.emergency_instructions,
        "emergency_contacts": [EmergencyContactResponse.model_validate(c) for c in patient.emergency_contacts],
        "allergies": [AllergyResponse.model_validate(a) for a in patient.allergies],
        "medications": [MedicationResponse.model_validate(m) for m in patient.medications],
        "conditions": [ConditionResponse.model_validate(c) for c in patient.conditions],
        "surgeries": [SurgeryResponse.model_validate(s) for s in patient.surgeries],
        "visits": [MedicalVisitResponse.model_validate(v) for v in patient.visits],
        "documents": [DocumentResponse.model_validate(d) for d in patient.documents],
        "consent_id": consent.id,
        "consent_expires_at": consent.expires_at
    }

# ==============================================================================
# PATIENT CONSENT MANAGEMENT
# ==============================================================================
@router.get("/requests/pending", response_model=List[AccessRequestResponse])
def get_pending_requests(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) Lists pending doctor access requests."""
    reqs = db.query(AccessRequest).filter(
        AccessRequest.patient_id == patient.id,
        AccessRequest.status == "PENDING"
    ).all()
    results = []
    for r in reqs:
        results.append(AccessRequestResponse(
            id=r.id,
            patient_id=r.patient_id,
            doctor_id=r.doctor_id,
            doctor_name=r.doctor.full_name if r.doctor else "Unknown Doctor",
            reason=r.reason,
            requested_scope=r.requested_scope,
            status=r.status,
            requested_at=r.requested_at
        ))
    return results

@router.post("/requests/{request_id}/review")
def review_access_request(
    request_id: int,
    payload: AccessRequestReview,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) Approves or Rejects a doctor's access request."""
    req = db.query(AccessRequest).filter(
        AccessRequest.id == request_id,
        AccessRequest.patient_id == patient.id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    req.status = payload.status
    req.reviewed_at = datetime.now(timezone.utc)

    if payload.status == "APPROVED":
        # Create or update active consent
        consent = Consent(
            patient_id=patient.id,
            doctor_id=req.doctor_id,
            scope=req.requested_scope,
            status="GRANTED",
            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add(consent)
        AuditService.log_event(
            db=db,
            action=AuditAction.CONSENT_GRANTED.value,
            actor_id=patient.user_id,
            patient_id=patient.id,
            reason=f"Patient approved access request #{req.id}",
            access_scope=req.requested_scope
        )
    else:
        AuditService.log_event(
            db=db,
            action=AuditAction.CONSENT_REVOKED.value,
            actor_id=patient.user_id,
            patient_id=patient.id,
            reason=f"Patient rejected access request #{req.id}"
        )

    db.commit()
    return {"message": f"Request {payload.status.lower()} successfully."}

@router.get("/consents", response_model=List[ConsentResponse])
def get_active_consents(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) View all granted doctor permissions."""
    consents = db.query(Consent).filter(Consent.patient_id == patient.id).all()
    res = []
    for c in consents:
        res.append(ConsentResponse(
            id=c.id,
            patient_id=c.patient_id,
            doctor_id=c.doctor_id,
            doctor_name=c.doctor.full_name if c.doctor else "Unknown Doctor",
            hospital_name=c.doctor.hospital_name if c.doctor else "Unknown Hospital",
            scope=c.scope,
            status=c.status,
            expires_at=c.expires_at,
            created_at=c.created_at
        ))
    return res

@router.post("/consents/revoke/{consent_id}")
def revoke_consent(
    consent_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) Instantly revokes a doctor's normal access privileges."""
    consent = db.query(Consent).filter(
        Consent.id == consent_id,
        Consent.patient_id == patient.id
    ).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found.")

    consent.status = "REVOKED"
    db.commit()

    AuditService.log_event(
        db=db,
        action=AuditAction.CONSENT_REVOKED.value,
        actor_id=patient.user_id,
        patient_id=patient.id,
        reason=f"Patient revoked consent ID #{consent_id}"
    )

    return {"message": "Consent revoked successfully."}
