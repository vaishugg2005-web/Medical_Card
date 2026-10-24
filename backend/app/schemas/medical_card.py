from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class MedicalCardBase(BaseModel):
    card_number: str
    card_status: str
    payload_mode: str
    payload_schema_version: str

class MedicalCardResponse(BaseModel):
    id: int
    card_uuid: str
    card_number: str
    patient_id: int
    card_status: str
    payload_mode: str
    payload_schema_version: str
    raw_token_preview: Optional[str] = None
    token_version: int = 1
    issued_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    last_updated_at: datetime
    issued_by_actor: str = "SYSTEM"
    triage_classification: Optional[str] = None
    emergency_notes: Optional[str] = None
    
    # Associated patient display info
    patient_name: str
    unique_patient_id: str
    blood_group: str
    emergency_contact_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_instructions: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class MedicalCardQRResponse(BaseModel):
    card: MedicalCardResponse
    qr_image_base64: str
    token: Optional[str] = None
    payload_mode: str = "SECURE_TOKEN"
    payload_preview: Optional[Dict[str, Any]] = None
    resolve_url: str

    model_config = ConfigDict(from_attributes=True)

class RotateTokenResponse(BaseModel):
    message: str
    new_token: str
    card: MedicalCardResponse
    qr_image_base64: str

class RevokeCardResponse(BaseModel):
    message: str
    card_number: str
    revoked_at: datetime
    status: str

class CardResolveResponse(BaseModel):
    access_level: str = "LEVEL_1_PUBLIC"
    token_status: str = "ACTIVE"
    is_valid: bool = True
    patient_name: Optional[str] = None
    card_number: Optional[str] = None
    unique_patient_id: Optional[str] = None
    requires_doctor_verification: bool = True
    message: str

class DoctorCardScanResponse(BaseModel):
    token: str
    patient_id: int
    patient_name: str
    unique_patient_id: str
    card_number: str
    blood_group: str
    card_status: str
    is_doctor_verified: bool
    doctor_verification_status: str
    available_actions: list[str]
    notice: str
