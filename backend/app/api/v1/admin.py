from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_admin
from app.models.user import User
from app.models.doctor import Doctor, DoctorVerification
from app.models.patient import Patient
from app.models.access import EmergencyAccessEvent
from app.models.audit import AuditLog
from app.schemas.doctor import DoctorResponse, DoctorVerificationUpdate
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.core.rbac import AuditAction, DoctorVerificationStatus

router = APIRouter()

@router.get("/doctors", response_model=List[DoctorResponse])
def list_doctors(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Lists all registered physicians and their current verification status."""
    return db.query(Doctor).order_by(Doctor.created_at.desc()).all()

@router.post("/doctors/verify", response_model=DoctorResponse)
def verify_doctor(
    payload: DoctorVerificationUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    (Admin) Updates physician verification status (VERIFIED | REJECTED | SUSPENDED).
    Records verification audit and notifies the doctor.
    """
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    prev_status = doctor.verification_status
    doctor.verification_status = payload.status
    doctor.verification_notes = payload.notes
    doctor.verified_at = datetime.now(timezone.utc)
    doctor.verified_by_user_id = admin.id

    # Record verification history
    verif_history = DoctorVerification(
        doctor_id=doctor.id,
        reviewer_id=admin.id,
        previous_status=prev_status,
        new_status=payload.status,
        notes=payload.notes
    )
    db.add(verif_history)
    db.commit()
    db.refresh(doctor)

    # Notify doctor
    NotificationService.send_notification(
        db=db,
        user_id=doctor.user_id,
        title=f"Doctor Verification Status: {payload.status}",
        message=f"Your medical license verification status has been updated to '{payload.status}'. Notes: {payload.notes or 'None'}"
    )

    action_map = {
        DoctorVerificationStatus.VERIFIED.value: AuditAction.DOCTOR_VERIFIED.value,
        DoctorVerificationStatus.REJECTED.value: AuditAction.DOCTOR_REJECTED.value,
        DoctorVerificationStatus.SUSPENDED.value: AuditAction.DOCTOR_SUSPENDED.value,
    }
    AuditService.log_event(
        db=db,
        action=action_map.get(payload.status, "DOCTOR_STATUS_CHANGED"),
        actor_id=admin.id,
        actor_email=admin.email,
        actor_role=admin.role,
        reason=f"Admin set status from {prev_status} to {payload.status}",
        details=f"Doctor {doctor.full_name} (License {doctor.medical_license_number})"
    )

    return doctor

@router.get("/stats")
def get_system_admin_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Overview metrics for system operations and clinical telemetry."""
    total_patients = db.query(Patient).count()
    total_doctors = db.query(Doctor).count()
    verified_doctors = db.query(Doctor).filter(Doctor.verification_status == DoctorVerificationStatus.VERIFIED.value).count()
    pending_doctors = db.query(Doctor).filter(Doctor.verification_status == DoctorVerificationStatus.PENDING.value).count()
    emergency_events = db.query(EmergencyAccessEvent).count()
    total_audits = db.query(AuditLog).count()

    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "verified_doctors": verified_doctors,
        "pending_doctors": pending_doctors,
        "emergency_access_events_count": emergency_events,
        "total_audit_events": total_audits,
        "system_status": "HEALTHY",
        "timestamp": datetime.now(timezone.utc)
    }

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_system_audit_logs(
    limit: int = 100,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) System-wide immutable compliance audit log inspector."""
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()

@router.get("/emergency-events")
def get_all_emergency_events(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Real-time monitor of all break-glass emergency activations across the system."""
    events = db.query(EmergencyAccessEvent).order_by(EmergencyAccessEvent.created_at.desc()).limit(50).all()
    results = []
    for ev in events:
        results.append({
            "id": ev.id,
            "patient_id": ev.patient_id,
            "patient_name": ev.patient.full_name if ev.patient else "Unknown",
            "doctor_id": ev.doctor_id,
            "doctor_name": ev.doctor.full_name if ev.doctor else "Unknown",
            "hospital_name": ev.hospital_name,
            "reason_category": ev.reason_category,
            "justification": ev.free_text_justification,
            "session_token": ev.session_token,
            "ip_address": ev.ip_address,
            "created_at": ev.created_at,
            "is_active": ev.is_active
        })
    return results

@router.get("/patients")
def get_all_patients(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Overview of all registered patients across the platform."""
    patients = db.query(Patient).order_by(Patient.created_at.desc()).all()
    results = []
    for p in patients:
        results.append({
            "id": p.id,
            "user_id": p.user_id,
            "email": p.user.email if p.user else "N/A",
            "full_name": p.full_name,
            "unique_patient_id": p.unique_patient_id,
            "blood_group": p.blood_group,
            "phone": p.phone or (p.emergency_contacts[0].phone if p.emergency_contacts else "N/A"),
            "allergies_count": len(p.allergies),
            "medications_count": len(p.medications),
            "conditions_count": len(p.conditions),
            "documents_count": len(p.documents),
            "registered_at": p.created_at
        })
    return results

@router.get("/doctors/{doctor_id}/documents")
def get_doctor_submitted_documents(
    doctor_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Inspects official verification documents submitted by a physician."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    return [
        {
            "id": d.id,
            "title": d.title,
            "document_type": d.document_type,
            "file_size": d.file_size,
            "mime_type": d.mime_type,
            "created_at": d.created_at
        } for d in doctor.documents
    ]
