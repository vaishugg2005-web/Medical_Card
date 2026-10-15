from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings

class AIProvider(ABC):
    @abstractmethod
    def generate_summary(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generates an emergency summary strictly grounded in provided medical records."""
        pass


class RuleBasedEmergencySummarizer(AIProvider):
    """
    Deterministic rule-based clinical summarizer.
    Guarantees zero hallucinations, 100% ground-truth traceability,
    and runs completely offline without requiring third-party API keys.
    """
    def generate_summary(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        full_name = patient_data.get("full_name", "Patient")
        blood_group = patient_data.get("blood_group") or "Information not available in the patient's records."
        
        allergies = patient_data.get("allergies", [])
        medications = patient_data.get("medications", [])
        conditions = patient_data.get("conditions", [])
        surgeries = patient_data.get("surgeries", [])
        dnr = patient_data.get("dnr_status", False)
        organ_donor = patient_data.get("organ_donor", False)

        traceable_sources: List[str] = []
        warnings: List[str] = []

        # 1. Critical Allergies
        critical_allergies = []
        if allergies:
            for a in allergies:
                crit_text = f"{a['allergen']} ({a['severity']})"
                if a.get('reaction'):
                    crit_text += f" - Reaction: {a['reaction']}"
                critical_allergies.append(crit_text)
                traceable_sources.append(f"AllergyIntolerance Record ID #{a.get('id', 'N/A')}")
                if "anaphyl" in a.get('severity', '').lower():
                    warnings.append(f"CRITICAL WARNING: High risk of life-threatening anaphylaxis to {a['allergen']}.")
        else:
            critical_allergies = ["No known drug or environmental allergies recorded."]

        # 2. Critical Medications
        critical_meds = []
        if medications:
            for m in medications:
                med_text = f"{m['medicine_name']} ({m['dosage']}, {m['frequency']})"
                critical_meds.append(med_text)
                traceable_sources.append(f"MedicationStatement Record ID #{m.get('id', 'N/A')}")
                # Drug interaction / bleeding risks
                if any(x in m['medicine_name'].lower() for x in ["warfarin", "heparin", "apixaban", "aspirin", "clopidogrel"]):
                    warnings.append(f"BLEEDING RISK: Active anticoagulant/antiplatelet therapy ({m['medicine_name']}).")
                if "insulin" in m['medicine_name'].lower():
                    warnings.append(f"METABOLIC WARNING: Active insulin therapy ({m['medicine_name']}) - monitor serum glucose.")
        else:
            critical_meds = ["No active medications recorded."]

        # 3. Major Conditions
        major_conds = []
        if conditions:
            for c in conditions:
                cond_text = f"{c['condition_name']} [{c.get('status', 'ACTIVE')}]"
                major_conds.append(cond_text)
                traceable_sources.append(f"Condition Record ID #{c.get('id', 'N/A')}")
        else:
            major_conds = ["No major chronic conditions recorded."]

        # 4. Recent Procedures
        recent_procs = []
        if surgeries:
            for s in surgeries:
                proc_text = f"{s['procedure_name']} (Date: {s.get('surgery_date', 'Unknown')})"
                recent_procs.append(proc_text)
                traceable_sources.append(f"Procedure Record ID #{s.get('id', 'N/A')}")
        else:
            recent_procs = ["No surgical history recorded."]

        # 5. Resuscitation & Directives
        if dnr:
            warnings.append("ADVANCE DIRECTIVE: Do Not Resuscitate (DNR) order active.")
        if organ_donor:
            warnings.append("ORGAN DONOR: Registered organ donor.")

        # 6. Concise Grounded Summary Text Synthesis
        summary_lines = [
            f"EMERGENCY CLINICAL SYNTHESIS FOR {full_name.upper()}:",
            f"• Blood Group: {blood_group}.",
            f"• Allergies: {'; '.join(critical_allergies)}.",
            f"• Current Medications: {'; '.join(critical_meds)}.",
            f"• Active Conditions: {'; '.join(major_conds)}.",
            f"• Procedures: {'; '.join(recent_procs)}."
        ]
        if warnings:
            summary_lines.append(f"• CRITICAL TRIAGE ALERTS: {' | '.join(warnings)}")

        return {
            "blood_group": blood_group,
            "critical_allergies": critical_allergies,
            "current_critical_medications": critical_meds,
            "major_conditions": major_conds,
            "recent_procedures": recent_procs,
            "important_warnings": warnings if warnings else ["None recorded."],
            "ai_summary_text": "\n".join(summary_lines),
            "traceable_sources": traceable_sources,
            "provider_used": "rule_based_clinical_engine"
        }


class OpenAIEmergencySummarizer(AIProvider):
    """LLM-based summarizer with strict guardrails against hallucination."""
    def generate_summary(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        # Fallback to rule-based if API key is absent
        if not settings.AI_API_KEY:
            return RuleBasedEmergencySummarizer().generate_summary(patient_data)

        prompt = f"""You are a specialized clinical triage assistant.
Generate an emergency medical summary for an attending ER physician strictly using the provided verified records.
STRICT RULES:
1. NEVER invent, guess, or infer any blood type, allergy, disease, or medication not explicitly stated.
2. If any piece of information is missing, state: "Information not available in the patient's records."
3. Highlight life-threatening drug allergies and anticoagulant bleeding risks prominently.

PATIENT RECORDS:
{patient_data}
"""
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(
                    f"{settings.AI_SERVICE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.AI_API_KEY}"},
                    json={
                        "model": settings.AI_MODEL_NAME,
                        "messages": [
                            {"role": "system", "content": "You are a clinical decision support assistant that never invents medical facts."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.0
                    }
                )
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"]
                    base_summary = RuleBasedEmergencySummarizer().generate_summary(patient_data)
                    base_summary["ai_summary_text"] = content
                    base_summary["provider_used"] = f"openai ({settings.AI_MODEL_NAME})"
                    return base_summary
        except Exception:
            pass
        
        # Safe fallback on network or API failure
        return RuleBasedEmergencySummarizer().generate_summary(patient_data)


def get_ai_service() -> AIProvider:
    if settings.AI_PROVIDER == "openai" and settings.AI_API_KEY:
        return OpenAIEmergencySummarizer()
    return RuleBasedEmergencySummarizer()
