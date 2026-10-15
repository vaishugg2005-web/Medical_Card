import uuid
import io
import base64
import qrcode
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.access import QRToken
from app.models.patient import Patient

class QRService:
    @staticmethod
    def generate_token_for_patient(db: Session, patient: Patient) -> QRToken:
        """
        Generates an opaque, cryptographically random token for the patient.
        Crucial: The QR token contains NO sensitive health or identity data.
        """
        # Revoke existing active tokens if any
        db.query(QRToken).filter(
            QRToken.patient_id == patient.id,
            QRToken.status == "ACTIVE"
        ).update({"status": "REVOKED"})
        
        token_uuid = str(uuid.uuid4())
        qr_token = QRToken(
            patient_id=patient.id,
            token_hash=token_uuid,
            status="ACTIVE",
            issued_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=365),
            client_entropy_hint=str(uuid.uuid4())[:8]
        )
        db.add(qr_token)
        db.commit()
        db.refresh(qr_token)
        return qr_token

    @staticmethod
    def generate_qr_image_base64(token_hash: str) -> str:
        """
        Encodes the secure lookup URL into a high-contrast QR code image.
        Format: Data URL (image/png;base64,...)
        """
        # Point to the resolve route on the frontend/gateway
        url = f"http://localhost:5173/qr/{token_hash}"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("ascii")
        return f"data:image/png;base64,{img_str}"

    @staticmethod
    def validate_token(db: Session, token_hash: str) -> QRToken:
        """Validates that the token exists, is active, and has not expired."""
        token = db.query(QRToken).filter(
            QRToken.token_hash == token_hash,
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
