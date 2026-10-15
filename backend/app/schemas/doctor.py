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
    medical_license_number: str
    specialization: str
    hospital_name: str
    verification_status: str
    verification_notes: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    documents: list[DoctorDocumentResponse] = []

    class Config:
        from_attributes = True

class DoctorVerificationUpdate(BaseModel):
    doctor_id: int
    status: str  # VERIFIED, REJECTED, SUSPENDED
    notes: Optional[str] = None

class DoctorStats(BaseModel):
    patients_accessed_count: int
    emergency_access_count: int
    pending_requests_count: int
