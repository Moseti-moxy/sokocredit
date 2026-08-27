import base64
import json
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from flask import current_app


class MpesaError(Exception):
    pass


class MpesaConfigurationError(MpesaError):
    pass


def base_url():
    environment = str(current_app.config.get('MPESA_ENV', '')).lower()
    if environment == 'sandbox':
        return 'https://sandbox.safaricom.co.ke'
    if environment == 'production':
        return 'https://api.safaricom.co.ke'
    raise MpesaConfigurationError('MPESA_ENV must be either sandbox or production.')


def required_config():
    names = ('MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL')
    missing = [name for name in names if not str(current_app.config.get(name) or '').strip()]
    if missing:
        raise MpesaConfigurationError(f'M-PESA is not configured: {", ".join(missing)}.')
    shortcode = str(current_app.config['MPESA_SHORTCODE']).strip()
    passkey = str(current_app.config['MPESA_PASSKEY']).strip()
    if shortcode.upper() == 'N/A' or passkey.upper() == 'N/A' or 'replace-with' in passkey.lower():
        raise MpesaConfigurationError('MPESA_SHORTCODE and MPESA_PASSKEY must contain your Daraja credentials.')
    if not shortcode.isdigit():
        raise MpesaConfigurationError('MPESA_SHORTCODE must contain only digits.')
    callback_url = urlparse(str(current_app.config['MPESA_CALLBACK_URL']))
    if callback_url.scheme != 'https' or not callback_url.netloc:
        raise MpesaConfigurationError('MPESA_CALLBACK_URL must be a publicly reachable HTTPS URL.')
    if callback_url.hostname in {'example.com', 'example.test', 'your-domain.com', 'your-public-domain.example'}:
        raise MpesaConfigurationError('MPESA_CALLBACK_URL must be your deployed HTTPS endpoint, not an example URL.')
    if callback_url.path.rstrip('/') != '/api/mpesa/stk-callback':
        raise MpesaConfigurationError('MPESA_CALLBACK_URL must point to /api/mpesa/stk-callback.')
    transaction_type = current_app.config.get('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline')
    if transaction_type not in {'CustomerPayBillOnline', 'CustomerBuyGoodsOnline'}:
        raise MpesaConfigurationError('MPESA_TRANSACTION_TYPE must be CustomerPayBillOnline or CustomerBuyGoodsOnline.')


def request_json(url, *, method='GET', headers=None, payload=None):
    request = Request(url, method=method, headers=headers or {}, data=payload)
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        current_app.logger.warning('M-PESA request returned HTTP %s.', exc.code)
        raise MpesaError('M-PESA rejected the request. Check your Daraja credentials and request configuration.') from exc
    except (URLError, json.JSONDecodeError) as exc:
        raise MpesaError('M-PESA request failed.') from exc


def access_token():
    credentials = f"{current_app.config['MPESA_CONSUMER_KEY']}:{current_app.config['MPESA_CONSUMER_SECRET']}"
    encoded = base64.b64encode(credentials.encode()).decode()
    response = request_json(
        f'{base_url()}/oauth/v1/generate?{urlencode({"grant_type": "client_credentials"})}',
        headers={'Authorization': f'Basic {encoded}', 'Accept': 'application/json'},
    )
    token = response.get('access_token')
    if not token:
        raise MpesaError('M-PESA did not return an access token.')
    return token


def normalize_phone_number(phone_number):
    digits = ''.join(char for char in str(phone_number) if char.isdigit())
    if digits.startswith('0') and len(digits) == 10:
        digits = f'254{digits[1:]}'
    elif digits.startswith('7') and len(digits) == 9:
        digits = f'254{digits}'
    if len(digits) != 12 or not digits.startswith('2547'):
        raise MpesaError('phoneNumber must be a valid Kenyan mobile number.')
    return digits


def initiate_stk_push(*, amount, phone_number, account_reference, transaction_desc):
    required_config()
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    shortcode = current_app.config['MPESA_SHORTCODE']
    password = base64.b64encode(f"{shortcode}{current_app.config['MPESA_PASSKEY']}{timestamp}".encode()).decode()
    payload = {
        'BusinessShortCode': shortcode,
        'Password': password,
        'Timestamp': timestamp,
        'TransactionType': current_app.config['MPESA_TRANSACTION_TYPE'],
        'Amount': int(amount),
        'PartyA': phone_number,
        'PartyB': shortcode,
        'PhoneNumber': phone_number,
        'CallBackURL': current_app.config['MPESA_CALLBACK_URL'],
        'AccountReference': account_reference,
        'TransactionDesc': transaction_desc,
    }
    response = request_json(
        f'{base_url()}/mpesa/stkpush/v1/processrequest', method='POST',
        headers={'Authorization': f'Bearer {access_token()}', 'Content-Type': 'application/json'},
        payload=json.dumps(payload).encode(),
    )
    if str(response.get('ResponseCode')) != '0' or not response.get('CheckoutRequestID'):
        raise MpesaError(response.get('errorMessage') or response.get('ResponseDescription') or 'M-PESA rejected the STK request.')
    return response
