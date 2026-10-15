from app.services.ai_service import RuleBasedEmergencySummarizer

def test_ai_summarizer_never_invents_facts():
    """
    CRITICAL AI SAFETY TEST:
    Ensures missing fields explicitly output 'Information not available'
    and never fabricates nonexistent medications, allergies, or diagnoses.
    """
    summarizer = RuleBasedEmergencySummarizer()

    empty_patient = {
        "full_name": "Unknown Jane",
        "blood_group": None,
        "allergies": [],
        "medications": [],
        "conditions": [],
        "surgeries": [],
        "dnr_status": False,
        "organ_donor": False
    }

    summary = summarizer.generate_summary(empty_patient)
    assert summary["blood_group"] == "Information not available in the patient's records."
    assert "No known drug or environmental allergies recorded." in summary["critical_allergies"]
    assert "No active medications recorded." in summary["current_critical_medications"]
    assert "No major chronic conditions recorded." in summary["major_conditions"]

def test_ai_summarizer_highlights_anaphylaxis_and_anticoagulants():
    summarizer = RuleBasedEmergencySummarizer()

    critical_patient = {
        "full_name": "Test Patient",
        "blood_group": "AB-",
        "allergies": [{"id": 1, "allergen": "Penicillin", "severity": "SEVERE_ANAPHYLACTIC", "reaction": "Airway closure"}],
        "medications": [{"id": 2, "medicine_name": "Warfarin", "dosage": "5mg", "frequency": "Daily"}],
        "conditions": [{"id": 3, "condition_name": "Atrial Fibrillation", "status": "ACTIVE"}],
        "surgeries": [],
        "dnr_status": True,
        "organ_donor": False
    }

    summary = summarizer.generate_summary(critical_patient)
    assert summary["blood_group"] == "AB-"
    assert any("anaphylaxis" in w.lower() for w in summary["important_warnings"])
    assert any("bleeding risk" in w.lower() for w in summary["important_warnings"])
    assert any("dnr" in w.lower() for w in summary["important_warnings"])
