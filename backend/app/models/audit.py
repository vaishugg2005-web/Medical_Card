from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, nullable=True, index=True)  # User ID of performer
    actor_email = Column(String(255), nullable=True)
    actor_role = Column(String(50), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., EMERGENCY_BREAK_GLASS
    reason = Column(Text, nullable=True)
    access_scope = Column(String(50), nullable=True)  # LEVEL_1, LEVEL_2, LEVEL_3
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    success = Column(Boolean, default=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    patient = relationship("Patient", back_populates="audit_logs")
