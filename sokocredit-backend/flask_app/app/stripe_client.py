"""Stripe payments via raw REST calls (no `stripe` SDK dependency needed) -
same required_config()-then-call pattern as mpesa.py and airtel.py.

Stripe doesn't operate M-Pesa-style local mobile money in Kenya, so this is
the "card/international" leg of requirement #16 (repayments via M-Pesa /
Airtel Money / Stripe / cash) - useful for e.g. a diaspora relative topping up
a mama mboga's loan repayment from abroad.
"""
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import current_app

API_BASE = 'https://api.stripe.com/v1'


class StripeError(Exception):
    pass


class StripeConfigurationError(StripeError):
    pass


def required_config():
    if not str(current_app.config.get('STRIPE_SECRET_KEY') or '').strip():
        raise StripeConfigurationError('Stripe is not configured: set STRIPE_SECRET_KEY.')


def _request_form(path, *, method='POST', data=None):
    required_config()
    body = urlencode(data or {}).encode()
    request_obj = Request(
        f'{API_BASE}{path}', method=method, data=body if method != 'GET' else None,
        headers={
            'Authorization': f'Bearer {current_app.config["STRIPE_SECRET_KEY"]}',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    )
    try:
        with urlopen(request_obj, timeout=20) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        body_text = exc.read().decode('utf-8', errors='replace')
        current_app.logger.warning('Stripe request returned HTTP %s: %s', exc.code, body_text)
        try:
            message = json.loads(body_text).get('error', {}).get('message')
        except json.JSONDecodeError:
            message = None
        raise StripeError(message or 'Stripe rejected the request.') from exc
    except (URLError, json.JSONDecodeError) as exc:
        raise StripeError('Stripe request failed.') from exc
    except ValueError as exc:
        # http.client rejects a header value containing control characters
        # (e.g. an embedded newline from a malformed STRIPE_SECRET_KEY) with
        # a bare ValueError - surface it as a config error instead of a raw 500.
        raise StripeConfigurationError('STRIPE_SECRET_KEY is malformed - check it for stray characters or line breaks.') from exc


def create_payment_intent(*, amount, currency, loan_id, description=None):
    """Amount must be in the currency's smallest unit (e.g. cents for USD)."""
    data = {
        'amount': int(amount),
        'currency': currency,
        'metadata[loan_id]': loan_id,
        'automatic_payment_methods[enabled]': 'true',
    }
    if description:
        data['description'] = description
    return _request_form('/payment_intents', data=data)


def retrieve_payment_intent(payment_intent_id):
    return _request_form(f'/payment_intents/{payment_intent_id}', method='GET')


def verify_webhook_signature(payload_bytes, sig_header, tolerance_seconds=300):
    """Verifies a Stripe webhook signature per Stripe's documented scheme
    (t=<timestamp>,v1=<hmac>) without requiring the `stripe` package.
    """
    import hashlib
    import hmac
    import time

    secret = current_app.config.get('STRIPE_WEBHOOK_SECRET')
    if not secret:
        raise StripeConfigurationError('STRIPE_WEBHOOK_SECRET is not set; cannot verify webhook authenticity.')
    if not sig_header:
        return False
    parts = dict(item.split('=', 1) for item in sig_header.split(',') if '=' in item)
    timestamp, v1 = parts.get('t'), parts.get('v1')
    if not timestamp or not v1:
        return False
    if abs(time.time() - int(timestamp)) > tolerance_seconds:
        return False
    signed_payload = f'{timestamp}.'.encode() + payload_bytes
    expected = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)
