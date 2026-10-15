from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

# Allergy
class AllergyCreate(BaseModel):
    allergen: str
    severity: str = "SEVERE_ANAPHYLACTIC"  # MILD, MODERATE, SEVERE_ANAPHYLACTIC
    reaction: Optional[str] = None
    is_critical_flag: bool = True

class AllergyResponse(AllergyCreate):
    id: int
    patient_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Medication
class MedicationCreate(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str
    route: str = "Oral"
    is_critical_flag: bool = True
    start_date: Optional[str] = None
    notes: Optional[str] = None

class MedicationResponse(MedicationCreate):
    id: int
    patient_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Condition
class ConditionCreate(BaseModel):
    condition_name: str
    diagnosis_date: Optional[str] = None
    status: str = "ACTIVE"
    is_critical_flag: bool = True
    notes: Optional[str] = None

class ConditionResponse(ConditionCreate):
    id: int
    patient_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Surgery
class SurgeryCreate(BaseModel):
    procedure_name: str
    surgery_date: Optional[str] = None
    hospital: Optional[str] = None
    surgeon: Optional[str] = None
    notes: Optional[str] = None

class SurgeryResponse(SurgeryCreate):
    id: int
    patient_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Prescription & Visit
class PrescriptionCreate(BaseModel):
    prescription_text: str

class PrescriptionResponse(PrescriptionCreate):
    id: int
    visit_id: Optional[int] = None
    patient_id: int
    doctor_id: Optional[int] = None
    date_issued: datetime

    class Config:
        from_attributes = True

class MedicalVisitCreate(BaseModel):
    reason: str
    diagnosis: Optional[str] = None
    treatment_notes: Optional[str] = None
    prescriptions: List[str] = []

class MedicalVisitResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    visit_date: datetime
    reason: str
    diagnosis: Optional[str] = None
    treatment_notes: Optional[str] = None
    prescriptions: List[PrescriptionResponse] = []

    class Config:
        from_attributes = True

# Document
class DocumentResponse(BaseModel):
    id: int
    patient_id: int
    title: str
    document_type: str
    file_size: int
    mime_type: str
    created_at: datetime

    class Config:
        from_attributes = True
