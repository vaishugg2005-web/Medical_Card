from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class EmergencyContactBase(BaseModel):
    contact_name: str
    relationship_type: str
    phone: str
    alternate_phone: Optional[str] = None
    priority_order: int = 1

class EmergencyContactCreate(EmergencyContactBase):
    pass

class EmergencyContactResponse(EmergencyContactBase):
    id: int
    patient_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PatientBase(BaseModel):
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: str
    organ_donor: bool = False
    dnr_status: bool = False
    emergency_instructions: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    identity_doc_url: Optional[str] = None

class PatientCreate(PatientBase):
    national_id: Optional[str] = None

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    organ_donor: Optional[bool] = None
    dnr_status: Optional[bool] = None
    emergency_instructions: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class PatientResponse(PatientBase):
    id: int
    user_id: int
    unique_patient_id: str
    is_profile_complete: bool
    emergency_contacts: List[EmergencyContactResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
