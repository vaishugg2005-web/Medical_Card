from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.core.rbac import DoctorVerificationStatus

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    license_number = Column(String(100), unique=True, nullable=False)
    address = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    doctors = relationship("Doctor", back_populates="hospital")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True)
    
    full_name = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=False)
    medical_license_number = Column(String(100), unique=True, index=True, nullable=False)
    specialization = Column(String(100), nullable=False)
    hospital_name = Column(String(200), nullable=False)
    government_id_number = Column(String(100), nullable=True)
    
    # Professional Information
    registration_authority = Column(String(150), default="State Medical Council", nullable=True)
    state_jurisdiction = Column(String(100), default="National", nullable=True)
    medical_qualification = Column(String(100), default="MBBS", nullable=True)
    professional_address = Column(String(255), nullable=True)
    years_of_experience = Column(Integer, default=5, nullable=True)
    application_reference = Column(String(100), unique=True, index=True, nullable=True)

    # Verification lifecycle & Decisions
    verification_status = Column(String(50), default=DoctorVerificationStatus.PENDING.value, index=True)
    verification_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    information_requested = Column(Text, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verified_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="doctor_profile", foreign_keys=[user_id])
    hospital = relationship("Hospital", back_populates="doctors")
    verifications = relationship("DoctorVerification", back_populates="doctor", cascade="all, delete-orphan")
    visits = relationship("MedicalVisit", back_populates="doctor")
    emergency_events = relationship("EmergencyAccessEvent", back_populates="doctor")
    consents = relationship("Consent", back_populates="doctor")
    access_requests = relationship("AccessRequest", back_populates="doctor")
    consultation_requests = relationship("ConsultationRequest", back_populates="doctor", cascade="all, delete-orphan")
    documents = relationship("DoctorDocument", back_populates="doctor", cascade="all, delete-orphan")


class DoctorVerification(Base):
    __tablename__ = "doctor_verifications"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    previous_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    doctor = relationship("Doctor", back_populates="verifications")


class DoctorDocument(Base):
    __tablename__ = "doctor_documents"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    document_type = Column(String(100), nullable=False)  # DEGREE_CERTIFICATE, COUNCIL_REGISTRATION, HOSPITAL_ID_CARD
    file_path = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/pdf")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    doctor = relationship("Doctor", back_populates="documents")
