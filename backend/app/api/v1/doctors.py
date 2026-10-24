from datetime import datetime, timezone
import json
import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_doctor, get_current_verified_doctor, get_client_telemetry
from pydantic import BaseModel
from app.services.clinical_catalogue import get_catalogue_summary, CLINICAL_CATALOGUE
from app.models.doctor import Doctor, DoctorDocument, DoctorVerification
from app.models.patient import Patient, EmergencyContact
from app.models.medical import (
    MedicalVisit, Prescription, Allergy, Medication, MedicalCondition, Surgery, MedicalDocument
)
from app.models.access import EmergencyAccessEvent, AccessRequest, Consent, ConsultationRequest
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.doctor import DoctorResponse, DoctorStats, DoctorDocumentResponse, DoctorUpdate
from app.schemas.medical import MedicalVisitCreate, MedicalVisitResponse
from app.schemas.access import ConsultationRequestResponse, ConsultationResponseUpdate
from app.schemas.audit import AuditLogResponse
from app.services.storage_service import StorageService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.core.rbac import AuditAction, UserRole, DoctorVerificationStatus

router = APIRouter()

@router.get("/me", response_model=DoctorResponse)
def get_doctor_profile(doctor: Doctor = Depends(get_current_doctor)):
    """Returns the authenticated physician's identity, specialization, and verification status."""
    return doctor

@router.put("/me", response_model=DoctorResponse)
def update_doctor_profile(
    payload: DoctorUpdate,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Updates physician profile details (phone, hospital, specialization, full_name)."""
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(doctor, field, value)
    db.commit()
    db.refresh(doctor)
    return doctor

@router.patch("/me/profile", response_model=DoctorResponse)
def patch_doctor_profile(
    payload: DoctorUpdate,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """(PATCH alias) Updates physician profile details."""
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(doctor, field, value)
    db.commit()
    db.refresh(doctor)
    return doctor

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/me/change-password")
def change_doctor_password(
    payload: ChangePasswordRequest,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Allows the authenticated doctor to change their account password after verifying the current one."""
    from app.core.security import verify_password, get_password_hash
    user = db.query(User).filter(User.id == doctor.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters.")
    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully."}

@router.get("/me/verification")
def get_doctor_verification_status(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Returns the doctor's verification lifecycle status, application reference, and audit history."""
    history = db.query(DoctorVerification).filter(
        DoctorVerification.doctor_id == doctor.id
    ).order_by(DoctorVerification.timestamp.desc()).all()
    
    history_data = [
        {
            "id": h.id,
            "previous_status": h.previous_status,
            "new_status": h.new_status,
            "notes": h.notes,
            "timestamp": h.timestamp.isoformat() if h.timestamp else None
        }
        for h in history
    ]

    return {
        "doctor_id": doctor.id,
        "application_reference": doctor.application_reference or f"DOC-APP-2026-{doctor.id:04d}",
        "verification_status": doctor.verification_status,
        "verification_notes": doctor.verification_notes,
        "rejection_reason": doctor.rejection_reason,
        "information_requested": doctor.information_requested,
        "verified_at": doctor.verified_at.isoformat() if doctor.verified_at else None,
        "submission_date": doctor.created_at.isoformat() if doctor.created_at else None,
        "full_name": doctor.full_name,
        "specialization": doctor.specialization,
        "medical_license_number": doctor.medical_license_number,
        "registration_authority": doctor.registration_authority,
        "medical_qualification": doctor.medical_qualification,
        "hospital_name": doctor.hospital_name,
        "professional_address": doctor.professional_address,
        "years_of_experience": doctor.years_of_experience,
        "history": history_data
    }

class ResubmitApplicationRequest(BaseModel):
    specialization: str | None = None
    hospital_name: str | None = None
    professional_address: str | None = None
    years_of_experience: int | None = None
    additional_notes: str | None = None

@router.post("/me/verification/resubmit")
def resubmit_doctor_verification(
    payload: ResubmitApplicationRequest,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Allows doctor to resubmit their application with updated info following a rejection or info request."""
    if doctor.verification_status not in [DoctorVerificationStatus.REJECTED.value, DoctorVerificationStatus.UNDER_REVIEW.value, DoctorVerificationStatus.PENDING.value]:
        raise HTTPException(status_code=400, detail="Only rejected, pending, or under-review applications can be resubmitted.")

    prev_status = doctor.verification_status
    if payload.specialization:
        doctor.specialization = payload.specialization
    if payload.hospital_name:
        doctor.hospital_name = payload.hospital_name
    if payload.professional_address:
        doctor.professional_address = payload.professional_address
    if payload.years_of_experience:
        doctor.years_of_experience = payload.years_of_experience

    doctor.verification_status = DoctorVerificationStatus.PENDING.value
    doctor.rejection_reason = None
    doctor.information_requested = None

    verif = DoctorVerification(
        doctor_id=doctor.id,
        reviewer_id=None,
        previous_status=prev_status,
        new_status=DoctorVerificationStatus.PENDING.value,
        notes=f"Applicant resubmitted verification application. Notes: {payload.additional_notes or 'Updated application details.'}"
    )
    db.add(verif)
    db.commit()
    db.refresh(doctor)

    # Notify administrators
    admins = db.query(User).filter(User.role.in_([UserRole.SYSTEM_ADMIN.value, UserRole.HOSPITAL_ADMIN.value])).all()
    for a in admins:
        NotificationService.send_notification(
            db=db,
            user_id=a.id,
            title="Doctor Application Resubmitted",
            message=f"Dr. {doctor.full_name} has resubmitted their verification application ({doctor.application_reference})."
        )

    return {
        "message": "Application resubmitted successfully. It is now awaiting administrative review.",
        "verification_status": doctor.verification_status,
        "application_reference": doctor.application_reference
    }

@router.get("/stats", response_model=DoctorStats)
def get_doctor_statistics(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Retrieves operational metrics for the physician's dashboard."""
    accessed_count = db.query(MedicalVisit).filter(MedicalVisit.doctor_id == doctor.id).count()
    emerg_count = db.query(EmergencyAccessEvent).filter(EmergencyAccessEvent.doctor_id == doctor.id).count()
    pending_count = db.query(AccessRequest).filter(
        AccessRequest.doctor_id == doctor.id,
        AccessRequest.status == "PENDING"
    ).count()

    return DoctorStats(
        patients_accessed_count=accessed_count + emerg_count,
        emergency_access_count=emerg_count,
        pending_requests_count=pending_count
    )

@router.post("/treatments/{patient_id}", response_model=MedicalVisitResponse)
def add_treatment_record(
    patient_id: int,
    payload: MedicalVisitCreate,
    request: Request,
    doctor: Doctor = Depends(get_current_verified_doctor),
    db: Session = Depends(get_db)
):
    """
    (Verified Doctor) Records an authorized clinical visit and issues prescriptions.
    Enforces that doctor holds active consent or active emergency break-glass session.
    """
    client_ip, user_agent = get_client_telemetry(request)

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    # Check authorization: active consent or active emergency event
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

    if not has_consent and not has_emergency:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot add clinical records without active patient consent or active emergency break-glass session."
        )

    # Create visit
    visit = MedicalVisit(
        patient_id=patient.id,
        doctor_id=doctor.id,
        reason=payload.reason,
        diagnosis=payload.diagnosis,
        treatment_notes=payload.treatment_notes
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)

    # Add prescriptions
    for p_text in payload.prescriptions:
        rx = Prescription(
            visit_id=visit.id,
            patient_id=patient.id,
            doctor_id=doctor.id,
            prescription_text=p_text
        )
        db.add(rx)
    db.commit()
    db.refresh(visit)

    AuditService.log_event(
        db=db,
        action=AuditAction.RECORD_UPDATE.value,
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else None,
        actor_role="DOCTOR",
        patient_id=patient.id,
        reason=f"Doctor added clinical visit #{visit.id}",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    return MedicalVisitResponse(
        id=visit.id,
        patient_id=visit.patient_id,
        doctor_id=visit.doctor_id,
        doctor_name=doctor.full_name,
        visit_date=visit.visit_date,
        reason=visit.reason,
        diagnosis=visit.diagnosis,
        treatment_notes=visit.treatment_notes,
        prescriptions=[]
    )

@router.get("/my-audit", response_model=List[AuditLogResponse])
def get_doctor_audit_history(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Allows physicians to inspect the audit log of their own queries and accesses."""
    return db.query(AuditLog).filter(
        AuditLog.actor_id == doctor.user_id
    ).order_by(AuditLog.created_at.desc()).limit(50).all()

# ==================== Official Verification Documents ====================
@router.get("/me/documents", response_model=List[DoctorDocumentResponse])
def get_doctor_documents(doctor: Doctor = Depends(get_current_doctor)):
    """Lists all official verification certificates, diplomas, and identity cards submitted by doctor."""
    return doctor.documents

@router.post("/me/documents", response_model=DoctorDocumentResponse)
def upload_doctor_verification_document(
    title: str = Form(...),
    document_type: str = Form("DEGREE_CERTIFICATE"),  # DEGREE_CERTIFICATE, COUNCIL_REGISTRATION, HOSPITAL_ID_CARD
    file: UploadFile = File(...),
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Submits official medical credentials (degree certificate, license, or hospital ID) for admin review."""
    file_path, file_size, mime_type = StorageService.save_doctor_document(file, doctor.id)
    doc = DoctorDocument(
        doctor_id=doctor.id,
        title=title,
        document_type=document_type,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/me/documents/{doc_id}/download")
def download_doctor_document(
    doc_id: int,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Streams the doctor verification document to the doctor."""
    doc = db.query(DoctorDocument).filter(
        DoctorDocument.id == doc_id,
        DoctorDocument.doctor_id == doctor.id
    ).first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document not found on storage.")
    return FileResponse(doc.file_path, media_type=doc.mime_type, filename=os.path.basename(doc.file_path))


# ==================== Patient Consultation Requests (Doctor View) ====================
@router.get("/me/consultations", response_model=List[ConsultationRequestResponse])
def get_doctor_consultation_requests(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """(Doctor) View all consultation, review, and follow-up requests assigned to this physician."""
    reqs = db.query(ConsultationRequest).filter(
        ConsultationRequest.doctor_id == doctor.id
    ).order_by(ConsultationRequest.created_at.desc()).all()
    results = []
    for r in reqs:
        results.append(ConsultationRequestResponse(
            id=r.id,
            patient_id=r.patient_id,
            doctor_id=r.doctor_id,
            patient_name=r.patient.full_name if r.patient else "Patient",
            doctor_name=doctor.full_name,
            hospital_name=doctor.hospital_name,
            specialization=doctor.specialization,
            request_type=r.request_type,
            reason=r.reason,
            preferred_date=r.preferred_date,
            consultation_mode=getattr(r, "consultation_mode", "IN_PERSON") or "IN_PERSON",
            slot_time=getattr(r, "slot_time", None),
            status=r.status,
            doctor_response=r.doctor_response,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return results

@router.post("/me/consultations/{req_id}/respond", response_model=ConsultationRequestResponse)
def respond_to_consultation_request(
    req_id: int,
    payload: ConsultationResponseUpdate,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """(Doctor) Accepts or Rejects a patient consultation request with physician remarks."""
    if doctor.verification_status != "VERIFIED":
        raise HTTPException(
            status_code=403,
            detail=f"Doctor is currently '{doctor.verification_status}' and cannot respond to appointment requests."
        )

    req = db.query(ConsultationRequest).filter(
        ConsultationRequest.id == req_id,
        ConsultationRequest.doctor_id == doctor.id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Consultation request not found.")

    req.status = payload.status
    req.doctor_response = payload.doctor_response
    req.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)

    # Notify patient
    NotificationService.send_notification(
        db=db,
        user_id=req.patient.user_id,
        title=f"Appointment Request {payload.status.title()}",
        message=f"Dr. {doctor.full_name} has marked your appointment request as '{payload.status}'. Notes: {payload.doctor_response or 'No additional notes'}."
    )

    AuditService.log_event(
        db=db,
        action=f"APPOINTMENT_{payload.status.upper()}",
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else "doctor",
        actor_role="DOCTOR",
        reason=f"Doctor {payload.status} appointment #{req.id}",
        details=f"Doctor {doctor.full_name} responded: {payload.doctor_response or 'No notes'}"
    )

    return ConsultationRequestResponse(
        id=req.id,
        patient_id=req.patient_id,
        doctor_id=req.doctor_id,
        patient_name=req.patient.full_name if req.patient else "Patient",
        doctor_name=doctor.full_name,
        hospital_name=doctor.hospital_name,
        specialization=doctor.specialization,
        request_type=req.request_type,
        reason=req.reason,
        preferred_date=req.preferred_date,
        consultation_mode=getattr(req, "consultation_mode", "IN_PERSON") or "IN_PERSON",
        slot_time=getattr(req, "slot_time", None),
        status=req.status,
        doctor_response=req.doctor_response,
        created_at=req.created_at,
        updated_at=req.updated_at
    )


# ==================== Patient Selection & Authorization Workspace ====================
def _check_doctor_authorization(db: Session, doctor_id: int, patient_id: int):
    now = datetime.now(timezone.utc)
    # Check active consent
    consent = db.query(Consent).filter(
        Consent.patient_id == patient_id,
        Consent.doctor_id == doctor_id,
        Consent.status == "GRANTED"
    ).order_by(Consent.created_at.desc()).first()
    if consent:
        if consent.expires_at:
            exp = consent.expires_at.replace(tzinfo=timezone.utc) if consent.expires_at.tzinfo is None else consent.expires_at
            if exp >= now:
                return {"authorized": True, "auth_type": "CONSENT", "expires_at": exp.isoformat(), "scope": consent.scope}
        else:
            return {"authorized": True, "auth_type": "CONSENT", "expires_at": None, "scope": consent.scope}

    # Check active emergency override
    emergency = db.query(EmergencyAccessEvent).filter(
        EmergencyAccessEvent.patient_id == patient_id,
        EmergencyAccessEvent.doctor_id == doctor_id,
        EmergencyAccessEvent.is_active == True
    ).order_by(EmergencyAccessEvent.created_at.desc()).first()
    if emergency and emergency.expires_at:
        exp_em = emergency.expires_at.replace(tzinfo=timezone.utc) if emergency.expires_at.tzinfo is None else emergency.expires_at
        if exp_em >= now:
            return {"authorized": True, "auth_type": "EMERGENCY_OVERRIDE", "expires_at": exp_em.isoformat(), "reason": emergency.clinical_justification}
        else:
            emergency.is_active = False
            db.commit()

    return {"authorized": False, "auth_type": "NONE", "expires_at": None}


@router.get("/patients")
def list_patients_for_doctor(
    search: str = "",
    status_filter: str = "all",  # all, authorized, pending, emergency
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    (Doctor) Returns patient directory with minimal identifiers and authorization relationship.
    Does NOT leak private medical details before authorization is verified.
    """
    query = db.query(Patient)
    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter((Patient.full_name.ilike(term)) | (Patient.unique_patient_id.ilike(term)))

    patients = query.order_by(Patient.full_name.asc()).all()
    results = []

    for p in patients:
        auth_info = _check_doctor_authorization(db, doctor.id, p.id)
        
        # Check if there is a pending access request
        pending_req = db.query(AccessRequest).filter(
            AccessRequest.patient_id == p.id,
            AccessRequest.doctor_id == doctor.id,
            AccessRequest.status == "PENDING"
        ).first()

        status_label = "UNAUTHORIZED"
        if auth_info["auth_type"] == "EMERGENCY_OVERRIDE":
            status_label = "EMERGENCY_ACTIVE"
        elif auth_info["auth_type"] == "CONSENT":
            status_label = "AUTHORIZED"
        elif pending_req:
            status_label = "PENDING_CONSENT"

        # Apply filter
        if status_filter == "authorized" and status_label not in ("AUTHORIZED", "EMERGENCY_ACTIVE"):
            continue
        if status_filter == "emergency" and status_label != "EMERGENCY_ACTIVE":
            continue
        if status_filter == "pending" and status_label != "PENDING_CONSENT":
            continue

        results.append({
            "id": p.id,
            "unique_patient_id": p.unique_patient_id,
            "full_name": p.full_name,
            "gender": p.gender,
            "blood_group": p.blood_group,
            "date_of_birth": p.date_of_birth,
            "authorization_status": status_label,
            "is_authorized": auth_info["authorized"],
            "auth_type": auth_info["auth_type"],
            "auth_expires_at": auth_info["expires_at"],
            "has_pending_request": pending_req is not None
        })

    return results
def _format_prescription_response(pr: Prescription, db: Session) -> dict:
    patient = db.query(Patient).filter(Patient.id == pr.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == pr.doctor_id).first() if pr.doctor_id else None
    visit = db.query(MedicalVisit).filter(MedicalVisit.id == pr.visit_id).first() if pr.visit_id else None

    raw_text = pr.prescription_text or ""
    diagnosis = (visit.diagnosis if visit else "") or ""
    clinical_notes = (visit.treatment_notes if visit else "") or ""
    visit_date = visit.visit_date.strftime("%Y-%m-%d") if (visit and visit.visit_date) else (pr.date_issued.strftime("%Y-%m-%d") if pr.date_issued else "")
    is_critical = False
    medicines = []

    if raw_text.strip().startswith("{") and raw_text.strip().endswith("}"):
        try:
            data = json.loads(raw_text)
            diagnosis = data.get("diagnosis", diagnosis)
            clinical_notes = data.get("clinical_notes", clinical_notes)
            visit_date = data.get("visit_date", visit_date)
            is_critical = bool(data.get("is_critical", False))
            medicines = data.get("medicines", [])
        except Exception:
            pass

    if not medicines and raw_text:
        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        if lines:
            for line in lines:
                parts = line.split(" - ")
                medicines.append({
                    "name": parts[0].strip(),
                    "dosage": parts[1].strip() if len(parts) > 1 else "",
                    "frequency": parts[2].strip() if len(parts) > 2 else "Once daily (OD)",
                    "duration": parts[3].strip() if len(parts) > 3 else "30 days",
                    "route": "Oral",
                    "instructions": parts[4].strip() if len(parts) > 4 else ""
                })
        else:
            medicines.append({
                "name": raw_text,
                "dosage": "As prescribed",
                "frequency": "Daily",
                "duration": "Standard",
                "route": "Oral",
                "instructions": ""
            })

    return {
        "id": pr.id,
        "visit_id": pr.visit_id,
        "patient_id": pr.patient_id,
        "patient_name": patient.full_name if patient else f"Patient #{pr.patient_id}",
        "patient_unique_id": patient.unique_patient_id if patient else "",
        "doctor_id": pr.doctor_id,
        "doctor_name": doctor.full_name if doctor else "Attending Doctor",
        "visit_date": visit_date or (pr.date_issued.strftime("%Y-%m-%d") if pr.date_issued else datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "diagnosis": diagnosis or "General Clinical Examination",
        "medicines": medicines,
        "clinical_notes": clinical_notes,
        "is_critical": is_critical,
        "prescription_text": raw_text,
        "date_issued": pr.date_issued.isoformat() if pr.date_issued else datetime.now(timezone.utc).isoformat()
    }


@router.get("/patients/{patient_id}/full-record")
def get_patient_full_clinical_record(
    patient_id: int,
    request: Request,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    (Doctor) Retrieves the complete multi-section medical record workspace for an authorized patient.
    Strictly verifies consent or emergency override status before returning protected records.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    auth_info = _check_doctor_authorization(db, doctor.id, patient.id)
    if not auth_info["authorized"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access not authorized for patient {patient.unique_patient_id}. You must request Level 2 Patient Consent or initiate a Level 3 Emergency Break-Glass Override."
        )

    client_ip, user_agent = get_client_telemetry(request)
    AuditService.log_event(
        db=db,
        action=AuditAction.RECORD_ACCESS.value,
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else None,
        actor_role="DOCTOR",
        patient_id=patient.id,
        reason=f"Doctor accessed full clinical workspace via {auth_info['auth_type']}",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    # Collect all domain records
    allergies = [
        {"id": a.id, "allergen": a.allergen, "severity": a.severity, "reaction": a.reaction, "is_critical_flag": a.is_critical_flag, "created_at": a.created_at.isoformat()}
        for a in patient.allergies
    ]
    current_medications = [
        {"id": m.id, "medicine_name": m.medicine_name, "dosage": m.dosage, "frequency": m.frequency, "route": m.route, "is_critical_flag": m.is_critical_flag, "notes": m.notes, "start_date": m.start_date, "created_at": m.created_at.isoformat()}
        for m in patient.medications if m.is_active
    ]
    historical_medications = [
        {"id": m.id, "medicine_name": m.medicine_name, "dosage": m.dosage, "frequency": m.frequency, "route": m.route, "notes": m.notes, "created_at": m.created_at.isoformat()}
        for m in patient.medications if not m.is_active
    ]
    diagnoses = [
        {"id": c.id, "condition_name": c.condition_name, "diagnosis_date": c.diagnosis_date, "status": c.status, "is_critical_flag": c.is_critical_flag, "notes": c.notes, "created_at": c.created_at.isoformat()}
        for c in patient.conditions
    ]
    surgeries = [
        {"id": s.id, "procedure_name": s.procedure_name, "surgery_date": s.surgery_date, "hospital": s.hospital, "surgeon": s.surgeon, "notes": s.notes, "created_at": s.created_at.isoformat()}
        for s in patient.surgeries
    ]
    visits = [
        {"id": v.id, "visit_date": v.visit_date.isoformat(), "doctor_name": v.doctor.full_name if v.doctor else "Attending Physician", "reason": v.reason, "diagnosis": v.diagnosis, "treatment_notes": v.treatment_notes}
        for v in patient.visits
    ]
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient.id).order_by(Prescription.date_issued.desc()).all()
    prescriptions_data = [
        _format_prescription_response(pr, db)
        for pr in prescriptions
    ]
    documents = [
        {"id": d.id, "title": d.title, "document_type": d.document_type, "file_size": d.file_size, "created_at": d.created_at.isoformat()}
        for d in patient.documents
    ]
    emergency_contacts = [
        {"id": ec.id, "contact_name": ec.contact_name, "relationship_type": ec.relationship_type, "phone": ec.phone_encrypted, "priority_order": ec.priority_order}
        for ec in patient.emergency_contacts
    ]

    # Change history / provenance logs for this patient
    audit_provenance = db.query(AuditLog).filter(
        AuditLog.patient_id == patient.id
    ).order_by(AuditLog.created_at.desc()).limit(15).all()
    provenance_data = [
        {"id": log.id, "action": log.action, "actor_role": log.actor_role, "reason": log.reason, "created_at": log.created_at.isoformat(), "success": log.success}
        for log in audit_provenance
    ]

    return {
        "auth_info": auth_info,
        "patient": {
            "id": patient.id,
            "unique_patient_id": patient.unique_patient_id,
            "full_name": patient.full_name,
            "blood_group": patient.blood_group,
            "gender": patient.gender,
            "date_of_birth": patient.date_of_birth,
            "contact_number": getattr(patient, "phone", None),
            "phone": getattr(patient, "phone", None),
            "address": patient.address,
            "organ_donor": patient.organ_donor,
            "dnr_status": patient.dnr_status
        },
        "allergies": allergies,
        "current_medications": current_medications,
        "historical_medications": historical_medications,
        "diagnoses": diagnoses,
        "surgeries": surgeries,
        "visits": visits,
        "prescriptions": prescriptions_data,
        "documents": documents,
        "emergency_contacts": emergency_contacts,
        "audit_provenance": provenance_data
    }


@router.post("/patients/{patient_id}/clinical-entry")
def add_patient_clinical_entry(
    patient_id: int,
    payload: dict,
    request: Request,
    doctor: Doctor = Depends(get_current_verified_doctor),
    db: Session = Depends(get_db)
):
    """
    (Verified Doctor) Creates or updates a clinical record entry with immutable provenance.
    Supports entry types: DIAGNOSIS, MEDICATION, ALLERGY, PRESCRIPTION, CLINICAL_NOTE.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    auth_info = _check_doctor_authorization(db, doctor.id, patient.id)
    if not auth_info["authorized"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot author clinical records without verified patient consent or active emergency override."
        )

    client_ip, user_agent = get_client_telemetry(request)
    entry_type = payload.get("entry_type", "").upper()
    title = payload.get("title", "").strip()
    detail = payload.get("detail", "").strip()
    notes = payload.get("notes", "").strip()
    is_critical = payload.get("is_critical", False)

    if not title:
        raise HTTPException(status_code=400, detail="Title/Name is required for clinical record.")

    if entry_type == "DIAGNOSIS":
        item = MedicalCondition(
            patient_id=patient.id,
            condition_name=title,
            diagnosis_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            status="ACTIVE",
            is_critical_flag=is_critical,
            notes=f"Authored by Dr. {doctor.full_name}: {notes or detail}"
        )
        db.add(item)
    elif entry_type == "MEDICATION":
        item = Medication(
            patient_id=patient.id,
            medicine_name=title,
            dosage=detail or "As prescribed",
            frequency=payload.get("frequency", "Daily"),
            route=payload.get("route", "Oral"),
            is_critical_flag=is_critical,
            notes=f"Prescribed by Dr. {doctor.full_name}: {notes}",
            is_active=True
        )
        db.add(item)
    elif entry_type == "ALLERGY":
        item = Allergy(
            patient_id=patient.id,
            allergen=title,
            severity=detail or "MODERATE",
            reaction=notes or "Flagged in clinic",
            is_critical_flag=is_critical
        )
        db.add(item)
    elif entry_type == "PRESCRIPTION":
        item = Prescription(
            patient_id=patient.id,
            doctor_id=doctor.id,
            prescription_text=f"{title} - {detail}. {notes}"
        )
        db.add(item)
    elif entry_type == "CLINICAL_NOTE":
        item = MedicalVisit(
            patient_id=patient.id,
            doctor_id=doctor.id,
            reason=title,
            diagnosis=detail,
            treatment_notes=notes
        )
        db.add(item)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported clinical entry type: {entry_type}")

    db.commit()

    # Log audit event
    AuditService.log_event(
        db=db,
        action=AuditAction.RECORD_UPDATE.value,
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else None,
        actor_role="DOCTOR",
        patient_id=patient.id,
        reason=f"Doctor {doctor.full_name} authored new {entry_type}: {title}",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    # Cross-portal notification to patient
    NotificationService.send_notification(
        db=db,
        user_id=patient.user_id,
        title=f"New Clinical Record Added ({entry_type.title()})",
        message=f"Dr. {doctor.full_name} has updated your medical profile: '{title}'. Check your Medical Timeline."
    )

    return {"message": f"{entry_type.title()} record added successfully.", "author": doctor.full_name, "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/me/notifications")
def get_doctor_notifications(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Retrieves all notifications for the authenticated doctor."""
    return db.query(Notification).filter(
        Notification.user_id == doctor.user_id
    ).order_by(Notification.created_at.desc()).limit(30).all()


@router.post("/me/notifications/{notif_id}/read")
def mark_doctor_notification_read(
    notif_id: int,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == doctor.user_id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "ok"}


@router.get("/clinical-catalogue")
def get_doctor_clinical_catalogue(
    doctor: Doctor = Depends(get_current_doctor)
):
    """
    Returns the guideline-aligned clinical conditions, mapped medicines,
    and standard dosage/frequency/route/duration options for clinical entry.
    """
    return get_catalogue_summary()


@router.get("/prescriptions")
def get_doctor_prescriptions(
    search: Optional[str] = None,
    patient_id: Optional[int] = None,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Returns prescriptions authored by the doctor.
    Supports filtering by search query (patient name, ID, diagnosis, medicine) or patient_id.
    """
    query = db.query(Prescription).filter(Prescription.doctor_id == doctor.id)
    if patient_id:
        query = query.filter(Prescription.patient_id == patient_id)

    prescriptions = query.order_by(Prescription.date_issued.desc()).all()
    results = [_format_prescription_response(pr, db) for pr in prescriptions]

    if search:
        s = search.lower().strip()
        filtered = []
        for r in results:
            match = (
                s in r["patient_name"].lower()
                or s in r["patient_unique_id"].lower()
                or s in r["diagnosis"].lower()
                or s in r["clinical_notes"].lower()
                or s in r["visit_date"].lower()
                or any(
                    s in (m.get("name") or "").lower() or s in (m.get("instructions") or "").lower()
                    for m in r["medicines"]
                )
            )
            if match:
                filtered.append(r)
        return filtered

    return results


@router.post("/prescriptions")
def create_clinical_prescription(
    payload: dict,
    request: Request,
    doctor: Doctor = Depends(get_current_verified_doctor),
    db: Session = Depends(get_db)
):
    """
    (Verified Doctor) Creates a complete clinical entry and prescription for an authorized patient.
    Saves to MedicalVisit, Prescription, Medication, and MedicalCondition tables.
    """
    patient_id = payload.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=400, detail="Patient ID is required.")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Strict authorization check
    auth_info = _check_doctor_authorization(db, doctor.id, patient.id)
    if not auth_info["authorized"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot prescribe or add clinical entries without verified patient consent or active emergency override."
        )

    diagnosis = (payload.get("diagnosis") or "").strip()
    if not diagnosis:
        raise HTTPException(status_code=400, detail="Diagnosis / Medical Condition is required.")

    medicines = payload.get("medicines", [])
    if not isinstance(medicines, list) or len(medicines) == 0:
        raise HTTPException(status_code=400, detail="At least one medicine is required in the prescription.")

    for idx, med in enumerate(medicines):
        if not med.get("name", "").strip():
            raise HTTPException(status_code=400, detail=f"Medicine name is missing at row #{idx + 1}.")

    visit_date_str = (payload.get("visit_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")).strip()
    clinical_notes = (payload.get("clinical_notes") or "").strip()
    is_critical = bool(payload.get("is_critical", False))

    client_ip, user_agent = get_client_telemetry(request)

    # 1. Create MedicalVisit record
    try:
        visit_dt = datetime.strptime(visit_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except Exception:
        visit_dt = datetime.now(timezone.utc)

    visit = MedicalVisit(
        patient_id=patient.id,
        doctor_id=doctor.id,
        visit_date=visit_dt,
        reason=f"Clinical Consultation - {diagnosis}",
        diagnosis=diagnosis,
        treatment_notes=clinical_notes
    )
    db.add(visit)
    db.flush()

    # 2. Create Prescription with structured JSON payload
    prescription_data = {
        "diagnosis": diagnosis,
        "visit_date": visit_date_str,
        "medicines": medicines,
        "clinical_notes": clinical_notes,
        "is_critical": is_critical
    }
    json_text = json.dumps(prescription_data)

    prescription = Prescription(
        visit_id=visit.id,
        patient_id=patient.id,
        doctor_id=doctor.id,
        prescription_text=json_text,
        date_issued=datetime.now(timezone.utc)
    )
    db.add(prescription)
    db.flush()

    # 3. Add to patient active Medications list
    for med in medicines:
        med_record = Medication(
            patient_id=patient.id,
            medicine_name=med["name"].strip(),
            dosage=med.get("dosage", "As prescribed"),
            frequency=med.get("frequency", "Once daily (OD)"),
            route=med.get("route", "Oral"),
            start_date=visit_date_str,
            notes=f"Prescribed by Dr. {doctor.full_name} for {diagnosis}. {med.get('instructions', '')} (Duration: {med.get('duration', 'N/A')})".strip(),
            is_critical_flag=is_critical,
            is_active=True
        )
        db.add(med_record)

    # 4. Record MedicalCondition if not duplicate
    existing_cond = db.query(MedicalCondition).filter(
        MedicalCondition.patient_id == patient.id,
        MedicalCondition.condition_name == diagnosis,
        MedicalCondition.status == "ACTIVE"
    ).first()
    if not existing_cond:
        cond_record = MedicalCondition(
            patient_id=patient.id,
            condition_name=diagnosis,
            diagnosis_date=visit_date_str,
            status="ACTIVE",
            is_critical_flag=is_critical,
            notes=f"Diagnosed by Dr. {doctor.full_name}. {clinical_notes}".strip()
        )
        db.add(cond_record)

    db.commit()
    db.refresh(prescription)

    # 5. Audit Logging
    AuditService.log_event(
        db=db,
        action=AuditAction.RECORD_UPDATE.value,
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else None,
        actor_role="DOCTOR",
        patient_id=patient.id,
        reason=f"Dr. {doctor.full_name} authored prescription for {diagnosis} ({len(medicines)} medicines)",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    # 6. Patient Notification
    NotificationService.send_notification(
        db=db,
        user_id=patient.user_id,
        title="New Prescription Issued",
        message=f"Dr. {doctor.full_name} issued a new prescription for {diagnosis} ({len(medicines)} medicines). Review it under your Medical Records."
    )

    return _format_prescription_response(prescription, db)


@router.put("/prescriptions/{prescription_id}")
def update_clinical_prescription(
    prescription_id: int,
    payload: dict,
    request: Request,
    doctor: Doctor = Depends(get_current_verified_doctor),
    db: Session = Depends(get_db)
):
    """
    (Verified Doctor) Updates an existing prescription authored by the doctor.
    """
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    if prescription.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="You can only edit prescriptions authored by yourself.")

    patient = db.query(Patient).filter(Patient.id == prescription.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Strict authorization check
    auth_info = _check_doctor_authorization(db, doctor.id, patient.id)
    if not auth_info["authorized"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update clinical records without active patient consent or emergency override."
        )

    diagnosis = (payload.get("diagnosis") or "").strip()
    medicines = payload.get("medicines", [])
    if not diagnosis:
        raise HTTPException(status_code=400, detail="Diagnosis is required.")
    if not isinstance(medicines, list) or len(medicines) == 0:
        raise HTTPException(status_code=400, detail="At least one medicine is required.")

    visit_date_str = (payload.get("visit_date") or prescription.date_issued.strftime("%Y-%m-%d")).strip()
    clinical_notes = (payload.get("clinical_notes") or "").strip()
    is_critical = bool(payload.get("is_critical", False))

    client_ip, user_agent = get_client_telemetry(request)

    # Update visit if present
    if prescription.visit_id:
        visit = db.query(MedicalVisit).filter(MedicalVisit.id == prescription.visit_id).first()
        if visit:
            visit.diagnosis = diagnosis
            visit.treatment_notes = clinical_notes
            visit.reason = f"Clinical Consultation - {diagnosis}"
            try:
                visit.visit_date = datetime.strptime(visit_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except Exception:
                pass

    prescription_data = {
        "diagnosis": diagnosis,
        "visit_date": visit_date_str,
        "medicines": medicines,
        "clinical_notes": clinical_notes,
        "is_critical": is_critical
    }
    prescription.prescription_text = json.dumps(prescription_data)
    db.commit()
    db.refresh(prescription)

    AuditService.log_event(
        db=db,
        action=AuditAction.RECORD_UPDATE.value,
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else None,
        actor_role="DOCTOR",
        patient_id=patient.id,
        reason=f"Dr. {doctor.full_name} updated prescription #{prescription.id} for {diagnosis}",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    return _format_prescription_response(prescription, db)


