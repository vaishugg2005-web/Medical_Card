from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    patient_id: Optional[int] = None
    action: str
    reason: Optional[str] = None
    access_scope: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditSummary(BaseModel):
    total_logs: int
    emergency_access_count: int
    normal_access_count: int
    unauthorized_attempts: int
