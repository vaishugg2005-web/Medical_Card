from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.base import Base

class Allergy(Base):
    __tablename__ = "allergies"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    allergen = Column(String(150), nullable=False)  # e.g., Penicillin, Peanuts, Latex, Sulfa drugs
    severity = Column(String(50), default="SEVERE_ANAPHYLACTIC")  # MILD, MODERATE, SEVERE_ANAPHYLACTIC
    reaction = Column(String(255), nullable=True)  # Anaphylaxis, hives, airway closure
    is_critical_flag = Column(Boolean, default=True)  # Highlighted in Emergency Triage
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="allergies")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_name = Column(String(150), nullable=False)  # e.g., Warfarin, Insulin, Metformin
    dosage = Column(String(100), nullable=False)        # 5mg, 20 units
    frequency = Column(String(100), nullable=False)     # Once daily at bedtime
    route = Column(String(50), default="Oral")          # Oral, Subcutaneous, IV
    is_critical_flag = Column(Boolean, default=True)    # Flagged for triage (anticoagulants, insulin, etc.)
    start_date = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="medications")


class MedicalCondition(Base):
    __tablename__ = "medical_conditions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    condition_name = Column(String(200), nullable=False)  # Type 1 Diabetes, Epilepsy, Severe Coronary Disease
    diagnosis_date = Column(String(50), nullable=True)
    status = Column(String(50), default="ACTIVE")         # ACTIVE, RECURRENT, RESOLVED
    is_critical_flag = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="conditions")


class Surgery(Base):
    __tablename__ = "surgeries"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    procedure_name = Column(String(200), nullable=False)  # Coronary Artery Bypass, Appendectomy
    surgery_date = Column(String(50), nullable=True)
    hospital = Column(String(200), nullable=True)
    surgeon = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="surgeries")


class MedicalVisit(Base):
    __tablename__ = "medical_visits"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True)
    visit_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reason = Column(String(255), nullable=False)
    diagnosis = Column(Text, nullable=True)
    treatment_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="visits")
    doctor = relationship("Doctor", back_populates="visits")
    prescriptions = relationship("Prescription", back_populates="visit", cascade="all, delete-orphan")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("medical_visits.id", ondelete="CASCADE"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    prescription_text = Column(Text, nullable=False)
    date_issued = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    visit = relationship("MedicalVisit", back_populates="prescriptions")


class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    document_type = Column(String(100), default="DISCHARGE_SUMMARY")  # LAB_REPORT, DISCHARGE_SUMMARY, ECG, MRI
    file_path = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/pdf")
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="documents")
