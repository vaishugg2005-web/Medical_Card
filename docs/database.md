# Database Architecture & Entity Relationships
## Emergency Medical QR Health System (EMQ-HS)

### 1. Primary Relational Schema

```
+--------------------+       +----------------------+       +-------------------------+
|       users        |       |       patients       |       |         doctors         |
+--------------------+       +----------------------+       +-------------------------+
| id (PK)            |◄──────| user_id (FK)         |       | user_id (FK)            |
| email (UK)         |       | id (PK)              |       | id (PK)                 |
| hashed_password    |       | unique_patient_id(UK)|       | medical_license_no (UK) |
| role               |       | full_name            |       | hospital_name           |
| is_active          |       | blood_group          |       | verification_status     |
+--------------------+       | dnr_status           |       +-------------------------+
                             | organ_donor          |                    ▲
                             +----------------------+                    │
                                │   │   │   │   │                        │
        ┌───────────────────────┘   │   │   │   └────────────────────┐   │
        ▼                           ▼   │   ▼                        ▼   │
+-------------------+ +---------------+ │ +--------------------+ +-------------------+
|     allergies     | |  medications  | │ | emergency_contacts | |      consents     |
+-------------------+ +---------------+ │ +--------------------+ +-------------------+
| id (PK)           | | id (PK)       | │ | id (PK)            | | id (PK)           |
| patient_id (FK)   | | patient_id(FK)| │ | patient_id (FK)    | | patient_id (FK)   |
| allergen          | | medicine_name | │ | contact_name       | | doctor_id (FK)────┘
| severity          | | dosage        | │ | phone_encrypted    | | scope             |
| is_critical_flag  | | frequency     | │ | priority_order     | | status            |
+-------------------+ +---------------+ │ +--------------------+ +-------------------+
                                        ▼
                         +-----------------------------+
                         |   emergency_access_events   |
                         +-----------------------------+
                         | id (PK)                     |
                         | patient_id (FK)             |
                         | doctor_id (FK)              |
                         | reason_category             |
                         | free_text_justification     |
                         | session_token (UK)          |
                         | expires_at                  |
                         +-----------------------------+
```

### 2. Indexes & Performance Optimization
- `patients.unique_patient_id`: B-Tree unique index for fast lookups.
- `qr_tokens.token_hash`: Unique index for sub-5ms resolution.
- `audit_logs.created_at`: Descending index for rapid compliance querying.
- `emergency_access_events.session_token`: Unique index for ephemeral token verification.
