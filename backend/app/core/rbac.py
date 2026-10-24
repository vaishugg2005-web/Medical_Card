from enum import Enum
from typing import List

class UserRole(str, Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
    SYSTEM_ADMIN = "SYSTEM_ADMIN"

class DoctorVerificationStatus(str, Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"
    UNVERIFIED = "UNVERIFIED"

class AccessLevel(str, Enum):
    LEVEL_1_PUBLIC = "LEVEL_1_PUBLIC"            # Minimal QR lookup (No medical data)
    LEVEL_2_NORMAL = "LEVEL_2_NORMAL"            # Consented doctor access
    LEVEL_3_BREAK_GLASS = "LEVEL_3_BREAK_GLASS"  # Emergency triage access

class AuditAction(str, Enum):
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    QR_GENERATED = "QR_GENERATED"
    QR_SCANNED = "QR_SCANNED"
    ACCESS_REQUESTED = "ACCESS_REQUESTED"
    ACCESS_GRANTED = "ACCESS_GRANTED"
    ACCESS_DENIED = "ACCESS_DENIED"
    EMERGENCY_BREAK_GLASS = "EMERGENCY_BREAK_GLASS"
    RECORD_VIEW = "RECORD_VIEW"
    RECORD_ACCESS = "RECORD_ACCESS"
    RECORD_UPDATE = "RECORD_UPDATE"
    RECORD_DOWNLOAD = "RECORD_DOWNLOAD"
    CONSENT_GRANTED = "CONSENT_GRANTED"
    CONSENT_REJECTED = "CONSENT_REJECTED"
    CONSENT_REVOKED = "CONSENT_REVOKED"
    DOCTOR_VERIFIED = "DOCTOR_VERIFIED"
    DOCTOR_REJECTED = "DOCTOR_REJECTED"
    DOCTOR_SUSPENDED = "DOCTOR_SUSPENDED"
    AI_SUMMARY_GENERATED = "AI_SUMMARY_GENERATED"

class RBACPolicy:
    """Enforces fine-grained permission rules across system endpoints."""
    
    @staticmethod
    def is_admin(role: str) -> bool:
        return role in [UserRole.SYSTEM_ADMIN.value, UserRole.HOSPITAL_ADMIN.value]

    @staticmethod
    def is_doctor(role: str) -> bool:
        return role == UserRole.DOCTOR.value

    @staticmethod
    def is_patient(role: str) -> bool:
        return role == UserRole.PATIENT.value

    @staticmethod
    def can_access_patient_records(requester_role: str, requester_id: int, patient_user_id: int, has_active_consent: bool, is_emergency: bool) -> bool:
        """
        Determines whether a requester is allowed to view patient health data.
        1. Patient can view their own data.
        2. System Admin can view audit metadata, not clinical records.
        3. Doctor can view if active consent exists OR active break-glass session exists.
        """
        if requester_role == UserRole.PATIENT.value and requester_id == patient_user_id:
            return True
        if requester_role == UserRole.DOCTOR.value and (has_active_consent or is_emergency):
            return True
        return False
