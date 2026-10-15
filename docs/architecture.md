# System Architecture Specification
## Emergency Medical QR Health System (EMQ-HS)

### 1. Architectural Philosophy
The core tenet of EMQ-HS is **compartmentalized least-privilege healthcare data delivery**:
> *"Fast access to critical emergency medical information without giving unrestricted access to the patient's complete medical history."*

### 2. Zero-Trust QR Tokenization
- **Physical QR Contents**: An opaque UUID lookup token (`demo-emergency-token-9812`).
- **No PHI/PII on Card**: Blood group, allergies, medications, chronic illnesses, and diagnostics are NEVER embedded in the QR payload.
- **Token Invalidation**: Patients can rotate or revoke their active QR token at any moment from their dashboard.

### 3. Three-Tier Access Continuum
```
[Unauthenticated Scan]
         │
         ▼
[Level 1: Public Minimal Response]
• Patient Name
• Emergency ID
• Provider Auth Barrier
• ZERO Medical Data Exposed
         │
         ├─── Verified Doctor + Patient Active Consent ──► [Level 2: Normal Care Access]
         │                                                 • Full Clinical Notes
         │                                                 • Diagnostic Reports
         │
         └─── Verified Doctor + Unconscious Crisis ───────► [Level 3: Break-Glass Triage]
                                                           • Mandatory Clinical Justification
                                                           • 15-Minute Ephemeral Session
                                                           • Blood Group + Critical Allergies
                                                           • Anticoagulant / Med Warnings
                                                           • Grounded AI Summary
                                                           • Immediate SMS Alert to Proxies
                                                           • Tamper-Evident Audit Record
```

### 4. Microservices / Modular Layering
- **Client Tier**: Patient Web/Mobile Portal, Attending Physician Triage HUD, Printable Physical QR Card.
- **Gateway & Ingress**: WAF, Rate Limiting, Security Headers Middleware, JWT Authentication Guard.
- **Core Clinical Services**: Break-Glass Service, Patient Record Service, Tiered Access Controller, Audit Service, Notification Service, AI Summarizer.
- **Data & Storage**: PostgreSQL Relational Store, Redis Triage Cache, Local Encrypted Vault (S3 abstraction).
