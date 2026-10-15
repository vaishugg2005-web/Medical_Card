from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import decode_token
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.core.rbac import UserRole, DoctorVerificationStatus

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_client_telemetry(request: Request) -> Tuple[str, str]:
    """Extracts client IP address and user-agent header for audit trail."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    user_agent = request.headers.get("user-agent", "Unknown-Client")
    return client_ip, user_agent

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Authenticates the bearer JWT token and returns the current user."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive."
        )
    return user

def get_current_patient(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Patient:
    """Enforces that the current authenticated user is a PATIENT."""
    if current_user.role != UserRole.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Patient privileges required."
        )
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found."
        )
    return patient

def get_current_doctor(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Doctor:
    """Enforces that the current authenticated user is a DOCTOR."""
    if current_user.role != UserRole.DOCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Doctor privileges required."
        )
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found."
        )
    return doctor

def get_current_verified_doctor(
    doctor: Doctor = Depends(get_current_doctor)
) -> Doctor:
    """Enforces that the doctor is VERIFIED before permitting clinical actions."""
    if doctor.verification_status != DoctorVerificationStatus.VERIFIED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Action prohibited: Doctor verification status is '{doctor.verification_status}'. Medical credentials must be verified by hospital/system admin."
        )
    return doctor

def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Enforces that the current user has administrative rights."""
    if current_user.role not in [UserRole.SYSTEM_ADMIN.value, UserRole.HOSPITAL_ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: System Administrator access required."
        )
    return current_user
