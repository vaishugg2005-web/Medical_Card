# College Presentation & Demo Guide
## AI-Powered Secure Emergency Medical History Access System

Follow these steps for a live presentation to demonstrate the complete end-to-end security and AI triage workflow:

---

### Step 1: Launch Application
Run the unified runner:
```bash
python run_dev.py
```
Open **`http://localhost:8000`** in any browser.

---

### Step 2: Show Level 1 — Public Scan Security Barrier
1. On the landing page, click **"Simulate Public Level-1 QR Scan"** (or scan token `demo-emergency-token-9812`).
2. **Observe**:
   - Patient Name (`Demo Patient`) and ID (`PAT-2026-9812`) are displayed.
   - **Crucial Security Check**: Blood group, allergies, medications, and medical records are **completely hidden**.
   - A clear notice states: *"Verified healthcare provider login required to access medical information."*

---

### Step 3: Physician Login & QR Lookup
1. Click **"Doctor"** in the top navigation or use:
   - Email: `doctor@example.com` | Password: `DoctorDemo123!`
2. Notice the green **VERIFIED** badge.
3. In the QR Lookup box, enter `demo-emergency-token-9812` and click **"Lookup Patient"**.
4. The patient is identified, but clinical records remain protected behind two choices:
   - **Level 2: Normal Care Access** (requires patient consent).
   - **Level 3: Break-Glass Emergency** (for unconscious/crisis situations).

---

### Step 4: Execute Emergency Break-Glass Access
1. Click **"Level 3: Break-Glass Emergency"**.
2. A red modal appears warning that this action is logged and notifies the patient.
3. Select Emergency Category: **"Unconscious Trauma"**.
4. Enter Justification: **"Unconscious victim in motor vehicle collision. Unresponsive, urgent surgical triage required."**
5. Check the confirmation box and click **"Authorize & Unlock Triage"**.

---

### Step 5: High-Contrast Emergency Triage HUD & AI Clinical Summary
Observe the immediate unlock (< 500ms):
- **Blood Group O+** prominently highlighted.
- **Severe Allergies**: Penicillin anaphylaxis alert.
- **Critical Medications**: Warfarin anticoagulant alert with active bleeding warning.
- **AI Clinical Synthesis**: A concise, 100% source-grounded summary synthesized directly from verified records with zero hallucinations.
- **Emergency Session Token**: Valid for 15 minutes.

---

### Step 6: Patient Transparency & SMS Alert
1. Switch to **"Patient"** login:
   - Email: `patient@example.com` | Password: `PatientDemo123!`
2. Go to **"Emergency Access History"**:
   - The patient sees the exact timestamp, attending doctor (`Dr. Rachel Vance`), hospital, and clinical reason.
3. Go to **"Alerts Feed"**:
   - A real-time notification alert is present: *"🚨 Emergency Medical Access Activated"*.
4. Check terminal: The simulated SMS alert was dispatched to the patient's spouse!

---

### Step 7: System Administrator Oversight & Doctor Verification
1. Log in as **"Admin"**:
   - Email: `admin@example.com` | Password: `AdminSecure123!`
2. Review the **Physician Verification Queue**:
   - Notice `Dr. Julian Hayes` has status `PENDING`.
   - Click **"Verify"** to promote him to `VERIFIED`.
3. Review the **System-Wide Immutable Audit Log**:
   - Every single login, scan, and Break-Glass activation is permanently recorded with full telemetry.
