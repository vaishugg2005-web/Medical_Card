from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.base import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    unique_patient_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., PAT-2026-9812
    
    # Encrypted fields in DB
    national_id_encrypted = Column(String(255), nullable=True)
    
    # Profile details
    full_name = Column(String(150), nullable=False)
    date_of_birth = Column(String(50), nullable=True)
    gender = Column(String(30), nullable=True)
    blood_group = Column(String(10), nullable=False)  # e.g., O+, A-, B+
    organ_donor = Column(Boolean, default=False)
    dnr_status = Column(Boolean, default=False)       # Do Not Resuscitate order
    emergency_instructions = Column(Text, nullable=True)  # Free-text guidance for first responders
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    identity_doc_url = Column(String(255), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    
    # Metrics / status
    is_profile_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="patient_profile")
    emergency_contacts = relationship("EmergencyContact", back_populates="patient", cascade="all, delete-orphan")
    allergies = relationship("Allergy", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    conditions = relationship("MedicalCondition", back_populates="patient", cascade="all, delete-orphan")
    surgeries = relationship("Surgery", back_populates="patient", cascade="all, delete-orphan")
    visits = relationship("MedicalVisit", back_populates="patient", cascade="all, delete-orphan")
    documents = relationship("MedicalDocument", back_populates="patient", cascade="all, delete-orphan")
    qr_tokens = relationship("QRToken", back_populates="patient", cascade="all, delete-orphan")
    medical_cards = relationship("MedicalCard", back_populates="patient", cascade="all, delete-orphan")
    consents = relationship("Consent", back_populates="patient", cascade="all, delete-orphan")
    access_requests = relationship("AccessRequest", back_populates="patient", cascade="all, delete-orphan")
    emergency_events = relationship("EmergencyAccessEvent", back_populates="patient", cascade="all, delete-orphan")
    consultation_requests = relationship("ConsultationRequest", back_populates="patient", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="patient", cascade="all, delete-orphan")


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_name = Column(String(150), nullable=False)
    relationship_type = Column(String(50), nullable=False)  # Spouse, Parent, Sibling, Friend
    phone_encrypted = Column(String(255), nullable=False)
    alternate_phone = Column(String(50), nullable=True)
    priority_order = Column(Integer, default=1)  # 1 = Primary, 2 = Secondary
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="emergency_contacts")

    @property
    def phone(self) -> str:
        return self.phone_encrypted
