# REST API Documentation
## Emergency Medical QR Health System (EMQ-HS)

Base URL: `/api/v1`  
Interactive Swagger Documentation: `http://localhost:8000/docs`

---

### 1. Authentication (`/auth`)
- `POST /auth/register/patient`: Self-registers patient, assigns `PAT-2026-XXXX`, and issues first QR token.
- `POST /auth/register/doctor`: Registers physician with default `PENDING` verification status.
- `POST /auth/login`: Validates credentials, issues JWT access and refresh tokens.
- `POST /auth/refresh`: Refreshes expired access tokens.
- `GET /auth/me`: Returns current authenticated user object.

---

### 2. QR Code Workflows (`/qr`)
- `POST /qr/generate`: (Patient) Generates or rotates opaque secure QR token.
- `GET /qr/card`: (Patient) Returns complete printable card metadata with high-res base64 QR.
- `GET /qr/resolve/{token}`: **LEVEL 1 PUBLIC SCAN**. Returns non-sensitive identifier and notice that verified doctor login is required.
- `POST /qr/doctor-scan/{token}`: (Doctor) Verifies token, checks doctor verification, and provides access choice buttons.

---

### 3. Access Control & Break-Glass (`/access`)
- `POST /access/emergency`: **LEVEL 3 BREAK-GLASS ACCESS**.
  - Payload: `{ qr_token, hospital_name, reason_category, free_text_justification, patient_consent_incapacitated }`
  - Returns: Filtered emergency triage HUD (blood group, severe allergies, critical meds, emergency contacts, AI summary, 15-min session token).
- `POST /access/request`: (Doctor) Requests normal outpatient clinical consent.
- `GET /access/normal/{patient_id}`: **LEVEL 2 NORMAL CARE**. Checks active consent and returns complete clinical records.
- `GET /access/requests/pending`: (Patient) Lists pending doctor access requests.
- `POST /access/requests/{id}/review`: (Patient) Approves or rejects doctor request.
- `POST /access/consents/revoke/{id}`: (Patient) Immediately revokes active consent.

---

### 4. AI Clinical Summarizer (`/ai`)
- `POST /ai/emergency-summary`: Synthesizes an emergency summary strictly from verified records.
  - Guarantees zero hallucinations and full ground-truth traceability.

---

### 5. Administration (`/admin`)
- `GET /admin/doctors`: Lists all registered doctors.
- `POST /admin/doctors/verify`: Updates doctor status to `VERIFIED`, `REJECTED`, or `SUSPENDED`.
- `GET /admin/stats`: Operational system metrics.
- `GET /admin/audit-logs`: System-wide immutable compliance logs.
- `GET /admin/emergency-events`: Real-time monitor of active Break-Glass emergencies.
