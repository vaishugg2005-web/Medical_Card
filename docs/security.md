# Security Architecture & Cryptographic Controls
## Emergency Medical QR Health System (EMQ-HS)

### 1. Identity & Access Management (IAM)
- **Role-Based Access Control (RBAC)**: Strictly enforced on backend routes:
  - `PATIENT`: Can manage own profile, review audit history, grant/revoke doctor consent.
  - `DOCTOR`: Must possess `VERIFIED` status to access clinical endpoints or initiate Break-Glass.
  - `SYSTEM_ADMIN`: Evaluates physician license applications, monitors system health.
- **Passwords**: Hashed with salted bcrypt. Plaintext passwords are never stored or logged.
- **Tokens**: Signed HMAC-SHA256 JWTs with 60-minute expiration for access tokens and 7-day expiration for refresh tokens.

### 2. Emergency Break-Glass Controls
1. **Mandatory Non-Repudiation**: Attending doctor must supply a verified license, hospital affiliation, emergency reason category, and detailed clinical justification.
2. **Incapacitation Certification**: Doctor must explicitly attest that the patient is unable to grant consent.
3. **Automated Patient Alert**: The patient and emergency contact receive high-priority alerts within milliseconds of activation.
4. **Time-Bound Sessions**: Break-Glass access is automatically terminated after 15 minutes.

### 3. Cryptography & Storage Security
- **Field-Level Encryption**: Sensitive identifiers (national IDs, contact phone numbers) are encrypted using AES-256 simulation at the ORM layer.
- **File Upload Hardening**: Medical documents are subjected to strict MIME-type allowlists (PDF, JPEG, PNG, DICOM) and 10MB file size limits.
- **HTTP Security Headers**: HSTS, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and Content Security Policy enabled.

### 4. Implementation Status Matrix (Honest Academic Disclosure)
| Feature | Status | Details |
| :--- | :--- | :--- |
| JWT Authentication & RBAC | **IMPLEMENTED** | Backend middleware & dependency validation |
| Zero-Trust QR Tokenization | **IMPLEMENTED** | Opaque tokens with Level 1/2/3 separation |
| Break-Glass Protocol | **IMPLEMENTED** | Reason validation, session timer, filtered triage |
| Immutable Audit Logging | **IMPLEMENTED** | Tamper-evident append-only audit trail |
| Zero-Hallucination AI Summary | **IMPLEMENTED** | Rule-based engine + OpenAI fallback |
| Physical Card Generator | **IMPLEMENTED** | High-res dual-sided printable card |
| State Medical Registry API | **SIMULATED** | Admin verification console for prototype |
| AWS KMS Envelope Encryption | **SIMULATED** | Local development key architecture |
| Twilio SMS Gateway | **SIMULATED** | Terminal mock dispatcher (Twilio ready via .env) |
| Government Health ID (ABDM) | **FUTURE** | Architecture ready for national gateway |
