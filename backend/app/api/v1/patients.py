from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
import os
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_patient, get_current_user
from app.models.user import User
from app.models.patient import Patient, EmergencyContact
from app.models.medical import Allergy, Medication, MedicalCondition, Surgery, MedicalVisit, MedicalDocument
from app.models.access import EmergencyAccessEvent, Consent
from app.models.notification import Notification
from app.services.storage_service import StorageService
from app.schemas.patient import PatientResponse, PatientUpdate, EmergencyContactCreate, EmergencyContactResponse
from app.schemas.medical import (
    AllergyCreate, AllergyResponse,
    MedicationCreate, MedicationResponse,
    ConditionCreate, ConditionResponse,
    SurgeryCreate, SurgeryResponse,
    MedicalVisitResponse, DocumentResponse
)

router = APIRouter()

@router.get("/me", response_model=PatientResponse)
def get_patient_profile(patient: Patient = Depends(get_current_patient)):
    """Returns the patient's personal profile and registered emergency contacts."""
    return patient

@router.put("/me", response_model=PatientResponse)
def update_patient_profile(
    payload: PatientUpdate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Updates non-identifying health directives (blood group, organ donor, DNR, emergency notes)."""
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient

# ==================== Emergency Contacts ====================
@router.post("/me/contacts", response_model=EmergencyContactResponse)
def add_emergency_contact(
    payload: EmergencyContactCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Registers an emergency contact who will receive alerts during break-glass events."""
    contact = EmergencyContact(
        patient_id=patient.id,
        contact_name=payload.contact_name,
        relationship_type=payload.relationship_type,
        phone_encrypted=payload.phone,
        alternate_phone=payload.alternate_phone,
        priority_order=payload.priority_order
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.delete("/me/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_emergency_contact(
    contact_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    contact = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id,
        EmergencyContact.patient_id == patient.id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    db.delete(contact)
    db.commit()

# ==================== Allergies ====================
@router.get("/me/allergies", response_model=List[AllergyResponse])
def get_allergies(patient: Patient = Depends(get_current_patient)):
    return patient.allergies

@router.post("/me/allergies", response_model=AllergyResponse)
def add_allergy(
    payload: AllergyCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    allergy = Allergy(
        patient_id=patient.id,
        allergen=payload.allergen,
        severity=payload.severity,
        reaction=payload.reaction,
        is_critical_flag=payload.is_critical_flag
    )
    db.add(allergy)
    db.commit()
    db.refresh(allergy)
    return allergy

@router.delete("/me/allergies/{allergy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allergy(
    allergy_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    allergy = db.query(Allergy).filter(Allergy.id == allergy_id, Allergy.patient_id == patient.id).first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy record not found.")
    db.delete(allergy)
    db.commit()

# ==================== Medications ====================
@router.get("/me/medications", response_model=List[MedicationResponse])
def get_medications(patient: Patient = Depends(get_current_patient)):
    return patient.medications

@router.post("/me/medications", response_model=MedicationResponse)
def add_medication(
    payload: MedicationCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    med = Medication(
        patient_id=patient.id,
        medicine_name=payload.medicine_name,
        dosage=payload.dosage,
        frequency=payload.frequency,
        route=payload.route,
        is_critical_flag=payload.is_critical_flag,
        start_date=payload.start_date,
        notes=payload.notes,
        is_active=True
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med

@router.delete("/me/medications/{med_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication(
    med_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    med = db.query(Medication).filter(Medication.id == med_id, Medication.patient_id == patient.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication record not found.")
    db.delete(med)
    db.commit()

# ==================== Conditions ====================
@router.get("/me/conditions", response_model=List[ConditionResponse])
def get_conditions(patient: Patient = Depends(get_current_patient)):
    return patient.conditions

@router.post("/me/conditions", response_model=ConditionResponse)
def add_condition(
    payload: ConditionCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    cond = MedicalCondition(
        patient_id=patient.id,
        condition_name=payload.condition_name,
        diagnosis_date=payload.diagnosis_date,
        status=payload.status,
        is_critical_flag=payload.is_critical_flag,
        notes=payload.notes
    )
    db.add(cond)
    db.commit()
    db.refresh(cond)
    return cond

@router.delete("/me/conditions/{cond_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_condition(
    cond_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    cond = db.query(MedicalCondition).filter(MedicalCondition.id == cond_id, MedicalCondition.patient_id == patient.id).first()
    if not cond:
        raise HTTPException(status_code=404, detail="Condition not found.")
    db.delete(cond)
    db.commit()

# ==================== Surgeries ====================
@router.get("/me/surgeries", response_model=List[SurgeryResponse])
def get_surgeries(patient: Patient = Depends(get_current_patient)):
    return patient.surgeries

@router.post("/me/surgeries", response_model=SurgeryResponse)
def add_surgery(
    payload: SurgeryCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    surg = Surgery(
        patient_id=patient.id,
        procedure_name=payload.procedure_name,
        surgery_date=payload.surgery_date,
        hospital=payload.hospital,
        surgeon=payload.surgeon,
        notes=payload.notes
    )
    db.add(surg)
    db.commit()
    db.refresh(surg)
    return surg

@router.delete("/me/surgeries/{surgery_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_surgery(
    surgery_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    surg = db.query(Surgery).filter(Surgery.id == surgery_id, Surgery.patient_id == patient.id).first()
    if not surg:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    db.delete(surg)
    db.commit()

# ==================== Visits & History ====================
@router.get("/me/visits", response_model=List[MedicalVisitResponse])
def get_patient_visits(patient: Patient = Depends(get_current_patient)):
    return patient.visits

# ==================== Emergency Access Transparency ====================
@router.get("/me/emergency-events")
def get_emergency_access_events(patient: Patient = Depends(get_current_patient)):
    """Allows the patient to review every break-glass activation on their records."""
    events = []
    for ev in patient.emergency_events:
        events.append({
            "id": ev.id,
            "doctor_name": ev.doctor.full_name if ev.doctor else "Unknown Doctor",
            "hospital_name": ev.hospital_name,
            "reason_category": ev.reason_category,
            "justification": ev.free_text_justification,
            "accessed_at": ev.created_at,
            "is_active": ev.is_active
        })
    return events

# ==================== Notifications ====================
@router.get("/me/notifications")
def get_notifications(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    return db.query(Notification).filter(Notification.user_id == patient.user_id).order_by(Notification.created_at.desc()).limit(30).all()

# ==================== Medical Documents & Bills ====================
@router.get("/me/documents", response_model=List[DocumentResponse])
def get_patient_documents(patient: Patient = Depends(get_current_patient)):
    """Returns all medical reports, medication bills, and discharge summaries for the patient."""
    return patient.documents

@router.post("/me/documents", response_model=DocumentResponse)
def upload_medical_document(
    title: str = Form(...),
    document_type: str = Form("LAB_REPORT"),  # LAB_REPORT, MEDICATION_BILL, DISCHARGE_SUMMARY, PRESCRIPTION_RECEIPT
    file: UploadFile = File(...),
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Uploads and securely archives medical bills, diagnostic reports, or prescriptions."""
    file_path, file_size, mime_type = StorageService.save_document(file, patient.id)
    doc = MedicalDocument(
        patient_id=patient.id,
        title=title,
        document_type=document_type,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type,
        uploaded_by_user_id=patient.user_id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/me/documents/{doc_id}/download")
def download_patient_document(
    doc_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Securely streams the medical document to the authenticated patient."""
    doc = db.query(MedicalDocument).filter(
        MedicalDocument.id == doc_id,
        MedicalDocument.patient_id == patient.id
    ).first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document not found on storage.")
    return FileResponse(doc.file_path, media_type=doc.mime_type, filename=os.path.basename(doc.file_path))

@router.delete("/me/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient_document(
    doc_id: int,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    doc = db.query(MedicalDocument).filter(
        MedicalDocument.id == doc_id,
        MedicalDocument.patient_id == patient.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass
    db.delete(doc)
    db.commit()

@router.get("/{patient_id}/documents/{doc_id}/download")
def download_patient_document_for_doctor(
    patient_id: int,
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows authorized access to patient document."""
    doc = db.query(MedicalDocument).filter(
        MedicalDocument.id == doc_id,
        MedicalDocument.patient_id == patient_id
    ).first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document not found.")
    return FileResponse(doc.file_path, media_type=doc.mime_type, filename=os.path.basename(doc.file_path))

