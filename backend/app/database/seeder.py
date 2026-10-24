from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.core.config import settings
from app.core.rbac import UserRole, DoctorVerificationStatus
from app.models.user import User
from app.models.patient import Patient, EmergencyContact
from app.models.doctor import Doctor, Hospital, DoctorDocument
from app.models.medical import Allergy, Medication, MedicalCondition, Surgery, MedicalVisit, MedicalDocument
from app.models.access import QRToken
from app.models.medical_card import MedicalCard
from app.services.qr_service import QRService

def seed_database(db: Session):
    """Populates realistic demo accounts and clinical history for development & presentation."""
    # Check if already seeded
    if db.query(User).filter(User.email == "patient@example.com").first():
        return

    print("🌱 Seeding realistic demo data...")

    # 1. Hospital
    hospital = Hospital(
        name="Metropolitan Trauma & Emergency Center",
        license_number="HOSP-NY-84920",
        address="742 Evergreen Terrace, Trauma Wing A",
        contact_phone="+1 (555) 911-0000",
        contact_email="emergency@metrotrauma.org"
    )
    db.add(hospital)
    db.commit()
    db.refresh(hospital)

    # 2. System Admin
    admin_user = User(
        email="admin@example.com",
        hashed_password=get_password_hash(settings.DEMO_ADMIN_PASSWORD),
        role=UserRole.SYSTEM_ADMIN.value,
        is_active=True
    )
    db.add(admin_user)
    db.commit()

    # 3. Verified Doctor
    doc_user = User(
        email="doctor@example.com",
        hashed_password=get_password_hash(settings.DEMO_DOCTOR_PASSWORD),
        role=UserRole.DOCTOR.value,
        is_active=True
    )
    db.add(doc_user)
    db.commit()
    db.refresh(doc_user)

    doc_profile = Doctor(
        user_id=doc_user.id,
        hospital_id=hospital.id,
        full_name="Dr. Rachel Vance, MD",
        phone="+1 (555) 304-8921",
        medical_license_number="MD-98214-ER",
        specialization="Emergency Medicine & Trauma Resuscitation",
        hospital_name=hospital.name,
        verification_status=DoctorVerificationStatus.VERIFIED.value,
        verified_at=datetime.now(timezone.utc),
        verified_by_user_id=admin_user.id,
        verification_notes="State Medical Board credentials verified and approved."
    )
    db.add(doc_profile)

    # 4. Pending Doctor (For testing admin verification workflow)
    pending_doc_user = User(
        email="pending.doctor@example.com",
        hashed_password=get_password_hash(settings.DEMO_DOCTOR_PASSWORD),
        role=UserRole.DOCTOR.value,
        is_active=True
    )
    db.add(pending_doc_user)
    db.commit()
    db.refresh(pending_doc_user)

    pending_doc_profile = Doctor(
        user_id=pending_doc_user.id,
        full_name="Dr. Julian Hayes, MD",
        phone="+1 (555) 441-2890",
        medical_license_number="MD-77129-INT",
        specialization="Internal Medicine",
        hospital_name="Community Health Clinic",
        verification_status=DoctorVerificationStatus.PENDING.value,
        verification_notes="Awaiting hospital credentialing packet."
    )
    db.add(pending_doc_profile)

    # 5. Demo Patient
    patient_user = User(
        email="patient@example.com",
        hashed_password=get_password_hash(settings.DEMO_PATIENT_PASSWORD),
        role=UserRole.PATIENT.value,
        is_active=True
    )
    db.add(patient_user)
    db.commit()
    db.refresh(patient_user)

    patient_profile = Patient(
        user_id=patient_user.id,
        unique_patient_id="PAT-2026-9812",
        full_name="Demo Patient (Johnathan Doe)",
        blood_group="O+",
        date_of_birth="1989-05-14",
        gender="Male",
        organ_donor=True,
        dnr_status=False,
        emergency_instructions="High risk of severe penicillin anaphylaxis. Currently on Warfarin anticoagulant therapy. Patient wears medical alert bracelet.",
        phone="+1 (555) 019-2830",
        address="742 Evergreen Terrace, Apt 4B, Metro District",
        is_profile_complete=True
    )
    db.add(patient_profile)
    db.commit()
    db.refresh(patient_profile)

    # Doctor Verification Documents
    doc_file1 = DoctorDocument(
        doctor_id=doc_profile.id,
        title="Doctor of Medicine (M.D.) Board Diploma",
        document_type="DEGREE_CERTIFICATE",
        file_path="./storage/medical_documents/demo_doctor_degree.pdf",
        file_size=2048500,
        mime_type="application/pdf"
    )
    doc_file2 = DoctorDocument(
        doctor_id=doc_profile.id,
        title="National Medical Board Active Practice License",
        document_type="COUNCIL_REGISTRATION",
        file_path="./storage/medical_documents/demo_doctor_license.pdf",
        file_size=1152000,
        mime_type="application/pdf"
    )
    doc_file3 = DoctorDocument(
        doctor_id=pending_doc_profile.id,
        title="Internal Medicine Residency Credential Packet",
        document_type="DEGREE_CERTIFICATE",
        file_path="./storage/medical_documents/pending_doctor_packet.pdf",
        file_size=3140000,
        mime_type="application/pdf"
    )
    db.add_all([doc_file1, doc_file2, doc_file3])

    # Patient Medical Documents & Medication Bills
    p_doc1 = MedicalDocument(
        patient_id=patient_profile.id,
        title="Comprehensive Metabolic Panel & INR Lab Report",
        document_type="LAB_REPORT",
        file_path="./storage/medical_documents/demo_patient_lab_inr.pdf",
        file_size=845000,
        mime_type="application/pdf",
        uploaded_by_user_id=patient_user.id
    )
    p_doc2 = MedicalDocument(
        patient_id=patient_profile.id,
        title="Pharmacy Bill & Medication Receipt - Warfarin 5mg",
        document_type="MEDICATION_BILL",
        file_path="./storage/medical_documents/demo_patient_rx_bill.pdf",
        file_size=420000,
        mime_type="application/pdf",
        uploaded_by_user_id=patient_user.id
    )
    p_doc3 = MedicalDocument(
        patient_id=patient_profile.id,
        title="Laparoscopic Appendectomy Surgical Summary",
        document_type="DISCHARGE_SUMMARY",
        file_path="./storage/medical_documents/demo_patient_surgery_summary.pdf",
        file_size=1560000,
        mime_type="application/pdf",
        uploaded_by_user_id=patient_user.id
    )
    db.add_all([p_doc1, p_doc2, p_doc3])

    # Emergency Contact
    contact1 = EmergencyContact(
        patient_id=patient_profile.id,
        contact_name="Sarah Doe (Spouse)",
        relationship_type="Spouse",
        phone_encrypted="+1 (555) 019-2831",
        priority_order=1
    )
    contact2 = EmergencyContact(
        patient_id=patient_profile.id,
        contact_name="Michael Doe (Brother)",
        relationship_type="Sibling",
        phone_encrypted="+1 (555) 019-7744",
        priority_order=2
    )
    db.add_all([contact1, contact2])

    # Allergies
    allergy1 = Allergy(
        patient_id=patient_profile.id,
        allergen="Penicillin",
        severity="SEVERE_ANAPHYLACTIC",
        reaction="Severe respiratory distress, anaphylaxis, angioedema",
        is_critical_flag=True
    )
    allergy2 = Allergy(
        patient_id=patient_profile.id,
        allergen="Sulfa Drugs",
        severity="MODERATE",
        reaction="Widespread urticaria and fever",
        is_critical_flag=True
    )
    allergy3 = Allergy(
        patient_id=patient_profile.id,
        allergen="Shellfish",
        severity="MILD",
        reaction="Mild localized rash",
        is_critical_flag=False
    )
    db.add_all([allergy1, allergy2, allergy3])

    # Medications
    med1 = Medication(
        patient_id=patient_profile.id,
        medicine_name="Warfarin (Coumadin)",
        dosage="5mg",
        frequency="Once daily in evening",
        route="Oral",
        is_critical_flag=True,
        notes="Active anticoagulant therapy — elevated hemorrhagic / bleeding risk in trauma"
    )
    med2 = Medication(
        patient_id=patient_profile.id,
        medicine_name="Insulin Glargine (Lantus)",
        dosage="22 Units",
        frequency="Once daily at bedtime",
        route="Subcutaneous",
        is_critical_flag=True,
        notes="Long-acting basal insulin for Type 1 Diabetes"
    )
    med3 = Medication(
        patient_id=patient_profile.id,
        medicine_name="Metformin",
        dosage="500mg",
        frequency="Twice daily with meals",
        route="Oral",
        is_critical_flag=False,
        notes="Adjuvant glycemic control"
    )
    db.add_all([med1, med2, med3])

    # Conditions
    cond1 = MedicalCondition(
        patient_id=patient_profile.id,
        condition_name="Type 1 Diabetes Mellitus",
        diagnosis_date="2012-04-10",
        status="ACTIVE",
        is_critical_flag=True,
        notes="Insulin dependent. Prone to diabetic ketoacidosis under extreme trauma/stress."
    )
    cond2 = MedicalCondition(
        patient_id=patient_profile.id,
        condition_name="Atrial Fibrillation",
        diagnosis_date="2020-08-15",
        status="ACTIVE",
        is_critical_flag=True,
        notes="Managed with rate control and Warfarin anticoagulation."
    )
    cond3 = MedicalCondition(
        patient_id=patient_profile.id,
        condition_name="Essential Hypertension",
        diagnosis_date="2021-02-19",
        status="ACTIVE",
        is_critical_flag=False,
        notes="Well controlled."
    )
    db.add_all([cond1, cond2, cond3])

    # Surgeries
    surg1 = Surgery(
        patient_id=patient_profile.id,
        procedure_name="Emergency Appendectomy",
        surgery_date="2016-11-20",
        hospital="St. Jude Memorial",
        surgeon="Dr. C. Cuddy",
        notes="Uncomplicated laparoscopic procedure."
    )
    surg2 = Surgery(
        patient_id=patient_profile.id,
        procedure_name="Right ACL Reconstruction",
        surgery_date="2021-06-14",
        hospital="Metropolitan Orthopedics",
        surgeon="Dr. J. Wilson",
        notes="Patellar tendon autograft."
    )
    db.add_all([surg1, surg2])

    # Seed an Initial Active QR Token with a static recognizable token for predictable testing!
    static_token = QRToken(
        patient_id=patient_profile.id,
        token_hash="demo-emergency-token-9812",
        status="ACTIVE",
        issued_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=365),
        client_entropy_hint="demo-ent"
    )
    db.add(static_token)

    demo_card = MedicalCard(
        card_uuid="demo-card-uuid-9812",
        card_number="MED-CARD-2026-9812",
        patient_id=patient_profile.id,
        token_hash=QRService.hash_token("demo-emergency-token-9812"),
        raw_token_preview="demo-emer...9812",
        token_version=1,
        card_status="ACTIVE",
        payload_mode="SECURE_TOKEN",
        payload_schema_version="1.0",
        issued_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=365),
        last_updated_at=datetime.now(timezone.utc),
        issued_by_actor="SYSTEM_SEEDER",
        triage_classification=None,
        emergency_notes=patient_profile.emergency_instructions
    )
    db.add(demo_card)

    db.commit()
    print("✅ Seed complete! Demo accounts ready:")
    print("   👤 Patient:  patient@example.com / " + settings.DEMO_PATIENT_PASSWORD)
    print("   🩺 Doctor:   doctor@example.com / " + settings.DEMO_DOCTOR_PASSWORD)
    print("   🩺 Pending:  pending.doctor@example.com / " + settings.DEMO_DOCTOR_PASSWORD)
    print("   🔑 Admin:    admin@example.com / " + settings.DEMO_ADMIN_PASSWORD)
    print("   🪪 QR Token: demo-emergency-token-9812")
