from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class QRGenerateResponse(BaseModel):
    token: str
    qr_image_base64: str
    issued_at: datetime
    expires_at: Optional[datetime] = None
    resolve_url: str

class QRResolvePublicResponse(BaseModel):
    access_level: str = "LEVEL_1_PUBLIC"
    token: str
    patient_name: str
    unique_patient_id: str
    emergency_contact_available: bool
    requires_doctor_verification: bool = True
    message: str = "Verified healthcare provider authentication required to access medical information. No clinical records are exposed to public scanners."

class QRCardData(BaseModel):
    patient_name: str
    unique_patient_id: str
    blood_group_masked: str
    qr_image_base64: str
    token: str
    emergency_instructions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
