from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.base import Base

class Consent(Base):
    __tablename__ = "consents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True)
    scope = Column(String(50), default="ALL")  # ALL, EMERGENCY_ONLY, CLINICAL_SUMMARY
    status = Column(String(50), default="GRANTED")  # GRANTED, REVOKED, EXPIRED
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="consents")
    doctor = relationship("Doctor", back_populates="consents")


class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    requested_scope = Column(String(50), default="NORMAL_CLINICAL")
    status = Column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED
    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="access_requests")
    doctor = relationship("Doctor", back_populates="access_requests")


class EmergencyAccessEvent(Base):
    __tablename__ = "emergency_access_events"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    hospital_name = Column(String(200), nullable=False)
    reason_category = Column(String(100), nullable=False)  # Unconscious Trauma, Cardiac Arrest, Acute Anaphylaxis
    free_text_justification = Column(Text, nullable=False)
    patient_consent_incapacitated = Column(Boolean, default=True, nullable=False)
    emergency_incident_id = Column(String(100), nullable=True)
    
    # Audit telemetry
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="emergency_events")
    doctor = relationship("Doctor", back_populates="emergency_events")


class QRToken(Base):
    __tablename__ = "qr_tokens"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(100), unique=True, index=True, nullable=False)  # Opaque secure UUID
    status = Column(String(50), default="ACTIVE")  # ACTIVE, REVOKED, EXPIRED
    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    client_entropy_hint = Column(String(50), nullable=True)  # Key fragment hint for E2EE simulation

    patient = relationship("Patient", back_populates="qr_tokens")
