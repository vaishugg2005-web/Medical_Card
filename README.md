# AI-Powered Secure Emergency Medical History Access System (EMQ-HS)

> **Final-Year B.Tech AI/ML Capstone Project Prototype**  
> Built around the fundamental healthcare security principle:  
> *"Fast access to critical emergency medical information without giving unrestricted access to the patient's complete medical history."*

---

## 🌟 Executive Overview

During an acute emergency (e.g., motor vehicle collision, cardiac arrest), an unconscious patient cannot communicate their blood group, severe allergies, or active medications. Conventional QR systems present a severe privacy hazard by either embedding plaintext medical data directly in the QR code or redirecting to an unrestricted public profile.

The **Emergency Medical QR Health System (EMQ-HS)** eliminates this hazard through a **Zero-Trust, Three-Level Compartmentalized Architecture**:
1. **Level 1 — Public Minimal QR Response**: Scanning without verified physician credentials displays only the patient's name, emergency ID, and a security barrier requiring physician authentication. **Zero clinical data is leaked.**
2. **Level 2 — Normal Care Access**: Verified physicians request consent from the conscious patient. Once approved, the physician accesses comprehensive outpatient history.
3. **Level 3 — Break-Glass Emergency Triage**: In life-threatening emergencies with an incapacitated patient, a verified physician activates an audited override. The system demands a mandatory clinical reason, logs an immutable audit event, alerts emergency proxies via real-time SMS, and unlocks an ephemeral 15-minute high-contrast Triage HUD with a **ground-truth, hallucination-free AI clinical summary**.

---

## 🏛️ System Architecture Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. CLIENT TOUCHPOINTS                           │
│  [📱 Patient Portal]    [💻 Doctor Triage Portal]   [🪪 Physical QR Card]│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / TLS 1.3
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        2. ZERO-TRUST GATEWAY                           │
│     [🛡️ Security Headers]  [🚪 Rate Limiter]  [🔑 JWT Authentication]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     3. CORE BACKEND SERVICES (FastAPI)                 │
│  ┌──────────────────────┐  ┌─────────────────────┐  ┌────────────────┐ │
│  │ Break-Glass Service  │  │  Patient Records    │  │ Tier Controller│ │
│  └──────────────────────┘  └─────────────────────┘  └────────────────┘ │
│  ┌──────────────────────┐  ┌─────────────────────┐  ┌────────────────┐ │
│  │ AI Clinical Engine   │  │  Audit & Telemetry  │  │ Notifications  │ │
│  └──────────────────────┘  └─────────────────────┘  └────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      4. DATA & PERSISTENCE TIER                        │
│   [🗄️ PostgreSQL / SQLite]   [⚡ Redis Cache]   [🔐 KMS Envelope Keys]  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart Guide

### Option 0: One-Click Windows Setup (Recommended)
Double-click `setup.bat` in the project root. It automatically:
1. Detects project directories and verifies prerequisites (Python 3.10+, Node.js v18+, npm).
2. Prompts to choose an editor (VS Code, Antigravity, or custom executable), remembers your choice, and opens the project.
3. Creates or validates the backend virtual environment at `backend\.venv` and installs any missing dependencies.
4. Prepares `backend\.env` from `.env.example` and verifies SQLite databases.
5. Launches the FastAPI backend (port 8000) and React Vite frontend (port 5173) in two persistent terminal windows.
6. Polls `/health` and frontend HTTP readiness.
7. Automatically opens `http://localhost:5173` in your default browser once both services are verified healthy.

```cmd
:: From File Explorer, simply double-click setup.bat
:: Or from command prompt / terminal:
setup.bat
```

### Option 1: Instant Single-Command Local Run (run_dev.py)
This runs the full-stack system with SQLite and pre-seeded demo accounts:

```bash
# 1. Navigate to the project root
cd Medical_Card

# 2. Run the unified launcher
python run_dev.py
```

The system will start on **`http://localhost:8000`**:
- 🖥️ **Full-Stack Web Application**: [http://localhost:8000](http://localhost:8000)
- 📖 **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 📊 **Prometheus Metrics Endpoint**: [http://localhost:8000/metrics](http://localhost:8000/metrics)

---

### Option 2: Production Docker Compose Setup (PostgreSQL)

```bash
docker compose up --build
```
This boots:
- `postgres`: PostgreSQL 16 on port 5432
- `backend`: FastAPI server on port 8000

---

## 🔑 Pre-Seeded Demo Accounts

The database is automatically pre-seeded with realistic clinical data:

| Role | Email | Password | Identifier / License | Status |
| :--- | :--- | :--- | :--- | :--- |
| **👤 Demo Patient** | `patient@example.com` | `PatientDemo123!` | `PAT-2026-9812` | Active Profile |
| **🩺 Verified Doctor** | `doctor@example.com` | `DoctorDemo123!` | `MD-98214-ER` | **VERIFIED** |
| **🩺 Pending Doctor** | `pending.doctor@example.com` | `DoctorDemo123!` | `MD-77129-INT` | **PENDING** |
| **🔑 System Admin** | `admin@example.com` | `AdminSecure123!` | `ADMIN-001` | Superuser |
| **🪪 Seeded QR Token**| N/A | N/A | `demo-emergency-token-9812` | Active Token |

---

## ⚡ Live Presentation Demonstration Flow

1. **Doctor Registration & Verification Lifecycle**:
   - Navigate to `/Doctor_dashboard` and select **"Physician Licensure Registration"**.
   - Submit legal credentials, registration authority (e.g. National Medical Commission), qualification, and hospital affiliation.
   - Initial application is created with status **`PENDING`** and unique tracking reference (e.g., `DOC-APP-2026-XXXX`).
   - Doctor dashboard displays verification status banner; clinical appointment privileges are restricted.
2. **Admin Doctor Verification Center**:
   - Log in as `admin@example.com` (`AdminSecure123!`) on `/admin_dashboard`.
   - Access **"Doctor Verification"** center with real database counts for Pending, Under Review, Verified, Rejected, Suspended.
   - Search doctor by name or license, review submitted dossier, and execute **"Approve Doctor"**.
3. **Patient Verified Doctor Directory & Appointment Booking**:
   - Log in as `patient@example.com` (`PatientDemo123!`) on `/patient_dashboard`.
   - Navigate to **"Appointments → Find a Doctor"**.
   - Notice strictly verified doctors appear with verified credentials and badges.
   - If no doctors are available or filtered out, system displays:
     *"No doctors are currently available for consultation. Please check again later."*
   - Click **"Book Appointment"**, select Consultation Mode (In-Person OPD / Tele-Consultation), preferred date, available slot, symptoms, and optional note.
   - Backend performs atomic validation, prevents slot collisions (`409 Conflict`), and dispatches notification.
4. **Doctor Appointment Response & Zero-Trust Privacy**:
   - Log in as the doctor, open **"Consultations"** queue, and accept appointment with instructions (`CONFIRMED`).
   - Patient timeline and status reflect the confirmation.
   - **Zero-Trust Record Isolation**: Appointment booking does **NOT** grant medical record access; patient outpatient history remains locked until explicit Level 2 Consent or Level 3 Emergency Break-Glass is performed.
5. **Level 1 Public Security Barrier & Level 3 Break-Glass**:
   - Scan public QR code: minimal identity only; zero clinical data leaked.
   - Verified doctor activates Level 3 Break-Glass with 15-minute countdown, AI synthesis, and immutable audit logs.

---

## 🧪 Automated Testing

Run the automated backend test suite covering authentication, RBAC, doctor verification workflow, appointment booking, slot collision protection, QR security barriers, Break-Glass protocols, and AI hallucination guardrails:

```bash
$env:PYTHONPATH="backend"; $env:PYTHONIOENCODING="utf-8"
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```

---

## 🛡️ Academic Disclosure: Implemented vs. Simulated Features

To maintain scientific and academic integrity, the system clearly delineates implemented features from simulation layers:

| Component | Architecture Mode | Engineering Details |
| :--- | :--- | :--- |
| **JWT & RBAC Authorization** | **IMPLEMENTED** | Cryptographic token signing, backend-enforced route permissions. |
| **Zero-Trust QR Workflow** | **IMPLEMENTED** | Opaque tokens; strict Level 1/2/3 compartmentalization. |
| **Emergency Break-Glass Protocol** | **IMPLEMENTED** | Mandatory justification, 15-min ephemeral session, filtered triage HUD. |
| **Zero-Hallucination AI Summarizer** | **IMPLEMENTED** | Deterministic clinical rule engine + OpenAI fallback. |
| **Physical Card Generator** | **IMPLEMENTED** | Printable dual-sided medical emergency card with base64 QR. |
| **Immutable Audit Logging** | **IMPLEMENTED** | Append-only compliance log recording all telemetry. |
| **State Medical Board Registry** | **SIMULATED** | Administrative verification console for approving doctors. |
| **Cloud HSM / AWS KMS** | **SIMULATED** | Development AES-256 field encryption keys. |
| **SMS Gateway (Twilio)** | **SIMULATED** | Terminal mock dispatcher (Twilio live ready via `.env`). |
| **National EHR / ABDM / FHIR** | **PROTOTYPE** | Simplified HL7 FHIR R4 JSON schemas (`/api/v1/fhir`). |

---

## 📂 Project Repository Structure

```
secure-emergency-medical-system/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST endpoints (Auth, Patients, Doctors, QR, Access, AI, Admin)
│   │   ├── core/            # Config, Security, JWT, RBAC policies
│   │   ├── database/        # Session, Base, Automatic Seeder
│   │   ├── middleware/      # Security headers, Sliding window rate limiter
│   │   ├── models/          # SQLAlchemy models (User, Patient, Doctor, Medical, Access, Audit)
│   │   ├── schemas/         # Pydantic v2 validation models
│   │   ├── services/        # Break-Glass, QR, Audit, Notifications, AI engine
│   │   ├── static/          # Full-Stack Web Application (HTML/Tailwind/JS)
│   │   └── main.py          # FastAPI application entry point
│   ├── tests/               # Pytest security & workflow test suite
│   ├── Dockerfile           # Backend container definition
│   └── requirements.txt     # Python dependencies
├── frontend/                # Complete React + TypeScript + Vite project
├── docs/                    # Architecture, Security, API, Database, Demo guides
├── docker-compose.yml       # Production multi-container orchestration
├── run_dev.py               # Single-command dev launcher
├── .env.example             # Configuration template
└── README.md                # Project documentation
```
