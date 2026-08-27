import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def send_sms_via_twilio(to_number: str, message: str):
    try:
        from twilio.rest import Client
    except Exception:
        logger.warning('Twilio not installed or unavailable; skipping real send.')
        return {'status': 'skipped', 'reason': 'twilio-unavailable'}
    sid = os.getenv('TWILIO_ACCOUNT_SID')
    token = os.getenv('TWILIO_AUTH_TOKEN')
    from_number = os.getenv('TWILIO_FROM')
    if not sid or not token or not from_number:
        logger.warning('Twilio credentials missing; skipping send.')
        return {'status': 'skipped', 'reason': 'twilio-not-configured'}
    client = Client(sid, token)
    msg = client.messages.create(body=message, from_=from_number, to=to_number)
    return {'status': 'sent', 'sid': msg.sid}

def send_sms_via_africastalking(to_number: str, message: str):
    try:
        import africastalking as at
    except Exception:
        logger.warning("Africa's Talking SDK not installed; skipping.")
        return {'status': 'skipped', 'reason': 'africastalking-unavailable'}
    username = os.getenv('AFRICASTALKING_USERNAME')
    api_key = os.getenv('AFRICASTALKING_API_KEY')
    if not username or not api_key:
        logger.warning("Africa's Talking credentials missing; skipping.")
        return {'status': 'skipped', 'reason': 'africastalking-not-configured'}
    at.initialize(username, api_key)
    sms = at.SMS
    try:
        res = sms.send(message, [to_number])
        return {'status': 'sent', 'result': res}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


def notify_overdue(loan_id: str, to_number: str, amount_due: float):
    message = f"SokoCredit: Loan {loan_id} has an overdue payment of KES {amount_due:.2f}. Please pay or contact your loan officer."
    logger.info('Notify overdue %s -> %s', loan_id, to_number)
    # prefer Africa's Talking if configured, otherwise Twilio
    if os.getenv('AFRICASTALKING_API_KEY'):
        result = send_sms_via_africastalking(to_number, message)
    else:
        result = send_sms_via_twilio(to_number, message)
    return {'sentAt': datetime.utcnow().isoformat() + 'Z', 'result': result}


def send_payment_receipt(to_number: str, loan_id: str, payment_id: str, amount: float):
    message = f"Receipt: Payment {payment_id} for loan {loan_id} of KES {amount:.2f} received. Thank you."
    logger.info('Send receipt %s -> %s', payment_id, to_number)
    if os.getenv('AFRICASTALKING_API_KEY'):
        return send_sms_via_africastalking(to_number, message)
    return send_sms_via_twilio(to_number, message)
