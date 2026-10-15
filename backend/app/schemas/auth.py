from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    role: str
    doctor_status: Optional[str] = None
    patient_id: Optional[int] = None
    unique_patient_id: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RegisterPatientRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    blood_group: str  # O+, O-, A+, A-, B+, B-, AB+, AB-
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    emergency_contact_name: str
    emergency_contact_phone: str
    emergency_contact_relationship: str
    organ_donor: bool = False
    dnr_status: bool = False

class RegisterDoctorRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    medical_license_number: str
    specialization: str
    hospital_name: str
    government_id_number: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    doctor_status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
