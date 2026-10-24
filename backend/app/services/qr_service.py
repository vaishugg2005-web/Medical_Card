import uuid
import io
import json
import base64
import secrets
import hashlib
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta
import qrcode
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet

from app.core.config import settings
from app.models.access import QRToken
from app.models.patient import Patient
from app.models.medical_card import MedicalCard

class QRService:
    @staticmethod
    def _get_encryption_cipher() -> Fernet:
        """Derives a deterministic 32-byte URL-safe base64 key from SECRET_KEY for Mode B encryption."""
        key_digest = hashlib.sha256(settings.SECRET_KEY.encode('utf-8')).digest()
        fernet_key = base64.urlsafe_b64encode(key_digest)
        return Fernet(fernet_key)

    @staticmethod
    def hash_token(raw_token: str) -> str:
        """Computes secure SHA-256 hash of the raw token for storage."""
        return hashlib.sha256(raw_token.strip().encode('utf-8')).hexdigest()

    @staticmethod
    def generate_or_get_card(
        db: Session,
        patient: Patient,
        force_rotate: bool = False,
        actor_name: str = "SYSTEM"
    ) -> Tuple[MedicalCard, str]:
        """
        Retrieves active MedicalCard or creates/rotates one with cryptographically random token.
        Returns: (MedicalCard, raw_token)
        """
        existing_card = db.query(MedicalCard).filter(
            MedicalCard.patient_id == patient.id
        ).order_by(MedicalCard.id.desc()).first()

        if existing_card and not force_rotate and existing_card.card_status == "ACTIVE":
            # Token is stored hashed. If active, we return existing card.
            # Raw token for existing card is represented by active QRToken record
            token_rec = db.query(QRToken).filter(
                QRToken.patient_id == patient.id,
                QRToken.status == "ACTIVE"
            ).first()
            raw_token = token_rec.token_hash if token_rec else existing_card.token_hash
            return existing_card, raw_token

        now = datetime.now(timezone.utc)
        raw_token = f"med_{secrets.token_urlsafe(32)}"
        token_hash = QRService.hash_token(raw_token)

        # Invalidate previous QRToken entries for this patient
        db.query(QRToken).filter(
            QRToken.patient_id == patient.id,
            QRToken.status == "ACTIVE"
        ).update({"status": "REVOKED"})

        if existing_card:
            # Update existing card entity
            existing_card.token_hash = token_hash
            existing_card.raw_token_preview = f"{raw_token[:10]}...{raw_token[-4:]}"
            existing_card.token_version += 1
            existing_card.card_status = "ACTIVE"
            existing_card.issued_at = now
            existing_card.expires_at = now + timedelta(days=365)
            existing_card.revoked_at = None
            existing_card.last_updated_at = now
            existing_card.issued_by_actor = actor_name
            target_card = existing_card
        else:
            card_uuid = str(uuid.uuid4())
            card_number = f"MED-CARD-2026-{patient.unique_patient_id.split('-')[-1] if '-' in patient.unique_patient_id else str(patient.id).zfill(4)}"
            target_card = MedicalCard(
                card_uuid=card_uuid,
                card_number=card_number,
                patient_id=patient.id,
                token_hash=token_hash,
                raw_token_preview=f"{raw_token[:10]}...{raw_token[-4:]}",
                token_version=1,
                card_status="ACTIVE",
                payload_mode="SECURE_TOKEN",
                payload_schema_version="1.0",
                issued_at=now,
                expires_at=now + timedelta(days=365),
                last_updated_at=now,
                issued_by_actor=actor_name,
                triage_classification=None,
                emergency_notes=patient.emergency_instructions
            )
            db.add(target_card)

        # Synchronize backward-compatible QRToken row (using raw_token as lookup token)
        qr_token = QRToken(
            patient_id=patient.id,
            token_hash=raw_token,
            status="ACTIVE",
            issued_at=now,
            expires_at=now + timedelta(days=365),
            client_entropy_hint=secrets.token_hex(4)
        )
        db.add(qr_token)

        db.commit()
        db.refresh(target_card)
        return target_card, raw_token

    @staticmethod
    def revoke_card(db: Session, patient: Patient) -> Optional[MedicalCard]:
        """Revokes all active medical cards and QR tokens for the patient."""
        now = datetime.now(timezone.utc)
        active_card = db.query(MedicalCard).filter(
            MedicalCard.patient_id == patient.id,
            MedicalCard.card_status == "ACTIVE"
        ).first()

        if active_card:
            active_card.card_status = "REVOKED"
            active_card.revoked_at = now
            active_card.last_updated_at = now

        db.query(QRToken).filter(
            QRToken.patient_id == patient.id,
            QRToken.status == "ACTIVE"
        ).update({"status": "REVOKED"})

        db.commit()
        if active_card:
            db.refresh(active_card)
        return active_card

    @staticmethod
    def build_qr_payload(
        patient: Patient,
        raw_token: str,
        payload_mode: str = "SECURE_TOKEN"
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Builds the payload data for the QR code.
        Mode A: Secure token QR (default and recommended)
        Mode B: Self-contained authenticated encrypted medical payload (opt-in only)
        """
        if payload_mode == "ENCRYPTED_PAYLOAD":
            # Curated minimal critical emergency fields
            now_iso = datetime.now(timezone.utc).isoformat()
            exp_iso = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
            
            critical_allergies = [getattr(a, 'allergen', '') for a in patient.allergies if getattr(a, 'severity', '').upper() in ['SEVERE', 'CRITICAL', 'HIGH', 'SEVERE_ANAPHYLACTIC']]
            critical_meds = [getattr(m, 'medicine_name', '') for m in patient.medications if getattr(m, 'is_active', True)]
            major_conditions = [getattr(c, 'condition_name', '') for c in patient.conditions if getattr(c, 'is_critical_flag', False) or getattr(c, 'status', '').upper() == 'ACTIVE']
            primary_contact = patient.emergency_contacts[0] if patient.emergency_contacts else None

            payload_dict = {
                "application": "Medora",
                "version": 1,
                "type": "emergency_medical_card_encrypted",
                "patient_name": patient.full_name,
                "card_id": f"MED-CARD-2026-{patient.unique_patient_id.split('-')[-1] if '-' in patient.unique_patient_id else str(patient.id)}",
                "blood_group": patient.blood_group,
                "critical_allergies": critical_allergies[:5],
                "critical_medications": critical_meds[:5],
                "major_conditions": major_conditions[:5],
                "emergency_contact": primary_contact.phone_encrypted if primary_contact else None,
                "timestamp": now_iso,
                "expiry": exp_iso
            }
            cipher = QRService._get_encryption_cipher()
            encrypted_bytes = cipher.encrypt(json.dumps(payload_dict).encode('utf-8'))
            encoded_payload = encrypted_bytes.decode('ascii')
            return encoded_payload, payload_dict
        else:
            # Mode A: Standard secure token QR
            payload_dict = {
                "application": "Medora",
                "version": 1,
                "type": "emergency_medical_card",
                "token": raw_token
            }
            # Also encode as direct string / JSON
            return json.dumps(payload_dict), payload_dict

    @staticmethod
    def generate_qr_image_base64(payload_string: str) -> str:
        """
        Generates a high-contrast, scannable PNG QR image with deep navy fill, white background,
        quiet zone (border=4), and Level H error correction.
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(payload_string)
        qr.make(fit=True)

        # Deep navy (#102A43) foreground with crisp white background
        img = qr.make_image(fill_color="#102A43", back_color="#ffffff")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("ascii")
        return f"data:image/png;base64,{img_str}"

    @staticmethod
    def validate_card_token(db: Session, raw_token_or_payload: str) -> Optional[Tuple[Patient, str, str]]:
        """
        Validates token or payload string for Medical Card operations.
        Returns: Tuple[Patient, card_status, token_identifier] or None
        """
        if not raw_token_or_payload:
            return None

        clean_token = raw_token_or_payload.strip()

        # Handle JSON payload extraction
        if clean_token.startswith("{") and "token" in clean_token:
            try:
                data = json.loads(clean_token)
                if isinstance(data, dict) and "token" in data:
                    clean_token = str(data["token"]).strip()
            except Exception:
                pass

        # Handle URL extraction
        if "/qr/" in clean_token:
            clean_token = clean_token.split("/qr/")[-1].strip()
        if "/resolve/" in clean_token:
            clean_token = clean_token.split("/resolve/")[-1].strip()

        token_hash = QRService.hash_token(clean_token)

        # 1. Check in MedicalCard table by token_hash
        card = db.query(MedicalCard).filter(
            (MedicalCard.token_hash == token_hash) | (MedicalCard.card_uuid == clean_token) | (MedicalCard.card_number == clean_token)
        ).order_by(MedicalCard.id.desc()).first()

        if card:
            patient = db.query(Patient).filter(Patient.id == card.patient_id).first()
            if not patient:
                return None
            
            # Check expiry
            if card.expires_at:
                exp = card.expires_at.replace(tzinfo=timezone.utc) if card.expires_at.tzinfo is None else card.expires_at
                if exp < datetime.now(timezone.utc):
                    card.card_status = "EXPIRED"
                    db.commit()
                    return (patient, "EXPIRED", card.card_number)

            return (patient, card.card_status, card.card_number)

        # 2. Check in QRToken table (legacy / demo token fallback)
        qr_tok = db.query(QRToken).filter(
            (QRToken.token_hash == clean_token) | (QRToken.token_hash == token_hash)
        ).order_by(QRToken.id.desc()).first()

        if qr_tok:
            patient = db.query(Patient).filter(Patient.id == qr_tok.patient_id).first()
            if not patient:
                return None
            if qr_tok.expires_at:
                exp = qr_tok.expires_at.replace(tzinfo=timezone.utc) if qr_tok.expires_at.tzinfo is None else qr_tok.expires_at
                if exp < datetime.now(timezone.utc):
                    qr_tok.status = "EXPIRED"
                    db.commit()
                    return (patient, "EXPIRED", clean_token)
            return (patient, qr_tok.status, clean_token)

        # 3. Patient unique identifier fallback
        patient_by_id = db.query(Patient).filter(Patient.unique_patient_id == clean_token).first()
        if patient_by_id:
            card, _ = QRService.generate_or_get_card(db, patient_by_id)
            return (patient_by_id, card.card_status, card.card_number)

        return None

    @staticmethod
    def validate_token(db: Session, token_hash: str) -> Optional[QRToken]:
        """
        Validates token for backward-compatible Level 1/2/3 and Break-Glass endpoints.
        Returns an active QRToken object or None if invalid/expired/revoked.
        """
        if not token_hash:
            return None

        clean_hash = token_hash.strip()
        if "/qr/" in clean_hash:
            clean_hash = clean_hash.split("/qr/")[-1].strip()

        token = db.query(QRToken).filter(
            QRToken.token_hash == clean_hash,
            QRToken.status == "ACTIVE"
        ).first()

        if not token:
            # Fallback by medical card token hash
            hashed = QRService.hash_token(clean_hash)
            card = db.query(MedicalCard).filter(
                (MedicalCard.token_hash == hashed) | (MedicalCard.card_uuid == clean_hash) | (MedicalCard.card_number == clean_hash)
            ).first()
            if card and card.card_status == "ACTIVE":
                token = db.query(QRToken).filter(
                    QRToken.patient_id == card.patient_id,
                    QRToken.status == "ACTIVE"
                ).first()

        if not token:
            # Fallback by patient ID
            patient_match = db.query(Patient).filter(Patient.unique_patient_id == clean_hash).first()
            if patient_match:
                token = db.query(QRToken).filter(
                    QRToken.patient_id == patient_match.id,
                    QRToken.status == "ACTIVE"
                ).first()

        if not token:
            return None

        if token.expires_at:
            exp = token.expires_at.replace(tzinfo=timezone.utc) if token.expires_at.tzinfo is None else token.expires_at
            if exp < datetime.now(timezone.utc):
                token.status = "EXPIRED"
                db.commit()
                return None

        return token

    @staticmethod
    def generate_token_for_patient(db: Session, patient: Patient) -> QRToken:
        card, raw_token = QRService.generate_or_get_card(db, patient, force_rotate=True)
        token_obj = db.query(QRToken).filter(
            QRToken.patient_id == patient.id,
            QRToken.token_hash == raw_token
        ).first()
        if not token_obj:
            token_obj = QRToken(
                patient_id=patient.id,
                token_hash=raw_token,
                status="ACTIVE",
                issued_at=card.issued_at,
                expires_at=card.expires_at
            )
            db.add(token_obj)
            db.commit()
            db.refresh(token_obj)
        return token_obj
