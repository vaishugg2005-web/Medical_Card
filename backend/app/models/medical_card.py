from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.base import Base

class MedicalCard(Base):
    __tablename__ = "medical_cards"

    id = Column(Integer, primary_key=True, index=True)
    card_uuid = Column(String(36), unique=True, index=True, nullable=False)
    card_number = Column(String(50), index=True, nullable=False)  # e.g., MED-CARD-2026-9812
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Cryptographic token representation
    token_hash = Column(String(128), unique=True, index=True, nullable=False)  # SHA-256 hash of opaque token
    raw_token_preview = Column(String(20), nullable=True)  # Safe masked prefix, e.g. "med_tok_...9812"
    token_version = Column(Integer, default=1, nullable=False)
    
    # Status and mode
    card_status = Column(String(50), default="ACTIVE", index=True, nullable=False)  # ACTIVE, REVOKED, EXPIRED
    payload_mode = Column(String(50), default="SECURE_TOKEN", nullable=False)  # SECURE_TOKEN, ENCRYPTED_PAYLOAD
    payload_schema_version = Column(String(20), default="1.0", nullable=False)
    
    # Timestamps
    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    last_updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Actor & Clinical Classification
    issued_by_actor = Column(String(100), default="SYSTEM", nullable=False)
    triage_classification = Column(String(50), nullable=True)  # Only populated if clinically authorized
    emergency_notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="medical_cards")
