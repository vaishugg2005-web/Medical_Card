from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class DoctorDocumentResponse(BaseModel):
    id: int
    doctor_id: int
    title: str
    document_type: str
    file_path: str
    file_size: int
    mime_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class DoctorResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone: str
    email: Optional[str] = None
    medical_license_number: str
    registration_authority: Optional[str] = None
    state_jurisdiction: Optional[str] = None
    medical_qualification: Optional[str] = None
    specialization: str
    hospital_name: str
    professional_address: Optional[str] = None
    years_of_experience: Optional[int] = 5
    application_reference: Optional[str] = None
    verification_status: str
    verification_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    information_requested: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    documents: list[DoctorDocumentResponse] = []

    class Config:
        from_attributes = True

class DoctorVerificationUpdate(BaseModel):
    doctor_id: int
    status: str  # PENDING, UNDER_REVIEW, VERIFIED, REJECTED, SUSPENDED, UNVERIFIED
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    information_requested: Optional[str] = None
    verification_method: Optional[str] = "Administrative Cross-Verification"

class DoctorVerificationReviewRequest(BaseModel):
    action: str  # APPROVE, REJECT, REQUEST_INFO, SUSPEND, REINSTATE, REVIEW
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    information_requested: Optional[str] = None
    verification_method: Optional[str] = "Administrative Cross-Verification"

class DoctorStats(BaseModel):
    patients_accessed_count: int
    emergency_access_count: int
    pending_requests_count: int

class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    hospital_name: Optional[str] = None
    medical_license_number: Optional[str] = None
