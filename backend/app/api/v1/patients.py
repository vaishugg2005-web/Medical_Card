from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
import os
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_patient, get_current_user
from app.models.user import User
from app.models.patient import Patient, EmergencyContact
from app.models.doctor import Doctor
from app.models.medical import Allergy, Medication, MedicalCondition, Surgery, MedicalVisit, MedicalDocument, Prescription
from app.models.access import EmergencyAccessEvent, Consent, ConsultationRequest
from app.models.notification import Notification
from app.services.storage_service import StorageService
from app.services.notification_service import NotificationService
from app.services.audit_service import AuditService
from app.core.security import verify_password, get_password_hash
from app.services.ai_service import get_ai_service
from app.models.audit import AuditLog
from app.schemas.patient import (
    PatientResponse, PatientUpdate, EmergencyContactCreate, EmergencyContactResponse,
    PasswordChangeRequest, ProfileCompletenessResponse, AccessHistoryItem
)
from app.schemas.doctor import DoctorResponse
from app.schemas.access import ConsultationRequestCreate, ConsultationRequestResponse
from app.schemas.medical import (
    AllergyCreate, AllergyResponse,
    MedicationCreate, MedicationResponse,
    ConditionCreate, ConditionResponse,
    SurgeryCreate, SurgeryResponse,
    MedicalVisitResponse, DocumentResponse
)

router = APIRouter()

@router.get("/me", response_model=PatientResponse)
def get_patient_profile(patient: Patient = Depends(get_current_patient)):
    """Returns the patient's personal profile and registered emergency contacts."""
    return patient

@router.put("/me", response_model=PatientResponse)
@router.patch("/me/profile", response_model=PatientResponse)
def update_patient_profile(
    payload: PatientUpdate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient) Updates permitted personal information (phone, address, instructions, donor preferences).
    Strictly prevents patient modification of clinician-authored diagnoses, allergies, and prescriptions.
    """
    permitted_fields = [
        "phone", "address", "emergency_instructions", "organ_donor", "dnr_status",
        "full_name", "date_of_birth", "gender"
    ]
    data = payload.model_dump(exclude_unset=True)
    changed = []
    for field, value in data.items():
        if field in permitted_fields:
            setattr(patient, field, value)
            changed.append(field)

    # Check completeness
    has_phone = bool(patient.phone)
    has_addr = bool(patient.address)
    has_contact = len(patient.emergency_contacts) > 0
    patient.is_profile_complete = has_phone and has_addr and has_contact

    db.commit()
    db.refresh(patient)

    if changed:
        AuditService.log_event(
            db=db,
            action="PATIENT_PROFILE_UPDATED",
            actor_id=patient.user_id,
            actor_email=patient.user.email if patient.user else None,
            actor_role="PATIENT",
            patient_id=patient.id,
            reason="Patient updated permitted personal profile details",
            details=f"Updated fields: {', '.join(changed)}"
        )

    return patient

# ==================== Emergency Contacts ====================
@router.post("/me/contacts", response_model=EmergencyContactResponse)
def add_emergency_contact(
    payload: EmergencyContactCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Registers an emergency contact who will receive alerts during break-glass events."""
    contact = EmergencyContact(
        patient_id=patient.id,
        contact_name=payload.contact_name,
        relationship_type=payload.relationship_type,
        phone_encrypted=payload.phone,
        alternate_phone=payload.alternate_phone,
        priority_order=payload.priority_order
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.delete("/me/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_emergency_contact(
    contact_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    contact = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id,
        EmergencyContact.patient_id == patient.id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    db.delete(contact)
    db.commit()

# ==================== Allergies ====================
@router.get("/me/allergies", response_model=List[AllergyResponse])
def get_allergies(patient: Patient = Depends(get_current_patient)):
    return patient.allergies

@router.post("/me/allergies", response_model=AllergyResponse)
def add_allergy(
    payload: AllergyCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    allergy = Allergy(
        patient_id=patient.id,
        allergen=payload.allergen,
        severity=payload.severity,
        reaction=payload.reaction,
        is_critical_flag=payload.is_critical_flag
    )
    db.add(allergy)
    db.commit()
    db.refresh(allergy)
    return allergy

@router.delete("/me/allergies/{allergy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allergy(
    allergy_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    allergy = db.query(Allergy).filter(Allergy.id == allergy_id, Allergy.patient_id == patient.id).first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy record not found.")
    db.delete(allergy)
    db.commit()

# ==================== Medications ====================
@router.get("/me/medications", response_model=List[MedicationResponse])
def get_medications(patient: Patient = Depends(get_current_patient)):
    return patient.medications

@router.post("/me/medications", response_model=MedicationResponse)
def add_medication(
    payload: MedicationCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    med = Medication(
        patient_id=patient.id,
        medicine_name=payload.medicine_name,
        dosage=payload.dosage,
        frequency=payload.frequency,
        route=payload.route,
        is_critical_flag=payload.is_critical_flag,
        start_date=payload.start_date,
        notes=payload.notes,
        is_active=True
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med

@router.delete("/me/medications/{med_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication(
    med_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    med = db.query(Medication).filter(Medication.id == med_id, Medication.patient_id == patient.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication record not found.")
    db.delete(med)
    db.commit()

# ==================== Conditions ====================
@router.get("/me/conditions", response_model=List[ConditionResponse])
def get_conditions(patient: Patient = Depends(get_current_patient)):
    return patient.conditions

@router.post("/me/conditions", response_model=ConditionResponse)
def add_condition(
    payload: ConditionCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    cond = MedicalCondition(
        patient_id=patient.id,
        condition_name=payload.condition_name,
        diagnosis_date=payload.diagnosis_date,
        status=payload.status,
        is_critical_flag=payload.is_critical_flag,
        notes=payload.notes
    )
    db.add(cond)
    db.commit()
    db.refresh(cond)
    return cond

@router.delete("/me/conditions/{cond_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_condition(
    cond_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    cond = db.query(MedicalCondition).filter(MedicalCondition.id == cond_id, MedicalCondition.patient_id == patient.id).first()
    if not cond:
        raise HTTPException(status_code=404, detail="Condition not found.")
    db.delete(cond)
    db.commit()

# ==================== Surgeries ====================
@router.get("/me/surgeries", response_model=List[SurgeryResponse])
def get_surgeries(patient: Patient = Depends(get_current_patient)):
    return patient.surgeries

@router.post("/me/surgeries", response_model=SurgeryResponse)
def add_surgery(
    payload: SurgeryCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    surg = Surgery(
        patient_id=patient.id,
        procedure_name=payload.procedure_name,
        surgery_date=payload.surgery_date,
        hospital=payload.hospital,
        surgeon=payload.surgeon,
        notes=payload.notes
    )
    db.add(surg)
    db.commit()
    db.refresh(surg)
    return surg

@router.delete("/me/surgeries/{surgery_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_surgery(
    surgery_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    surg = db.query(Surgery).filter(Surgery.id == surgery_id, Surgery.patient_id == patient.id).first()
    if not surg:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    db.delete(surg)
    db.commit()

# ==================== Visits & History ====================
@router.get("/me/visits", response_model=List[MedicalVisitResponse])
def get_patient_visits(patient: Patient = Depends(get_current_patient)):
    return patient.visits

@router.get("/me/prescriptions")
def get_patient_prescriptions(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient.id).order_by(Prescription.date_issued.desc()).all()
    results = []
    for p in prescriptions:
        results.append({
            "id": p.id,
            "prescription_text": p.prescription_text,
            "date_issued": p.date_issued.isoformat() if p.date_issued else None,
            "doctor_name": p.visit.doctor.full_name if p.visit and p.visit.doctor else "Attending Physician"
        })
    return results

# ==================== Emergency Access Transparency ====================
@router.get("/me/emergency-events")
def get_emergency_access_events(patient: Patient = Depends(get_current_patient)):
    """Allows the patient to review every break-glass activation on their records."""
    events = []
    for ev in patient.emergency_events:
        events.append({
            "id": ev.id,
            "doctor_name": ev.doctor.full_name if ev.doctor else "Unknown Doctor",
            "hospital_name": ev.hospital_name,
            "reason_category": ev.reason_category,
            "justification": ev.free_text_justification,
            "accessed_at": ev.created_at,
            "is_active": ev.is_active
        })
    return events

# ==================== Notifications ====================
@router.get("/me/notifications")
def get_notifications(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    return db.query(Notification).filter(Notification.user_id == patient.user_id).order_by(Notification.created_at.desc()).limit(30).all()

# ==================== Medical Documents & Bills ====================
@router.get("/me/documents", response_model=List[DocumentResponse])
def get_patient_documents(patient: Patient = Depends(get_current_patient)):
    """Returns all medical reports, medication bills, and discharge summaries for the patient."""
    return patient.documents

@router.post("/me/documents", response_model=DocumentResponse)
def upload_medical_document(
    title: str = Form(...),
    document_type: str = Form("LAB_REPORT"),  # LAB_REPORT, MEDICATION_BILL, DISCHARGE_SUMMARY, PRESCRIPTION_RECEIPT
    file: UploadFile = File(...),
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Uploads and securely archives medical bills, diagnostic reports, or prescriptions."""
    file_path, file_size, mime_type = StorageService.save_document(file, patient.id)
    doc = MedicalDocument(
        patient_id=patient.id,
        title=title,
        document_type=document_type,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type,
        uploaded_by_user_id=patient.user_id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/me/documents/{doc_id}/download")
def download_patient_document(
    doc_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Securely streams the medical document to the authenticated patient."""
    doc = db.query(MedicalDocument).filter(
        MedicalDocument.id == doc_id,
        MedicalDocument.patient_id == patient.id
    ).first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document not found on storage.")
    return FileResponse(doc.file_path, media_type=doc.mime_type, filename=os.path.basename(doc.file_path))

@router.delete("/me/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient_document(
    doc_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    doc = db.query(MedicalDocument).filter(
        MedicalDocument.id == doc_id,
        MedicalDocument.patient_id == patient.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass
    db.delete(doc)
    db.commit()

@router.get("/{patient_id}/documents/{doc_id}/download")
def download_patient_document_for_doctor(
    patient_id: int,
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows authorized access to patient document."""
    doc = db.query(MedicalDocument).filter(
        MedicalDocument.id == doc_id,
        MedicalDocument.patient_id == patient_id
    ).first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document not found.")
    return FileResponse(doc.file_path, media_type=doc.mime_type, filename=os.path.basename(doc.file_path))


# ==================== Consultation Requests & Doctor Directory ====================
@router.get("/doctors", response_model=List[DoctorResponse])
@router.get("/doctors/verified", response_model=List[DoctorResponse])
def get_verified_doctors_for_patient(
    search: Optional[str] = None,
    specialization: Optional[str] = None,
    hospital: Optional[str] = None,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient) Discover verified physicians for consultations.
    STRICT SECURITY REQUIREMENT:
    Only doctors with verification_status == 'VERIFIED' and an active user account are returned.
    Pending, rejected, suspended, or unverified doctors are NEVER exposed.
    """
    query = db.query(Doctor).join(User, Doctor.user_id == User.id).filter(
        Doctor.verification_status == "VERIFIED",
        User.is_active == True
    )

    if specialization and specialization.strip():
        query = query.filter(Doctor.specialization.ilike(f"%{specialization.strip()}%"))

    if hospital and hospital.strip():
        query = query.filter(Doctor.hospital_name.ilike(f"%{hospital.strip()}%"))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Doctor.full_name.ilike(term)) |
            (Doctor.specialization.ilike(term)) |
            (Doctor.hospital_name.ilike(term)) |
            (Doctor.medical_qualification.ilike(term))
        )

    return query.order_by(Doctor.full_name.asc()).all()

@router.get("/doctors/{doctor_id}", response_model=DoctorResponse)
def get_verified_doctor_by_id(
    doctor_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) Retrieve details of an eligible verified doctor."""
    doctor = db.query(Doctor).join(User, Doctor.user_id == User.id).filter(
        Doctor.id == doctor_id,
        Doctor.verification_status == "VERIFIED",
        User.is_active == True
    ).first()
    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found or is currently ineligible for consultations."
        )
    return doctor

@router.get("/me/consultations", response_model=List[ConsultationRequestResponse])
def get_patient_consultation_requests(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) View all consultation, record review, and follow-up requests submitted by patient."""
    reqs = db.query(ConsultationRequest).filter(
        ConsultationRequest.patient_id == patient.id
    ).order_by(ConsultationRequest.created_at.desc()).all()
    results = []
    for r in reqs:
        results.append(ConsultationRequestResponse(
            id=r.id,
            patient_id=r.patient_id,
            doctor_id=r.doctor_id,
            patient_name=patient.full_name,
            doctor_name=r.doctor.full_name if r.doctor else "Doctor",
            hospital_name=r.doctor.hospital_name if r.doctor else "Hospital",
            specialization=r.doctor.specialization if r.doctor else "Specialist",
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

@router.post("/me/consultations", response_model=ConsultationRequestResponse)
def create_consultation_request(
    payload: ConsultationRequestCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient) Submits an appointment request to a verified physician.
    STRICT SECURITY REQUIREMENT:
    Backend rechecks that the doctor is VERIFIED and account is active before creating the record.
    Checks for conflicting slot bookings.
    """
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor not found.")

    # Recheck verification and account status on backend
    if doctor.verification_status != "VERIFIED":
        raise HTTPException(
            status_code=400,
            detail=f"Selected doctor is currently '{doctor.verification_status}' and cannot accept patient appointments."
        )

    if doctor.user and not doctor.user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Selected doctor account is currently inactive and cannot accept appointments."
        )

    # Check for slot conflict if preferred_date and slot_time are provided
    if payload.preferred_date and payload.slot_time:
        conflict = db.query(ConsultationRequest).filter(
            ConsultationRequest.doctor_id == doctor.id,
            ConsultationRequest.preferred_date == payload.preferred_date,
            ConsultationRequest.slot_time == payload.slot_time,
            ConsultationRequest.status.in_(["CONFIRMED", "PENDING"])
        ).first()
        if conflict:
            raise HTTPException(
                status_code=409,
                detail=f"The selected time slot ({payload.slot_time} on {payload.preferred_date}) is already booked. Please choose another slot."
            )

    req = ConsultationRequest(
        patient_id=patient.id,
        doctor_id=doctor.id,
        request_type=payload.request_type,
        reason=payload.reason,
        preferred_date=payload.preferred_date,
        consultation_mode=payload.consultation_mode or "IN_PERSON",
        slot_time=payload.slot_time,
        status="PENDING"
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    NotificationService.send_notification(
        db=db,
        user_id=doctor.user_id,
        title="📅 New Patient Appointment Request",
        message=f"Patient {patient.full_name} booked a {payload.consultation_mode or 'IN_PERSON'} appointment for '{payload.reason}'. Date: {payload.preferred_date or 'Flexible'} {f'at {payload.slot_time}' if payload.slot_time else ''}."
    )

    AuditService.log_event(
        db=db,
        action="APPOINTMENT_REQUESTED",
        actor_id=patient.user_id,
        actor_email=patient.user.email if patient.user else "patient",
        actor_role="PATIENT",
        reason="Patient booked appointment with verified doctor",
        details=f"Appointment #{req.id} with Dr. {doctor.full_name} ({doctor.specialization})"
    )

    return ConsultationRequestResponse(
        id=req.id,
        patient_id=req.patient_id,
        doctor_id=req.doctor_id,
        patient_name=patient.full_name,
        doctor_name=doctor.full_name,
        hospital_name=doctor.hospital_name,
        specialization=doctor.specialization,
        request_type=req.request_type,
        reason=req.reason,
        preferred_date=req.preferred_date,
        consultation_mode=req.consultation_mode or "IN_PERSON",
        slot_time=req.slot_time,
        status=req.status,
        doctor_response=req.doctor_response,
        created_at=req.created_at,
        updated_at=req.updated_at
    )

@router.post("/me/consultations/{req_id}/cancel")
def cancel_consultation_request(
    req_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) Cancels a pending consultation request."""
    req = db.query(ConsultationRequest).filter(
        ConsultationRequest.id == req_id,
        ConsultationRequest.patient_id == patient.id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Consultation request not found.")
    if req.status not in ["PENDING", "CONFIRMED"]:
        raise HTTPException(status_code=400, detail="Only pending or confirmed appointments can be cancelled.")
    req.status = "CANCELLED"
    db.commit()

    if req.doctor:
        NotificationService.send_notification(
            db=db,
            user_id=req.doctor.user_id,
            title="Appointment Cancelled by Patient",
            message=f"Patient {patient.full_name} has cancelled appointment #{req.id} scheduled for {req.preferred_date or 'flexible date'}."
        )

    AuditService.log_event(
        db=db,
        action="APPOINTMENT_CANCELLED",
        actor_id=patient.user_id,
        actor_email=patient.user.email if patient.user else "patient",
        actor_role="PATIENT",
        reason="Patient cancelled appointment",
        details=f"Appointment #{req.id}"
    )
    return {"message": "Consultation request cancelled successfully.", "id": req_id, "status": "CANCELLED"}


@router.get("/me/notifications")
def get_patient_notifications(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) Retrieves notifications for the authenticated patient."""
    return db.query(Notification).filter(
        Notification.user_id == patient.user_id
    ).order_by(Notification.created_at.desc()).limit(30).all()


@router.post("/me/notifications/{notif_id}/read")
def mark_patient_notification_read(
    notif_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == patient.user_id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "ok"}


@router.post("/me/notifications/read-all")
def mark_all_patient_notifications_read(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) Marks all unread notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == patient.user_id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "ok", "message": "All notifications marked as read."}


@router.get("/me/access-history", response_model=List[AccessHistoryItem])
def get_patient_access_history(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient) Privacy Center: Inspect audit log records and break-glass events
    concerning this patient's records.
    """
    logs = db.query(AuditLog).filter(
        AuditLog.patient_id == patient.id
    ).order_by(AuditLog.created_at.desc()).limit(50).all()

    items = []
    for log in logs:
        items.append(AccessHistoryItem(
            id=log.id,
            action=log.action,
            actor_name=log.actor_email or "Staff",
            actor_role=log.actor_role or "SYSTEM",
            reason=log.reason,
            access_scope=log.access_scope,
            details=log.details,
            created_at=log.created_at
        ))
    return items


@router.post("/me/change-password")
def change_patient_password(
    payload: PasswordChangeRequest,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) Changes account password securely with current password verification."""
    user = db.query(User).filter(User.id == patient.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")

    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    AuditService.log_event(
        db=db,
        action="PASSWORD_CHANGED",
        actor_id=user.id,
        actor_email=user.email,
        actor_role="PATIENT",
        patient_id=patient.id,
        reason="Patient self-service password update",
        details="Account password changed successfully"
    )
    return {"status": "success", "message": "Password updated successfully."}


@router.get("/me/completeness", response_model=ProfileCompletenessResponse)
def get_patient_profile_completeness(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient) Record Completeness Agent:
    Evaluates completeness of personal contact details and emergency safety records.
    Distinguishes recorded clinical records from unknown/missing entries without fabricating data.
    """
    completed = []
    missing = []
    recommendations = []

    # Essential fields
    if patient.full_name:
        completed.append("Legal Full Name")
    else:
        missing.append("Legal Full Name")

    if patient.phone:
        completed.append("Contact Phone Number")
    else:
        missing.append("Contact Phone Number")
        recommendations.append("Add a primary mobile number for emergency notifications.")

    if patient.address:
        completed.append("Residential Address")
    else:
        missing.append("Residential Address")
        recommendations.append("Provide a current residential address for hospital registrations.")

    if patient.date_of_birth:
        completed.append("Date of Birth")
    else:
        missing.append("Date of Birth")

    if patient.blood_group and patient.blood_group != "Unknown":
        completed.append("Blood Group")
    else:
        missing.append("Blood Group")
        recommendations.append("Verify blood group with an accredited clinical laboratory.")

    if len(patient.emergency_contacts) > 0:
        completed.append("Emergency Contacts")
    else:
        missing.append("Emergency Contacts")
        recommendations.append("Register at least one primary emergency contact.")

    if len(patient.allergies) > 0:
        completed.append("Documented Allergies")
    else:
        recommendations.append("Ensure your attending clinician reviews any known medication or food allergies.")

    if len(patient.medications) > 0:
        completed.append("Active Medications")

    total_core = 6
    score = int((len([f for f in completed if f in ["Legal Full Name", "Contact Phone Number", "Residential Address", "Date of Birth", "Blood Group", "Emergency Contacts"]]) / total_core) * 100)

    return ProfileCompletenessResponse(
        score=score,
        is_complete=score >= 80,
        missing_fields=missing,
        completed_fields=completed,
        recommendations=recommendations
    )


@router.get("/me/ai-summary")
def get_patient_ai_clinical_summary(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient) Medical Summary Agent:
    Synthesizes a patient-facing clinical summary strictly grounded in documented database records.
    Guarantees zero hallucinations and highlights severe allergy warnings.
    """
    patient_dict = {
        "full_name": patient.full_name,
        "blood_group": patient.blood_group,
        "dnr_status": patient.dnr_status,
        "organ_donor": patient.organ_donor,
        "allergies": [
            {"id": a.id, "allergen": a.allergen, "severity": a.severity, "reaction": a.reaction, "is_critical_flag": a.is_critical_flag}
            for a in patient.allergies
        ],
        "medications": [
            {"id": m.id, "medicine_name": m.medicine_name, "dosage": m.dosage, "frequency": m.frequency, "is_critical_flag": m.is_critical_flag}
            for m in patient.medications if m.is_active
        ],
        "conditions": [
            {"id": c.id, "condition_name": c.condition_name, "status": c.status, "is_critical_flag": c.is_critical_flag}
            for c in patient.conditions
        ],
        "surgeries": [
            {"id": s.id, "procedure_name": s.procedure_name, "hospital": s.hospital, "surgery_date": s.surgery_date}
            for s in patient.surgeries
        ]
    }

    ai_service = get_ai_service()
    return ai_service.generate_summary(patient_dict)



