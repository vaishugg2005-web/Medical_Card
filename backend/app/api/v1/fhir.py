from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.core.rbac import UserRole

router = APIRouter()

@router.get("/Patient/{patient_id}")
def get_fhir_patient(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns a simplified HL7 FHIR R4 Patient resource."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="FHIR Patient not found.")

    return {
        "resourceType": "Patient",
        "id": str(patient.id),
        "identifier": [
            {
                "system": "urn:ietf:rfc:3986",
                "value": patient.unique_patient_id
            }
        ],
        "active": True,
        "name": [
            {
                "use": "official",
                "text": patient.full_name
            }
        ],
        "gender": (patient.gender or "unknown").lower(),
        "birthDate": patient.date_of_birth,
        "extension": [
            {
                "url": "http://hl7.org/fhir/StructureDefinition/patient-bloodGroup",
                "valueString": patient.blood_group
            }
        ]
    }

@router.get("/AllergyIntolerance")
def get_fhir_allergies(
    patient: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns FHIR R4 AllergyIntolerance bundle for a patient."""
    p_obj = db.query(Patient).filter(Patient.id == patient).first()
    if not p_obj:
        raise HTTPException(status_code=404, detail="Patient not found.")

    entries = []
    for a in p_obj.allergies:
        entries.append({
            "resource": {
                "resourceType": "AllergyIntolerance",
                "id": str(a.id),
                "clinicalStatus": {
                    "coding": [{"system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", "code": "active"}]
                },
                "criticality": "high" if a.is_critical_flag else "low",
                "code": {
                    "text": a.allergen
                },
                "reaction": [
                    {
                        "manifestation": [{"text": a.reaction or "Severe reaction"}],
                        "severity": a.severity.lower()
                    }
                ]
            }
        })

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries
    }
