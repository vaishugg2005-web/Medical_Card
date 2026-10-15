import random
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.rbac import UserRole, DoctorVerificationStatus, AuditAction
from app.models.user import User
from app.models.patient import Patient, EmergencyContact
from app.models.doctor import Doctor
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    RegisterPatientRequest,
    RegisterDoctorRequest,
    UserResponse
)
from app.services.audit_service import AuditService
from app.services.qr_service import QRService
from app.api.deps import get_current_user, get_client_telemetry

router = APIRouter()

@router.post("/register/patient", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_patient(
    payload: RegisterPatientRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Registers a new patient, establishes their medical profile and primary emergency contact."""
    client_ip, user_agent = get_client_telemetry(request)

    # Check email uniqueness
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

    # 1. Create User
    user = User(
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        role=UserRole.PATIENT.value,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 2. Create Patient Profile
    unique_pat_id = f"PAT-2026-{random.randint(1000, 9999)}"
    patient = Patient(
        user_id=user.id,
        unique_patient_id=unique_pat_id,
        full_name=payload.full_name,
        phone=payload.phone,
        address=payload.address,
        blood_group=payload.blood_group,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        organ_donor=payload.organ_donor,
        dnr_status=payload.dnr_status,
        is_profile_complete=True
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # 3. Create Primary Emergency Contact
    contact = EmergencyContact(
        patient_id=patient.id,
        contact_name=payload.emergency_contact_name,
        relationship_type=payload.emergency_contact_relationship,
        phone_encrypted=payload.emergency_contact_phone,
        priority_order=1,
        is_active=True
    )
    db.add(contact)
    db.commit()

    # 4. Generate initial QR Token
    QRService.generate_token_for_patient(db, patient)

    # 5. Audit Log
    AuditService.log_event(
        db=db,
        action="PATIENT_REGISTRATION",
        actor_id=user.id,
        actor_email=user.email,
        actor_role=user.role,
        patient_id=patient.id,
        reason="Patient self-registration",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        role=user.role,
        patient_id=patient.id,
        unique_patient_id=patient.unique_patient_id
    )

@router.post("/register/doctor", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_doctor(
    payload: RegisterDoctorRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Registers a physician with PENDING status awaiting administrative verification."""
    client_ip, user_agent = get_client_telemetry(request)

    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

    existing_license = db.query(Doctor).filter(Doctor.medical_license_number == payload.medical_license_number).first()
    if existing_license:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Medical license number is already registered.")

    # 1. Create User
    user = User(
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        role=UserRole.DOCTOR.value,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 2. Create Doctor Profile (Default Status: PENDING)
    doctor = Doctor(
        user_id=user.id,
        full_name=payload.full_name,
        phone=payload.phone,
        medical_license_number=payload.medical_license_number,
        specialization=payload.specialization,
        hospital_name=payload.hospital_name,
        government_id_number=payload.government_id_number,
        verification_status=DoctorVerificationStatus.PENDING.value
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    AuditService.log_event(
        db=db,
        action="DOCTOR_REGISTRATION",
        actor_id=user.id,
        actor_email=user.email,
        actor_role=user.role,
        reason=f"Doctor applied for verification: License {doctor.medical_license_number}",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        role=user.role,
        doctor_status=doctor.verification_status
    )

@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Authenticates email and password, returning JWT access token with user claims."""
    client_ip, user_agent = get_client_telemetry(request)
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        AuditService.log_event(
            db=db,
            action=AuditAction.LOGIN.value,
            actor_email=payload.email.lower(),
            reason="Failed password or unknown email",
            ip_address=client_ip,
            user_agent=user_agent,
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    doctor_status = None
    patient_id = None
    unique_pat_id = None

    if user.role == UserRole.DOCTOR.value and user.doctor_profile:
        doctor_status = user.doctor_profile.verification_status
    elif user.role == UserRole.PATIENT.value and user.patient_profile:
        patient_id = user.patient_profile.id
        unique_pat_id = user.patient_profile.unique_patient_id

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    AuditService.log_event(
        db=db,
        action=AuditAction.LOGIN.value,
        actor_id=user.id,
        actor_email=user.email,
        actor_role=user.role,
        reason="Successful authentication",
        ip_address=client_ip,
        user_agent=user_agent,
        success=True
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        role=user.role,
        doctor_status=doctor_status,
        patient_id=patient_id,
        unique_patient_id=unique_pat_id
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Issues a new access token from a valid refresh token."""
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    user_id = int(decoded["sub"])
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    new_access = create_access_token(subject=user.id, role=user.role)
    new_refresh = create_refresh_token(subject=user.id, role=user.role)

    doctor_status = user.doctor_profile.verification_status if user.doctor_profile else None
    patient_id = user.patient_profile.id if user.patient_profile else None
    unique_pat_id = user.patient_profile.unique_patient_id if user.patient_profile else None

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        user_id=user.id,
        email=user.email,
        role=user.role,
        doctor_status=doctor_status,
        patient_id=patient_id,
        unique_patient_id=unique_pat_id
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's core identity."""
    doc_status = current_user.doctor_profile.verification_status if current_user.doctor_profile else None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        doctor_status=doc_status,
        created_at=current_user.created_at
    )
