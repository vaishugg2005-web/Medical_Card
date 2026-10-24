"""
Clinical Catalogue Service
Provides standardized, guideline-aligned medical condition-to-medication mappings,
dosage options, administration routes, and frequencies as a clinical decision aid.
"""

from typing import Dict, List, Any

CLINICAL_CATALOGUE: Dict[str, Dict[str, Any]] = {
    "Hypertension (High Blood Pressure)": {
        "category": "Cardiovascular",
        "icd_code": "I10",
        "medicines": [
            {"name": "Telmisartan", "formulation": "40mg Tablet", "default_dosage": "40mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take in the morning with water"},
            {"name": "Amlodipine", "formulation": "5mg Tablet", "default_dosage": "5mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take at night"},
            {"name": "Losartan", "formulation": "50mg Tablet", "default_dosage": "50mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take with or without food"},
            {"name": "Hydrochlorothiazide", "formulation": "12.5mg Tablet", "default_dosage": "12.5mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take in the morning to avoid nocturia"},
            {"name": "Metoprolol Succinate", "formulation": "25mg Extended-Release Tablet", "default_dosage": "25mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Swallow whole, do not crush"},
            {"name": "Enalapril", "formulation": "5mg Tablet", "default_dosage": "5mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Monitor for persistent dry cough"}
        ]
    },
    "Type 2 Diabetes Mellitus": {
        "category": "Endocrine / Metabolic",
        "icd_code": "E11",
        "medicines": [
            {"name": "Metformin", "formulation": "500mg Extended-Release Tablet", "default_dosage": "500mg", "default_frequency": "Twice daily (BD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take with or immediately after meals"},
            {"name": "Glimepiride", "formulation": "1mg Tablet", "default_dosage": "1mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take before breakfast"},
            {"name": "Sitagliptin", "formulation": "50mg Tablet", "default_dosage": "50mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take with or without food"},
            {"name": "Empagliflozin", "formulation": "10mg Tablet", "default_dosage": "10mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Drink adequate water throughout the day"},
            {"name": "Dapagliflozin", "formulation": "10mg Tablet", "default_dosage": "10mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take in the morning"},
            {"name": "Insulin Glargine", "formulation": "100 units/mL Subcutaneous Solution", "default_dosage": "10 units", "default_frequency": "Once at bedtime (HS)", "default_route": "Subcutaneous", "default_duration": "30 days", "instructions": "Rotate subcutaneous injection sites"}
        ]
    },
    "Bronchial Asthma / COPD": {
        "category": "Respiratory",
        "icd_code": "J45",
        "medicines": [
            {"name": "Salbutamol (Albuterol)", "formulation": "100mcg/puff MDI Inhaler", "default_dosage": "2 puffs", "default_frequency": "As needed (PRN)", "default_route": "Inhalation", "default_duration": "30 days", "instructions": "Use with spacer for acute breathlessness"},
            {"name": "Budesonide", "formulation": "200mcg Inhalation Aerosol", "default_dosage": "1 puff", "default_frequency": "Twice daily (BD)", "default_route": "Inhalation", "default_duration": "30 days", "instructions": "Rinse mouth with water after inhalation"},
            {"name": "Formoterol + Budesonide", "formulation": "6mcg/200mcg DPI Dry Powder", "default_dosage": "1 inhalation", "default_frequency": "Twice daily (BD)", "default_route": "Inhalation", "default_duration": "30 days", "instructions": "Inhale deeply and rinse mouth"},
            {"name": "Montelukast", "formulation": "10mg Tablet", "default_dosage": "10mg", "default_frequency": "Once at bedtime (HS)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take in the evening"}
        ]
    },
    "Bacterial Respiratory / Systemic Infection": {
        "category": "Infectious Disease",
        "icd_code": "J06",
        "medicines": [
            {"name": "Amoxicillin-Clavulanate (Augmentin)", "formulation": "625mg Film-Coated Tablet", "default_dosage": "625mg", "default_frequency": "Twice daily (BD)", "default_route": "Oral", "default_duration": "5-7 days", "instructions": "Complete full prescribed course with meals"},
            {"name": "Azithromycin", "formulation": "500mg Tablet", "default_dosage": "500mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "3-5 days", "instructions": "Take 1 hour before or 2 hours after meals"},
            {"name": "Cefixime", "formulation": "200mg Tablet", "default_dosage": "200mg", "default_frequency": "Twice daily (BD)", "default_route": "Oral", "default_duration": "5-7 days", "instructions": "Take after meals"},
            {"name": "Doxycycline", "formulation": "100mg Capsule", "default_dosage": "100mg", "default_frequency": "Twice daily (BD)", "default_route": "Oral", "default_duration": "7 days", "instructions": "Take with a full glass of water, remain upright for 30m"}
        ]
    },
    "Gastroesophageal Reflux Disease (GERD) & Gastritis": {
        "category": "Gastroenterology",
        "icd_code": "K21",
        "medicines": [
            {"name": "Pantoprazole", "formulation": "40mg Gastro-Resistant Tablet", "default_dosage": "40mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "14 days", "instructions": "Take 30-60 minutes before breakfast"},
            {"name": "Omeprazole", "formulation": "20mg Capsule", "default_dosage": "20mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "14 days", "instructions": "Take before the first meal of the day"},
            {"name": "Rabeprazole", "formulation": "20mg Tablet", "default_dosage": "20mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "14 days", "instructions": "Take on an empty stomach"},
            {"name": "Sucralfate", "formulation": "1g/5mL Oral Suspension", "default_dosage": "10mL", "default_frequency": "Three times daily (TDS)", "default_route": "Oral", "default_duration": "7 days", "instructions": "Take 1 hour before meals and at bedtime"}
        ]
    },
    "Coronary Artery Disease & Dyslipidemia": {
        "category": "Cardiovascular",
        "icd_code": "I25",
        "medicines": [
            {"name": "Atorvastatin", "formulation": "20mg Tablet", "default_dosage": "20mg", "default_frequency": "Once at bedtime (HS)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take at night"},
            {"name": "Rosuvastatin", "formulation": "10mg Tablet", "default_dosage": "10mg", "default_frequency": "Once at bedtime (HS)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take once daily with or without food"},
            {"name": "Aspirin (Ecosprin)", "formulation": "75mg Gastro-Resistant Tablet", "default_dosage": "75mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take after meals to reduce stomach irritation"},
            {"name": "Clopidogrel", "formulation": "75mg Tablet", "default_dosage": "75mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Take with or without food"}
        ]
    },
    "Acute Pain & Musculoskeletal Inflammation": {
        "category": "Orthopedics / Rheumatology",
        "icd_code": "M79",
        "medicines": [
            {"name": "Paracetamol (Acetaminophen)", "formulation": "650mg Tablet", "default_dosage": "650mg", "default_frequency": "Three times daily (TDS)", "default_route": "Oral", "default_duration": "3-5 days", "instructions": "Take after meals, do not exceed 3g in 24 hours"},
            {"name": "Ibuprofen", "formulation": "400mg Tablet", "default_dosage": "400mg", "default_frequency": "Twice daily (BD)", "default_route": "Oral", "default_duration": "3-5 days", "instructions": "Always take with or after food"},
            {"name": "Diclofenac Sodium", "formulation": "50mg Enteric-Coated Tablet", "default_dosage": "50mg", "default_frequency": "Twice daily (BD)", "default_route": "Oral", "default_duration": "3-5 days", "instructions": "Take with food; avoid if history of peptic ulcer"},
            {"name": "Tramadol", "formulation": "50mg Capsule", "default_dosage": "50mg", "default_frequency": "As needed (PRN)", "default_route": "Oral", "default_duration": "3 days", "instructions": "For severe breakthrough pain only"}
        ]
    },
    "Allergic Rhinitis & Dermatitis": {
        "category": "Immunology / Allergy",
        "icd_code": "J30",
        "medicines": [
            {"name": "Cetirizine", "formulation": "10mg Tablet", "default_dosage": "10mg", "default_frequency": "Once at bedtime (HS)", "default_route": "Oral", "default_duration": "7 days", "instructions": "May cause mild drowsiness"},
            {"name": "Levocetirizine", "formulation": "5mg Tablet", "default_dosage": "5mg", "default_frequency": "Once at bedtime (HS)", "default_route": "Oral", "default_duration": "7 days", "instructions": "Take at night"},
            {"name": "Fexofenadine", "formulation": "120mg Tablet", "default_dosage": "120mg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "7 days", "instructions": "Take with water, avoid taking with fruit juices"},
            {"name": "Mometasone Furoate", "formulation": "50mcg/actuation Nasal Spray", "default_dosage": "2 sprays in each nostril", "default_frequency": "Once daily (OD)", "default_route": "Intranasal", "default_duration": "14 days", "instructions": "Shake well before use"}
        ]
    },
    "Hypothyroidism": {
        "category": "Endocrinology",
        "icd_code": "E03",
        "medicines": [
            {"name": "Levothyroxine Sodium", "formulation": "50mcg Tablet", "default_dosage": "50mcg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30-90 days", "instructions": "Take first thing in the morning on an empty stomach with plain water, 30-60 mins before breakfast"},
            {"name": "Levothyroxine Sodium", "formulation": "75mcg Tablet", "default_dosage": "75mcg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30-90 days", "instructions": "Take on an empty stomach"},
            {"name": "Levothyroxine Sodium", "formulation": "100mcg Tablet", "default_dosage": "100mcg", "default_frequency": "Once daily (OD)", "default_route": "Oral", "default_duration": "30-90 days", "instructions": "Take on an empty stomach"}
        ]
    },
    "Migraine & Vascular Headache": {
        "category": "Neurology",
        "icd_code": "G43",
        "medicines": [
            {"name": "Sumatriptan", "formulation": "50mg Tablet", "default_dosage": "50mg", "default_frequency": "At onset of headache", "default_route": "Oral", "default_duration": "As needed", "instructions": "Take at first sign of migraine attack; may repeat once after 2 hours if needed"},
            {"name": "Naproxen Sodium", "formulation": "500mg Tablet", "default_dosage": "500mg", "default_frequency": "Twice daily (BD)", "default_route": "Oral", "default_duration": "3 days", "instructions": "Take with food at onset of attack"},
            {"name": "Propranolol", "formulation": "40mg Tablet", "default_dosage": "40mg", "default_frequency": "Twice daily (BD)", "default_route": "Oral", "default_duration": "30 days", "instructions": "Prophylactic therapy; take regularly"}
        ]
    }
}

DOSAGE_UNITS = [
    "500mg", "650mg", "250mg", "100mg", "50mg", "25mg", "20mg", "10mg", "5mg", "2.5mg",
    "1 Tablet", "2 Tablets", "1 Capsule", "5mL", "10mL", "15mL",
    "1 Puff", "2 Puffs", "10 Units", "20 Units", "1 Patch", "As prescribed"
]

FREQUENCY_OPTIONS = [
    "Once daily (OD)",
    "Twice daily (BD / BID)",
    "Three times daily (TDS / TID)",
    "Four times daily (QID)",
    "Once at bedtime (HS)",
    "Every 8 hours",
    "Every 12 hours",
    "As needed (PRN)",
    "Weekly once"
]

ROUTE_OPTIONS = [
    "Oral",
    "Sublingual",
    "Inhalation",
    "Subcutaneous",
    "Intravenous (IV)",
    "Intramuscular (IM)",
    "Topical",
    "Intranasal",
    "Ophthalmic",
    "Otic"
]

DURATION_OPTIONS = [
    "3 days",
    "5 days",
    "7 days",
    "10 days",
    "14 days",
    "30 days",
    "60 days",
    "90 days",
    "Ongoing / Long-term",
    "Single dose"
]

def get_catalogue_summary() -> Dict[str, Any]:
    return {
        "conditions": list(CLINICAL_CATALOGUE.keys()),
        "catalogue": CLINICAL_CATALOGUE,
        "dosage_units": DOSAGE_UNITS,
        "frequency_options": FREQUENCY_OPTIONS,
        "route_options": ROUTE_OPTIONS,
        "duration_options": DURATION_OPTIONS
    }
