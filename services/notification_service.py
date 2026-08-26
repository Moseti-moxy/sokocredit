import os

from twilio.rest import Client
import africastalking


class NotificationService:
    @staticmethod
    def send_sms_africas_talking(phone_number: str, message: str):
        username = os.getenv("AFRICAS_TALKING_USERNAME", "sandbox")
        api_key = os.getenv("AFRICAS_TALKING_API_KEY")

        if not api_key:
            return {"status": "skipped", "message": "Africa's Talking API key not configured."}

        africastalking.initialize(username, api_key)
        sms = africastalking.SMS

        try:
            response = sms.send(message, [phone_number])
            return {"status": "success", "response": response}
        except Exception as exc:
            return {"status": "error", "message": str(exc)}

    @staticmethod
    def send_whatsapp_twilio(phone_number: str, message: str):
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_whatsapp = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

        if not account_sid or not auth_token:
            return {"status": "skipped", "message": "Twilio credentials not configured."}

        client = Client(account_sid, auth_token)

        try:
            msg = client.messages.create(
                body=message,
                from_=from_whatsapp,
                to=f"whatsapp:{phone_number}",
            )
            return {"status": "success", "sid": msg.sid}
        except Exception as exc:
            return {"status": "error", "message": str(exc)}
