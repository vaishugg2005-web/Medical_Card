from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        action: str,
        actor_id: Optional[int] = None,
        actor_email: Optional[str] = None,
        actor_role: Optional[str] = None,
        patient_id: Optional[int] = None,
        reason: Optional[str] = None,
        access_scope: Optional[str] = None,
        ip_address: Optional[str] = "127.0.0.1",
        user_agent: Optional[str] = None,
        success: bool = True,
        details: Optional[str] = None
    ) -> AuditLog:
        """
        Records an immutable audit trail entry for compliance and patient transparency.
        """
        audit_entry = AuditLog(
            actor_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            patient_id=patient_id,
            action=action,
            reason=reason,
            access_scope=access_scope,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            details=details
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
