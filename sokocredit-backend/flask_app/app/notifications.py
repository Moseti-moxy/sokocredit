"""Automated payment reminders via SMS (Africa's Talking) and WhatsApp (Meta
Cloud API) - the two providers actually usable for a Kenyan microfinance app
without a bank-grade integration process. Both follow the same pattern as
app/mpesa.py: required_config() fails loudly with a clear message when env
vars are missing, so the rest of the app can call send_sms()/send_whatsapp()
unconditionally and simply propagate a 503 when notifications aren't
configured yet, instead of crashing.
"""
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import current_app

from .i18n import t


class NotificationError(Exception):
    pass


class NotificationConfigurationError(NotificationError):
    pass


def _request_json(url, *, method='GET', headers=None, payload=None):
    request_obj = Request(url, method=method, headers=headers or {}, data=payload)
    try:
        with urlopen(request_obj, timeout=20) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        body = exc.read().decode('utf-8', errors='replace')
        current_app.logger.warning('Notification provider returned HTTP %s: %s', exc.code, body)
        raise NotificationError(f'Provider rejected the request (HTTP {exc.code}).') from exc
    except (URLError, json.JSONDecodeError) as exc:
        raise NotificationError('Notification request failed.') from exc


# ---- SMS via Africa's Talking -----------------------------------------------

def _at_config():
    username = current_app.config.get('AFRICASTALKING_USERNAME')
    api_key = current_app.config.get('AFRICASTALKING_API_KEY')
    sender_id = current_app.config.get('AFRICASTALKING_SENDER_ID')
    if not username or not api_key:
        raise NotificationConfigurationError(
            'SMS is not configured: set AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY.'
        )
    env = current_app.config.get('AFRICASTALKING_ENV', 'sandbox')
    base = 'https://api.sandbox.africastalking.com' if env == 'sandbox' else 'https://api.africastalking.com'
    return username, api_key, sender_id, base


def send_sms(phone_number, message):
    """Sends one SMS via Africa's Talking's Bulk SMS endpoint. Returns the
    provider's parsed JSON response. Raises NotificationConfigurationError if
    credentials are missing, NotificationError on a provider-side failure.
    """
    username, api_key, sender_id, base = _at_config()
    payload = {'username': username, 'to': phone_number, 'message': message}
    if sender_id:
        payload['from'] = sender_id
    response = _request_json(
        f'{base}/version1/messaging', method='POST',
        headers={
            'apiKey': api_key,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        },
        payload=urlencode(payload).encode(),
    )
    recipients = response.get('SMSMessageData', {}).get('Recipients', [])
    if recipients and str(recipients[0].get('statusCode')) not in {'100', '101'}:
        raise NotificationError(recipients[0].get('status', 'SMS was rejected by the provider.'))
    return response


# ---- WhatsApp via Meta (WhatsApp Business / Cloud API) ----------------------

def _whatsapp_config():
    token = current_app.config.get('WHATSAPP_ACCESS_TOKEN')
    phone_number_id = current_app.config.get('WHATSAPP_PHONE_NUMBER_ID')
    if not token or not phone_number_id:
        raise NotificationConfigurationError(
            'WhatsApp is not configured: set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.'
        )
    api_version = current_app.config.get('WHATSAPP_API_VERSION', 'v20.0')
    return token, phone_number_id, api_version


def send_whatsapp(phone_number, message):
    """Sends a free-form WhatsApp text message via Meta's Cloud API. Note: outside
    a customer-initiated 24-hour session window, Meta requires a pre-approved
    message *template* rather than free text - see send_whatsapp_template().
    """
    token, phone_number_id, api_version = _whatsapp_config()
    payload = {
        'messaging_product': 'whatsapp',
        'to': phone_number,
        'type': 'text',
        'text': {'body': message},
    }
    return _request_json(
        f'https://graph.facebook.com/{api_version}/{phone_number_id}/messages', method='POST',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        payload=json.dumps(payload).encode(),
    )


def send_whatsapp_template(phone_number, template_name, language_code, parameters):
    """Use for reminders sent outside the 24h customer-service window - Meta
    requires the template to already be approved in the WhatsApp Business Manager.
    """
    token, phone_number_id, api_version = _whatsapp_config()
    payload = {
        'messaging_product': 'whatsapp',
        'to': phone_number,
        'type': 'template',
        'template': {
            'name': template_name,
            'language': {'code': language_code},
            'components': [{'type': 'body', 'parameters': [{'type': 'text', 'text': p} for p in parameters]}],
        },
    }
    return _request_json(
        f'https://graph.facebook.com/{api_version}/{phone_number_id}/messages', method='POST',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        payload=json.dumps(payload).encode(),
    )


# ---- Message building --------------------------------------------------------

def build_reminder_message(*, customer_name, amount, due_date, loan_ref, overdue, lang='en'):
    key = 'reminder_overdue' if overdue else 'reminder_upcoming'
    return t(key, lang, name=customer_name, amount=f'{amount:,.2f}', due_date=due_date.isoformat(), loan_ref=loan_ref[:8])
