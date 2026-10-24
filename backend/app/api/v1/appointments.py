from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_user, get_current_patient, get_current_doctor
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.access import ConsultationRequest
from app.schemas.access import (
    ConsultationRequestCreate,
    ConsultationRequestResponse,
    ConsultationResponseUpdate
)
from app.services.notification_service import NotificationService
from app.services.audit_service import AuditService

router = APIRouter()

@router.post("", response_model=ConsultationRequestResponse)
def create_appointment(
    payload: ConsultationRequestCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    (Patient) Books an appointment with a verified doctor.
    Enforces that:
    1. Doctor is VERIFIED.
    2. Doctor account is active.
    3. Time slot is not already booked.
    """
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor not found.")

    if doctor.verification_status != "VERIFIED":
        raise HTTPException(
            status_code=400,
            detail=f"Doctor is currently '{doctor.verification_status}' and cannot accept patient appointments."
        )

    if doctor.user and not doctor.user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Doctor account is inactive."
        )

    # Check for slot conflict
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

@router.get("/patient", response_model=List[ConsultationRequestResponse])
def get_patient_appointments(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """(Patient) View all appointments for the current patient."""
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

@router.get("/doctor", response_model=List[ConsultationRequestResponse])
def get_doctor_appointments(
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """(Doctor) View all appointment requests assigned to this doctor."""
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

@router.get("/{appointment_id}", response_model=ConsultationRequestResponse)
def get_appointment_by_id(
    appointment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """(Authorized Patient or Doctor) Inspect a single appointment record."""
    req = db.query(ConsultationRequest).filter(ConsultationRequest.id == appointment_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    # Authorization check
    is_patient = req.patient and req.patient.user_id == user.id
    is_doctor = req.doctor and req.doctor.user_id == user.id
    is_admin = user.role == "ADMIN"

    if not (is_patient or is_doctor or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to view this appointment.")

    return ConsultationRequestResponse(
        id=req.id,
        patient_id=req.patient_id,
        doctor_id=req.doctor_id,
        patient_name=req.patient.full_name if req.patient else "Patient",
        doctor_name=req.doctor.full_name if req.doctor else "Doctor",
        hospital_name=req.doctor.hospital_name if req.doctor else "Hospital",
        specialization=req.doctor.specialization if req.doctor else "Specialist",
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

@router.post("/{appointment_id}/accept", response_model=ConsultationRequestResponse)
def accept_appointment(
    appointment_id: int,
    payload: Optional[ConsultationResponseUpdate] = None,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """(Doctor) Confirms and accepts an appointment."""
    if doctor.verification_status != "VERIFIED":
        raise HTTPException(status_code=403, detail="Doctor is not verified to accept appointments.")

    req = db.query(ConsultationRequest).filter(
        ConsultationRequest.id == appointment_id,
        ConsultationRequest.doctor_id == doctor.id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    req.status = "CONFIRMED"
    if payload and payload.doctor_response:
        req.doctor_response = payload.doctor_response
    req.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)

    NotificationService.send_notification(
        db=db,
        user_id=req.patient.user_id,
        title="Appointment Confirmed",
        message=f"Dr. {doctor.full_name} has CONFIRMED your appointment on {req.preferred_date or 'scheduled date'}."
    )
    AuditService.log_event(
        db=db,
        action="APPOINTMENT_CONFIRMED",
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else "doctor",
        actor_role="DOCTOR",
        reason="Doctor accepted appointment",
        details=f"Appointment #{req.id} confirmed"
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

@router.post("/{appointment_id}/reject", response_model=ConsultationRequestResponse)
def reject_appointment(
    appointment_id: int,
    payload: Optional[ConsultationResponseUpdate] = None,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """(Doctor) Rejects an appointment request."""
    req = db.query(ConsultationRequest).filter(
        ConsultationRequest.id == appointment_id,
        ConsultationRequest.doctor_id == doctor.id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    req.status = "REJECTED"
    if payload and payload.doctor_response:
        req.doctor_response = payload.doctor_response
    req.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)

    NotificationService.send_notification(
        db=db,
        user_id=req.patient.user_id,
        title="Appointment Declined",
        message=f"Dr. {doctor.full_name} was unable to accept your appointment request. Reason: {req.doctor_response or 'Physician unavailable'}."
    )
    AuditService.log_event(
        db=db,
        action="APPOINTMENT_REJECTED",
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else "doctor",
        actor_role="DOCTOR",
        reason="Doctor declined appointment",
        details=f"Appointment #{req.id} declined"
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

@router.post("/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """(Patient or Doctor) Cancels an appointment."""
    req = db.query(ConsultationRequest).filter(ConsultationRequest.id == appointment_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    is_patient = req.patient and req.patient.user_id == user.id
    is_doctor = req.doctor and req.doctor.user_id == user.id
    if not (is_patient or is_doctor or user.role == "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment.")

    if req.status in ["CANCELLED", "COMPLETED"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel appointment already '{req.status}'.")

    req.status = "CANCELLED"
    req.updated_at = datetime.now(timezone.utc)
    db.commit()

    # Notify opposite party
    if is_patient and req.doctor:
        NotificationService.send_notification(
            db=db,
            user_id=req.doctor.user_id,
            title="Appointment Cancelled",
            message=f"Patient {req.patient.full_name if req.patient else 'Patient'} cancelled appointment #{req.id}."
        )
    elif is_doctor and req.patient:
        NotificationService.send_notification(
            db=db,
            user_id=req.patient.user_id,
            title="Appointment Cancelled by Doctor",
            message=f"Dr. {req.doctor.full_name if req.doctor else 'Doctor'} had to cancel appointment #{req.id}."
        )

    AuditService.log_event(
        db=db,
        action="APPOINTMENT_CANCELLED",
        actor_id=user.id,
        actor_email=user.email,
        actor_role=user.role,
        reason="Appointment cancelled",
        details=f"Appointment #{req.id} cancelled by {user.role}"
    )
    return {"message": "Appointment cancelled successfully.", "id": appointment_id, "status": "CANCELLED"}

@router.post("/{appointment_id}/complete")
def complete_appointment(
    appointment_id: int,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """(Doctor) Marks appointment as completed."""
    req = db.query(ConsultationRequest).filter(
        ConsultationRequest.id == appointment_id,
        ConsultationRequest.doctor_id == doctor.id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    req.status = "COMPLETED"
    req.updated_at = datetime.now(timezone.utc)
    db.commit()

    NotificationService.send_notification(
        db=db,
        user_id=req.patient.user_id,
        title="Consultation Completed",
        message=f"Your consultation #{req.id} with Dr. {doctor.full_name} has been concluded."
    )
    AuditService.log_event(
        db=db,
        action="APPOINTMENT_COMPLETED",
        actor_id=doctor.user_id,
        actor_email=doctor.user.email if doctor.user else "doctor",
        actor_role="DOCTOR",
        reason="Doctor completed appointment consultation",
        details=f"Appointment #{req.id} concluded"
    )
    return {"message": "Appointment completed.", "id": appointment_id, "status": "COMPLETED"}
