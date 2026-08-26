import os
from twilio.rest import Client
import africastalking


class NotificationService:

    @staticmethod
    def send_sms_africas_talking(phone_number: str, message: str):
        """Sends SMS using Africa's Talking API (Best for East/West Africa)."""
        username = os.getenv("AFRICAS_TALKING_USERNAME", "sandbox")
        api_key = os.getenv("AFRICAS_TALKING_API_KEY")
        
        africastalking.initialize(username, api_key)
        sms = africastalking.SMS
        
        try:
            response = sms.send(message, [phone_number])
            return {"status": "success", "response": response}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def send_whatsapp_twilio(phone_number: str, message: str):
        """Sends WhatsApp message using Twilio API."""
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_whatsapp = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

        client = Client(account_sid, auth_token)
        
        try:
            msg = client.messages.create(
                body=message,
                from_=from_whatsapp,
                to=f"whatsapp:{phone_number}"
            )
            return {"status": "success", "sid": msg.sid}
        except Exception as e:
            return {"status": "error", "message": str(e)}