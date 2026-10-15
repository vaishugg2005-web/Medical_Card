import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.core.config import settings

logger = logging.getLogger("EMQ_NOTIFICATIONS")

class NotificationService:
    @staticmethod
    def send_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        channel: str = "IN_APP",
        recipient_phone: Optional[str] = None
    ) -> Notification:
        """
        Creates an in-app notification record and dispatches simulated or real SMS.
        """
        # 1. Record In-App notification
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            channel=channel,
            is_read=False
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        # 2. Dispatch simulated / real SMS
        if channel in ["SMS", "ALL"] or recipient_phone:
            if settings.NOTIFICATION_PROVIDER == "twilio" and settings.TWILIO_ACCOUNT_SID:
                try:
                    # Optional real Twilio integration
                    from twilio.rest import Client
                    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                    client.messages.create(
                        body=f"[EMQ-ALERT] {title}: {message}",
                        from_=settings.TWILIO_PHONE_NUMBER,
                        to=recipient_phone or "+15550000000"
                    )
                except Exception as e:
                    logger.error(f"Failed to send Twilio SMS: {e}")
            else:
                # Simulated Mock SMS provider (clearly logged for college demo & local testing)
                clean_title = title.encode('ascii', 'ignore').decode('ascii')
                clean_body = message.encode('ascii', 'ignore').decode('ascii')
                print(f"\n=======================================================")
                print(f">> [SIMULATED SMS DISPATCH] To: {recipient_phone or 'Patient Device'}")
                print(f"TITLE: {clean_title}")
                print(f"BODY:  {clean_body}")
                print(f"=======================================================\n")
        
        return notif
