from typing import List, Optional
from pydantic import BaseModel

class AISummaryRequest(BaseModel):
    patient_id: int
    session_token: Optional[str] = None

class AISummaryResponse(BaseModel):
    patient_id: int
    patient_name: str
    blood_group: str
    critical_allergies: List[str]
    current_critical_medications: List[str]
    major_conditions: List[str]
    recent_procedures: List[str]
    important_warnings: List[str]
    ai_summary_text: str
    traceable_sources: List[str]
    provider_used: str  # rule_based | openai | ollama
    disclaimer: str = "AI-generated summary strictly synthesized from verified medical records. Do NOT diagnose or infer unrecorded conditions. Verify against original source records."
