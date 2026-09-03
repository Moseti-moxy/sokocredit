"""Kenya Credit Reference Bureau (CRB) integration.

Honesty check: there is no public, self-serve CRB API. Metropol, TransUnion
Kenya, and Creditinfo (the three licensed CRBs) all require a signed data-
sharing agreement, KYC of your institution, and a CBK-regulated-lender or
registered-microfinance status before they issue API credentials - this is a
business/legal step, not a coding one, and nothing running in this sandbox
can complete it for you.

What's actually implemented: the full client shape (required_config, a
request function, response normalization) so that once you have real
credentials from whichever bureau you sign with, wiring them in is a config
change, not a rewrite - exactly the same pattern as app/mpesa.py before you
had Daraja credentials. Until then, calls raise CrbConfigurationError, which
routes.py turns into a 503 rather than pretending to succeed.
"""
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import current_app


class CrbError(Exception):
    pass


class CrbConfigurationError(CrbError):
    pass


def required_config():
    names = ('CRB_PROVIDER', 'CRB_API_BASE_URL', 'CRB_API_KEY')
    missing = [name for name in names if not str(current_app.config.get(name) or '').strip()]
    if missing:
        raise CrbConfigurationError(
            f'CRB lookups are not configured: {", ".join(missing)}. '
            'A CRB API is only available after you sign a data-sharing agreement with a '
            'licensed bureau (Metropol / TransUnion Kenya / Creditinfo) - this cannot be '
            'automated from here.'
        )


def check_customer(*, national_id, full_name):
    """Runs a credit check against the configured bureau. Returns a normalized
    dict: {'score', 'rating', 'flags': [...], 'raw': <provider response>}.
    """ 
    required_config()
    payload = json.dumps({'nationalId': national_id, 'fullName': full_name}).encode()
    request_obj = Request(
        f'{current_app.config["CRB_API_BASE_URL"].rstrip("/")}/credit-check', method='POST',
        headers={'Authorization': f'Bearer {current_app.config["CRB_API_KEY"]}', 'Content-Type': 'application/json'},
        data=payload,
    )
    try:
        with urlopen(request_obj, timeout=20) as response:
            raw = json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        current_app.logger.warning('CRB request returned HTTP %s.', exc.code)
        raise CrbError('The credit bureau rejected the request.') from exc
    except (URLError, json.JSONDecodeError) as exc:
        raise CrbError('CRB request failed.') from exc

    # Field names below are placeholders - each bureau has its own response
    # schema, so this mapping must be adjusted to whichever provider you sign with.
    return {
        'score': raw.get('score'),
        'rating': raw.get('rating'),
        'flags': raw.get('flags', []),
        'raw': raw,
    }
