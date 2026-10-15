from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
import os
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_doctor, get_current_verified_doctor, get_client_telemetry
from app.models.doctor import Doctor, DoctorDocument
from app.models.patient import Patient
from app.models.medical import MedicalVisit, Prescription
from app.models.access import EmergencyAccessEvent, AccessRequest, Consent
from app.models.audit import AuditLog
from app.schemas.doctor import DoctorResponse, DoctorStats, DoctorDocumentResponse
from app.schemas.medical import MedicalVisitCreate, MedicalVisitResponse
from app.schemas.audit import AuditLogResponse
from app.services.storage_service import StorageService
from app.services.audit_service import AuditService
from app.core.rbac import AuditAction

router = APIRouter()

@router.get("/me", response_model=DoctorResponse)
def get_doctor_profile(doctor: Doctor = Depends(get_current_doctor)):
    """Returns the authenticated physician's identity, specialization, and verification status."""
    return doctor

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
