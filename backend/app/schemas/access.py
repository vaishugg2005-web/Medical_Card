from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.medical import AllergyResponse, MedicationResponse, ConditionResponse, SurgeryResponse, MedicalVisitResponse
from app.schemas.patient import EmergencyContactResponse

# Consent
class ConsentCreate(BaseModel):
    doctor_id: int
    hospital_id: Optional[int] = None
    scope: str = "ALL"  # ALL, EMERGENCY_ONLY, CLINICAL_SUMMARY
    expires_in_days: int = 30

class ConsentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    scope: str
    status: str
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Access Request
class AccessRequestCreate(BaseModel):
    patient_id: int
    reason: str
    requested_scope: str = "NORMAL_CLINICAL"

class AccessRequestResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    patient_name: Optional[str] = None
    unique_patient_id: Optional[str] = None
    reason: str
    requested_scope: str
    status: str
    requested_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AccessRequestReview(BaseModel):
    status: str  # APPROVED or REJECTED

# Break-Glass Request
class BreakGlassRequest(BaseModel):
    qr_token: str
    hospital_name: str
    reason_category: str  # e.g., "Unconscious Trauma", "Cardiac Arrest", "Acute Anaphylaxis"
    free_text_justification: str  # Mandatory clinical justification
    patient_consent_incapacitated: bool  # Must certify patient is incapacitated
    emergency_incident_id: Optional[str] = None

# Emergency Triage HUD Response (Level 3)
class EmergencyTriageResponse(BaseModel):
    session_token: str
    access_level: str = "LEVEL_3_BREAK_GLASS"
    patient_id: int
    unique_patient_id: str
    full_name: str
    blood_group: str
    organ_donor: bool
    dnr_status: bool
    emergency_instructions: Optional[str] = None
    
    # Critical clinical arrays (Filtered for emergency relevance)
    severe_allergies: List[AllergyResponse] = []
    critical_medications: List[MedicationResponse] = []
    major_conditions: List[ConditionResponse] = []
    recent_surgeries: List[SurgeryResponse] = []
    emergency_contacts: List[EmergencyContactResponse] = []
    
    # AI Summary
    ai_summary: Optional[str] = None
    
    # Audit & Security notices
    expires_at: datetime
    break_glass_warning: str = "Break-glass emergency session active. This access is recorded in immutable audit logs and dispatched to patient emergency proxies."
    can_view_detailed_records: bool = False
    personal_info_masked: bool = True
    privacy_notice: str = "Zero-Trust Privacy Guarantee: Personal contact and address details are concealed during emergency access. Attending staff receives clinical triage data only."


# Patient Consultation Requests
class ConsultationRequestCreate(BaseModel):
    doctor_id: int
    request_type: str = "CONSULTATION"  # CONSULTATION, RECORD_REVIEW, FOLLOW_UP
    consultation_mode: Optional[str] = "IN_PERSON"  # IN_PERSON, TELE_CONSULTATION
    reason: str
    preferred_date: Optional[str] = None
    slot_time: Optional[str] = None

class ConsultationRequestResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    specialization: Optional[str] = None
    request_type: str
    consultation_mode: Optional[str] = "IN_PERSON"
    reason: str
    preferred_date: Optional[str] = None
    slot_time: Optional[str] = None
    status: str
    doctor_response: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ConsultationResponseUpdate(BaseModel):
    status: Optional[str] = None  # ACCEPTED, CONFIRMED, REJECTED, COMPLETED
    doctor_response: Optional[str] = None

