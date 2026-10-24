from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
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
from app.core.security import get_password_hash

router = APIRouter()

class AdminProfileUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None

@router.get("/me")
def get_admin_profile(admin: User = Depends(get_current_admin)):
    """(Admin) Returns the authenticated administrator's profile."""
    return {
        "id": admin.id,
        "email": admin.email,
        "role": admin.role,
        "is_active": admin.is_active,
        "created_at": admin.created_at
    }

@router.put("/me")
def update_admin_profile(
    payload: AdminProfileUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Updates administrator email or password."""
    if payload.email and payload.email.lower() != admin.email.lower():
        exists = db.query(User).filter(User.email == payload.email.lower(), User.id != admin.id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email is already registered.")
        admin.email = payload.email.lower()

    if payload.password and len(payload.password.strip()) >= 6:
        admin.hashed_password = get_password_hash(payload.password.strip())

    db.commit()
    db.refresh(admin)
    return {
        "id": admin.id,
        "email": admin.email,
        "role": admin.role,
        "is_active": admin.is_active
    }

@router.get("/doctors", response_model=List[DoctorResponse])
def list_doctors(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Lists all registered physicians and their current verification status."""
    return db.query(Doctor).order_by(Doctor.created_at.desc()).all()

@router.get("/doctor-applications")
def list_doctor_applications(
    status: Optional[str] = None,
    search: Optional[str] = None,
    specialization: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    (Admin) Searchable, filterable verification queue for physician applications
    with real database-backed status counts.
    """
    base_query = db.query(Doctor)

    # Real database counts
    counts = {
        "pending": db.query(Doctor).filter(Doctor.verification_status == "PENDING").count(),
        "under_review": db.query(Doctor).filter(Doctor.verification_status == "UNDER_REVIEW").count(),
        "verified": db.query(Doctor).filter(Doctor.verification_status == "VERIFIED").count(),
        "rejected": db.query(Doctor).filter(Doctor.verification_status == "REJECTED").count(),
        "suspended": db.query(Doctor).filter(Doctor.verification_status == "SUSPENDED").count(),
        "info_requested": db.query(Doctor).filter(Doctor.information_requested.isnot(None), Doctor.information_requested != "").count(),
        "total": db.query(Doctor).count(),
    }

    query = base_query
    if status and status.upper() != "ALL":
        query = query.filter(Doctor.verification_status == status.upper())
    if specialization and specialization.strip():
        query = query.filter(Doctor.specialization.ilike(f"%{specialization.strip()}%"))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Doctor.full_name.ilike(term)) |
            (Doctor.medical_license_number.ilike(term)) |
            (Doctor.application_reference.ilike(term)) |
            (Doctor.hospital_name.ilike(term))
        )

    doctors = query.order_by(Doctor.created_at.desc()).all()
    items = []
    for d in doctors:
        items.append({
            "id": d.id,
            "user_id": d.user_id,
            "email": d.user.email if d.user else None,
            "full_name": d.full_name,
            "phone": d.phone,
            "medical_license_number": d.medical_license_number,
            "registration_authority": d.registration_authority,
            "state_jurisdiction": d.state_jurisdiction,
            "medical_qualification": d.medical_qualification,
            "specialization": d.specialization,
            "hospital_name": d.hospital_name,
            "professional_address": d.professional_address,
            "years_of_experience": d.years_of_experience,
            "application_reference": d.application_reference,
            "verification_status": d.verification_status,
            "verification_notes": d.verification_notes,
            "rejection_reason": d.rejection_reason,
            "information_requested": d.information_requested,
            "verified_at": d.verified_at,
            "created_at": d.created_at,
            "documents_count": len(d.documents),
            "documents": [
                {
                    "id": doc.id,
                    "title": doc.title,
                    "document_type": doc.document_type,
                    "file_size": doc.file_size,
                    "mime_type": doc.mime_type,
                    "created_at": doc.created_at
                } for doc in d.documents
            ]
        })

    return {
        "counts": counts,
        "items": items
    }

@router.get("/doctor-applications/{doctor_id}")
def get_doctor_application_details(
    doctor_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Detailed inspector for a single physician verification dossier."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor application not found.")

    history = db.query(DoctorVerification).filter(
        DoctorVerification.doctor_id == doctor.id
    ).order_by(DoctorVerification.created_at.desc()).all()

    return {
        "doctor": {
            "id": doctor.id,
            "user_id": doctor.user_id,
            "email": doctor.user.email if doctor.user else None,
            "full_name": doctor.full_name,
            "phone": doctor.phone,
            "medical_license_number": doctor.medical_license_number,
            "registration_authority": doctor.registration_authority,
            "state_jurisdiction": doctor.state_jurisdiction,
            "medical_qualification": doctor.medical_qualification,
            "specialization": doctor.specialization,
            "hospital_name": doctor.hospital_name,
            "professional_address": doctor.professional_address,
            "years_of_experience": doctor.years_of_experience,
            "application_reference": doctor.application_reference,
            "verification_status": doctor.verification_status,
            "verification_notes": doctor.verification_notes,
            "rejection_reason": doctor.rejection_reason,
            "information_requested": doctor.information_requested,
            "verified_at": doctor.verified_at,
            "created_at": doctor.created_at,
        },
        "documents": [
            {
                "id": doc.id,
                "title": doc.title,
                "document_type": doc.document_type,
                "file_size": doc.file_size,
                "mime_type": doc.mime_type,
                "created_at": doc.created_at
            } for doc in doctor.documents
        ],
        "history": [
            {
                "id": h.id,
                "reviewer_id": h.reviewer_id,
                "previous_status": h.previous_status,
                "new_status": h.new_status,
                "notes": h.notes,
                "created_at": h.created_at
            } for h in history
        ]
    }

class ReviewActionPayload(BaseModel):
    notes: Optional[str] = None
    reason: Optional[str] = None
    information_requested: Optional[str] = None
    verification_method: Optional[str] = "Administrative Cross-Verification"

@router.post("/doctor-applications/{doctor_id}/review")
def mark_application_under_review(
    doctor_id: int,
    payload: ReviewActionPayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Transitions application to UNDER_REVIEW when administrator begins inspection."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor application not found.")

    prev = doctor.verification_status
    doctor.verification_status = "UNDER_REVIEW"
    if payload.notes:
        doctor.verification_notes = payload.notes

    verif = DoctorVerification(
        doctor_id=doctor.id,
        reviewer_id=admin.id,
        previous_status=prev,
        new_status="UNDER_REVIEW",
        notes=payload.notes or "Application placed under administrative review"
    )
    db.add(verif)
    db.commit()
    db.refresh(doctor)

    NotificationService.send_notification(
        db=db,
        user_id=doctor.user_id,
        title="Verification Application Under Review",
        message="Your professional credentials and license submission are currently being reviewed by the Medora administration team."
    )
    AuditService.log_event(
        db=db,
        action="DOCTOR_REVIEW_STARTED",
        actor_id=admin.id,
        actor_email=admin.email,
        actor_role=admin.role,
        reason="Admin initiated dossier review",
        details=f"Doctor {doctor.full_name} (Ref: {doctor.application_reference})"
    )
    return {"status": "SUCCESS", "verification_status": doctor.verification_status}

@router.post("/doctor-applications/{doctor_id}/approve")
def approve_doctor_application(
    doctor_id: int,
    payload: ReviewActionPayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    (Admin) Formally approves physician credentials.
    Enforces that doctor enters VERIFIED state and becomes eligible for consultation directory.
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor application not found.")

    if doctor.verification_status not in ["PENDING", "UNDER_REVIEW", "UNVERIFIED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve application currently in '{doctor.verification_status}' status."
        )

    prev = doctor.verification_status
    doctor.verification_status = "VERIFIED"
    doctor.verified_at = datetime.now(timezone.utc)
    doctor.verified_by_user_id = admin.id
    doctor.rejection_reason = None
    doctor.information_requested = None
    doctor.verification_notes = payload.notes or f"Approved via {payload.verification_method}"

    verif = DoctorVerification(
        doctor_id=doctor.id,
        reviewer_id=admin.id,
        previous_status=prev,
        new_status="VERIFIED",
        notes=payload.notes or f"Application approved. Method: {payload.verification_method}"
    )
    db.add(verif)
    db.commit()
    db.refresh(doctor)

    NotificationService.send_notification(
        db=db,
        user_id=doctor.user_id,
        title="Medical Practice Verification Approved",
        message="Congratulations! Your professional medical credentials have been approved. Your profile is now visible in the patient consultation directory."
    )
    AuditService.log_event(
        db=db,
        action=AuditAction.DOCTOR_VERIFIED.value,
        actor_id=admin.id,
        actor_email=admin.email,
        actor_role=admin.role,
        reason=f"Admin approved application using {payload.verification_method}",
        details=f"Doctor {doctor.full_name} (License: {doctor.medical_license_number}, Ref: {doctor.application_reference})"
    )
    return {"status": "SUCCESS", "verification_status": "VERIFIED", "verified_at": doctor.verified_at}

@router.post("/doctor-applications/{doctor_id}/reject")
def reject_doctor_application(
    doctor_id: int,
    payload: ReviewActionPayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    (Admin) Rejects physician application with required reason.
    Keeps doctor ineligible for patient directory while preserving application record.
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor application not found.")

    rejection_reason = (payload.reason or payload.notes or "").strip()
    if not rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required to reject an application.")

    prev = doctor.verification_status
    doctor.verification_status = "REJECTED"
    doctor.rejection_reason = rejection_reason
    doctor.verification_notes = payload.notes

    verif = DoctorVerification(
        doctor_id=doctor.id,
        reviewer_id=admin.id,
        previous_status=prev,
        new_status="REJECTED",
        notes=f"Rejected: {rejection_reason}"
    )
    db.add(verif)
    db.commit()
    db.refresh(doctor)

    NotificationService.send_notification(
        db=db,
        user_id=doctor.user_id,
        title="Medical Verification Application Rejected",
        message=f"Your verification application was not approved. Reason: {rejection_reason}. You may correct and resubmit your details from the Doctor Portal."
    )
    AuditService.log_event(
        db=db,
        action=AuditAction.DOCTOR_REJECTED.value,
        actor_id=admin.id,
        actor_email=admin.email,
        actor_role=admin.role,
        reason=f"Rejected: {rejection_reason}",
        details=f"Doctor {doctor.full_name} (License: {doctor.medical_license_number}, Ref: {doctor.application_reference})"
    )
    return {"status": "SUCCESS", "verification_status": "REJECTED", "rejection_reason": rejection_reason}

@router.post("/doctor-applications/{doctor_id}/request-information")
def request_additional_doctor_information(
    doctor_id: int,
    payload: ReviewActionPayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Requests missing or clarifying credentials from physician."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor application not found.")

    info_req = (payload.information_requested or payload.notes or "").strip()
    if not info_req:
        raise HTTPException(status_code=400, detail="Requested information instructions cannot be empty.")

    prev = doctor.verification_status
    doctor.verification_status = "UNDER_REVIEW"
    doctor.information_requested = info_req

    verif = DoctorVerification(
        doctor_id=doctor.id,
        reviewer_id=admin.id,
        previous_status=prev,
        new_status="UNDER_REVIEW",
        notes=f"Additional info requested: {info_req}"
    )
    db.add(verif)
    db.commit()
    db.refresh(doctor)

    NotificationService.send_notification(
        db=db,
        user_id=doctor.user_id,
        title="Action Required: Additional Verification Information Needed",
        message=f"The Medora administration team has requested additional information: {info_req}. Please update your profile to proceed."
    )
    AuditService.log_event(
        db=db,
        action="DOCTOR_INFO_REQUESTED",
        actor_id=admin.id,
        actor_email=admin.email,
        actor_role=admin.role,
        reason="Requested additional credentials/clarification",
        details=f"Doctor {doctor.full_name} - {info_req}"
    )
    return {"status": "SUCCESS", "verification_status": "UNDER_REVIEW", "information_requested": info_req}

@router.post("/doctors/{doctor_id}/suspend")
def suspend_doctor(
    doctor_id: int,
    payload: ReviewActionPayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Suspends doctor consultation privileges immediately."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    prev = doctor.verification_status
    doctor.verification_status = "SUSPENDED"
    doctor.verification_notes = payload.notes or "Account suspended by administrator"

    verif = DoctorVerification(
        doctor_id=doctor.id,
        reviewer_id=admin.id,
        previous_status=prev,
        new_status="SUSPENDED",
        notes=payload.notes or "Doctor suspended"
    )
    db.add(verif)
    db.commit()
    db.refresh(doctor)

    NotificationService.send_notification(
        db=db,
        user_id=doctor.user_id,
        title="Doctor Consultation Privileges Suspended",
        message="Your doctor account has been suspended by administration. Your profile is removed from the consultation directory."
    )
    AuditService.log_event(
        db=db,
        action=AuditAction.DOCTOR_SUSPENDED.value,
        actor_id=admin.id,
        actor_email=admin.email,
        actor_role=admin.role,
        reason=payload.notes or "Administrative suspension",
        details=f"Doctor {doctor.full_name} suspended"
    )
    return {"status": "SUCCESS", "verification_status": "SUSPENDED"}

@router.post("/doctors/{doctor_id}/reinstate")
def reinstate_doctor(
    doctor_id: int,
    payload: ReviewActionPayload,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """(Admin) Reinstates a previously suspended doctor to VERIFIED status."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    prev = doctor.verification_status
    doctor.verification_status = "VERIFIED"
    doctor.verification_notes = payload.notes or "Account reinstated by administrator"

    verif = DoctorVerification(
        doctor_id=doctor.id,
        reviewer_id=admin.id,
        previous_status=prev,
        new_status="VERIFIED",
        notes=payload.notes or "Doctor reinstated"
    )
    db.add(verif)
    db.commit()
    db.refresh(doctor)

    NotificationService.send_notification(
        db=db,
        user_id=doctor.user_id,
        title="Doctor Privileges Reinstated",
        message="Your doctor account has been reinstated. You are once again visible in the patient consultation directory."
    )
    AuditService.log_event(
        db=db,
        action="DOCTOR_REINSTATED",
        actor_id=admin.id,
        actor_email=admin.email,
        actor_role=admin.role,
        reason=payload.notes or "Administrative reinstatement",
        details=f"Doctor {doctor.full_name} reinstated"
    )
    return {"status": "SUCCESS", "verification_status": "VERIFIED"}

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
    if payload.rejection_reason:
        doctor.rejection_reason = payload.rejection_reason
    if payload.information_requested:
        doctor.information_requested = payload.information_requested
    if payload.status == "VERIFIED":
        doctor.verified_at = datetime.now(timezone.utc)
        doctor.verified_by_user_id = admin.id

    # Record verification history
    verif_history = DoctorVerification(
        doctor_id=doctor.id,
        reviewer_id=admin.id,
        previous_status=prev_status,
        new_status=payload.status,
        notes=payload.notes or f"Status set to {payload.status}"
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
        DoctorVerificationStatus.PENDING.value: "DOCTOR_UNVERIFIED",
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
            "registered_at": p.created_at,
            "created_at": p.created_at
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
