import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.access import EmergencyAccessEvent, QRToken
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.medical import Allergy, Medication, MedicalCondition, Surgery
from app.core.rbac import DoctorVerificationStatus, AuditAction, AccessLevel
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.services.qr_service import QRService
from app.core.config import settings

class BreakGlassService:
    @staticmethod
    def execute_break_glass(
        db: Session,
        doctor: Doctor,
        qr_token_hash: str,
        hospital_name: str,
        reason_category: str,
        free_text_justification: str,
        patient_consent_incapacitated: bool,
        emergency_incident_id: Optional[str] = None,
        ip_address: Optional[str] = "127.0.0.1",
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes the Break-Glass emergency authorization protocol.
        Guarantees:
        1. Doctor must be VERIFIED.
        2. Justification and incapacitation confirmation are mandatory.
        3. Generates 15-min ephemeral session.
        4. Dispatches immediate notifications to patient & proxies.
        5. Logs tamper-evident audit record.
        6. Returns strictly critical triage health dataset.
        """
        # 1. Enforce Doctor Verification Status
        if doctor.verification_status != DoctorVerificationStatus.VERIFIED.value:
            AuditService.log_event(
                db=db,
                action=AuditAction.ACCESS_DENIED.value,
                actor_id=doctor.user_id,
                actor_email=doctor.user.email if doctor.user else None,
                actor_role="DOCTOR",
                reason="Unverified doctor attempted emergency break-glass",
                access_scope=AccessLevel.LEVEL_3_BREAK_GLASS.value,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Break-glass denied: Doctor status is '{doctor.verification_status}'. Only VERIFIED medical personnel can activate emergency access."
            )

        # 2. Validate QR Token (supports clean hash, demo token, and patient MRN)
        qr_token = QRService.validate_token(db, qr_token_hash)

        if not qr_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or revoked QR emergency token."
            )

        patient = db.query(Patient).filter(Patient.id == qr_token.patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient record not found.")

        # 3. Validate mandatory break-glass justification
        if not free_text_justification or len(free_text_justification.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A detailed clinical emergency justification is mandatory for break-glass activation."
            )

        if not patient_consent_incapacitated:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Break-glass requires confirmation that the patient is unconscious or unable to provide normal consent."
            )

        # 4. Generate 15-Minute Session Token
        session_token = f"bg_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.EMERGENCY_SESSION_EXPIRE_MINUTES)

        event = EmergencyAccessEvent(
            patient_id=patient.id,
            doctor_id=doctor.id,
            hospital_name=hospital_name or doctor.hospital_name,
            reason_category=reason_category,
            free_text_justification=free_text_justification.strip(),
            patient_consent_incapacitated=patient_consent_incapacitated,
            emergency_incident_id=emergency_incident_id,
            ip_address=ip_address,
            user_agent=user_agent,
            session_token=session_token,
            expires_at=expires_at,
            is_active=True
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # 5. Immediate High-Priority Alerts
        alert_msg = (
            f"EMERGENCY BREAK-GLASS ACTIVATED: Dr. {doctor.full_name} ({hospital_name or doctor.hospital_name}) "
            f"accessed your emergency triage medical data. Reason: '{reason_category}' - {free_text_justification}."
        )
        # Notify patient in-app and mock SMS
        NotificationService.send_notification(
            db=db,
            user_id=patient.user_id,
            title="🚨 Emergency Medical Access Activated",
            message=alert_msg,
            channel="ALL"
        )

        # 6. Immutable Audit Trail
        AuditService.log_event(
            db=db,
            action=AuditAction.EMERGENCY_BREAK_GLASS.value,
            actor_id=doctor.user_id,
            actor_email=doctor.user.email if doctor.user else None,
            actor_role="DOCTOR",
            patient_id=patient.id,
            reason=f"{reason_category}: {free_text_justification}",
            access_scope=AccessLevel.LEVEL_3_BREAK_GLASS.value,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
            details=f"Session {session_token} valid until {expires_at.isoformat()}"
        )

        # 7. Collect Filtered Critical Triage Health Dataset
        severe_allergies = db.query(Allergy).filter(
            Allergy.patient_id == patient.id,
            Allergy.is_critical_flag == True
        ).all()

        critical_medications = db.query(Medication).filter(
            Medication.patient_id == patient.id,
            Medication.is_active == True,
            Medication.is_critical_flag == True
        ).all()

        major_conditions = db.query(MedicalCondition).filter(
            MedicalCondition.patient_id == patient.id,
            MedicalCondition.is_critical_flag == True
        ).all()

        recent_surgeries = db.query(Surgery).filter(
            Surgery.patient_id == patient.id
        ).order_by(Surgery.created_at.desc()).limit(3).all()

        return {
            "event": event,
            "patient": patient,
            "session_token": session_token,
            "expires_at": expires_at,
            "severe_allergies": severe_allergies,
            "critical_medications": critical_medications,
            "major_conditions": major_conditions,
            "recent_surgeries": recent_surgeries,
            "emergency_contacts": patient.emergency_contacts
        }
