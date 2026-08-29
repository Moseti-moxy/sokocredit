"""Airtel Money collections via the Airtel Africa Open API, mirroring the
structure of app/mpesa.py: OAuth client-credentials token, a "request money"
(collection) call, and a webhook the provider calls back with the result.

Get credentials from https://developers.airtel.africa (Collections product).
Sandbox and production use the same host; the environment is selected via the
X-Country / X-Currency headers and whether you were issued sandbox or live keys.
"""
import base64
import json
import uuid
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import current_app

BASE_URL = 'https://openapiuat.airtel.africa'  # swap for https://openapi.airtel.africa in production


class AirtelError(Exception):
    pass


class AirtelConfigurationError(AirtelError):
    pass


def required_config():
    names = ('AIRTEL_CLIENT_ID', 'AIRTEL_CLIENT_SECRET', 'AIRTEL_COUNTRY', 'AIRTEL_CURRENCY')
    missing = [name for name in names if not str(current_app.config.get(name) or '').strip()]
    if missing:
        raise AirtelConfigurationError(f'Airtel Money is not configured: {", ".join(missing)}.')


def base_url():
    return current_app.config.get('AIRTEL_BASE_URL', BASE_URL)


def request_json(url, *, method='GET', headers=None, payload=None):
    request_obj = Request(url, method=method, headers=headers or {}, data=payload)
    try:
        with urlopen(request_obj, timeout=20) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        body = exc.read().decode('utf-8', errors='replace')
        current_app.logger.warning('Airtel Money request returned HTTP %s: %s', exc.code, body)
        raise AirtelError('Airtel Money rejected the request. Check your client credentials and payload.') from exc
    except (URLError, json.JSONDecodeError) as exc:
        raise AirtelError('Airtel Money request failed.') from exc


def access_token():
    payload = json.dumps({
        'client_id': current_app.config['AIRTEL_CLIENT_ID'],
        'client_secret': current_app.config['AIRTEL_CLIENT_SECRET'],
        'grant_type': 'client_credentials',
    }).encode()
    response = request_json(
        f'{base_url()}/auth/oauth2/token', method='POST',
        headers={'Content-Type': 'application/json', 'Accept': '*/*'},
        payload=payload,
    )
    token = response.get('access_token')
    if not token:
        raise AirtelError('Airtel Money did not return an access token.')
    return token


def initiate_collection(*, amount, phone_number, reference, transaction_id=None):
    """Requests payment ('push') from a customer's Airtel Money wallet. Returns
    the provider's response dict, which includes a `transaction.id` to correlate
    with the async callback.
    """
    required_config()
    transaction_id = transaction_id or str(uuid.uuid4())
    payload = json.dumps({
        'reference': reference,
        'subscriber': {'country': current_app.config['AIRTEL_COUNTRY'], 'currency': current_app.config['AIRTEL_CURRENCY'], 'msisdn': phone_number},
        'transaction': {'amount': int(amount), 'country': current_app.config['AIRTEL_COUNTRY'], 'currency': current_app.config['AIRTEL_CURRENCY'], 'id': transaction_id},
    }).encode()
    response = request_json(
        f'{base_url()}/merchant/v1/payments/', method='POST',
        headers={
            'Authorization': f'Bearer {access_token()}',
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'X-Country': current_app.config['AIRTEL_COUNTRY'],
            'X-Currency': current_app.config['AIRTEL_CURRENCY'],
        },
        payload=payload,
    )
    status = response.get('status', {})
    if str(status.get('code')) not in {'200', '201'}:
        raise AirtelError(status.get('message') or 'Airtel Money rejected the collection request.')
    return {**response, 'transaction_id': transaction_id}


def verify_callback_signature(request_body_bytes, signature_header):
    """Airtel signs callbacks with a shared secret (AIRTEL_CALLBACK_SECRET, set in
    your Airtel developer dashboard). Compares using HMAC to avoid timing attacks.
    """
    import hashlib
    import hmac as hmac_module

    secret = current_app.config.get('AIRTEL_CALLBACK_SECRET')
    if not secret:
        return True  # nothing configured to verify against - caller should still cross-check amount/msisdn
    expected = hmac_module.new(secret.encode(), request_body_bytes, hashlib.sha256).hexdigest()
    return hmac_module.compare_digest(expected, signature_header or '')
