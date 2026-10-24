import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

PHONE_RE = re.compile(r'^\d{10}$')

def validate_phone(v: Optional[str], field_name: str = 'Phone') -> Optional[str]:
    if v is None:
        return v
    digits = re.sub(r'\D', '', v)
    if len(digits) != 10:
        raise ValueError(f'{field_name} must be exactly 10 digits.')
    return digits

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
    verification_status: Optional[str] = None
    application_reference: Optional[str] = None
    doctor_id: Optional[int] = None
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

    @field_validator('phone')
    @classmethod
    def validate_phone_patient(cls, v):
        return validate_phone(v, 'Phone')

    @field_validator('emergency_contact_phone')
    @classmethod
    def validate_emergency_phone(cls, v):
        digits = re.sub(r'\D', '', v or '')
        if len(digits) != 10:
            raise ValueError('Emergency contact phone must be exactly 10 digits.')
        return digits

class RegisterDoctorRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    medical_license_number: str
    specialization: str
    hospital_name: str
    registration_authority: Optional[str] = "State Medical Council"
    state_jurisdiction: Optional[str] = "National"
    medical_qualification: Optional[str] = "MBBS"
    professional_address: Optional[str] = None
    years_of_experience: Optional[int] = 5
    government_id_number: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def validate_phone_doctor(cls, v):
        digits = re.sub(r'\D', '', v or '')
        if len(digits) != 10:
            raise ValueError('Phone must be exactly 10 digits.')
        return digits

class RegisterAdminRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: str = "HOSPITAL_ADMIN"   # HOSPITAL_ADMIN | SYSTEM_ADMIN — validated on backend
    invite_secret: str             # Must match ADMIN_INVITE_SECRET in server config

    @field_validator('phone')
    @classmethod
    def validate_phone_admin(cls, v):
        return validate_phone(v, 'Phone')

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters.')
        return v

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        allowed = {'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'}
        if v not in allowed:
            raise ValueError('Role must be HOSPITAL_ADMIN or SYSTEM_ADMIN.')
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    doctor_status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
