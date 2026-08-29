"""Kenya business registration lookups (eCitizen / Business Registration
Service - BRS). Same honesty note as app/crb.py: BRS does not expose a public
API; integration happens through Kenya's Huduma/eCitizen government
API gateway, which requires a registered MDA (government-approved) API
consumer agreement. This module gives you the wired client shape to drop
real credentials into once that agreement is in place.
"""
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import current_app


class BusinessRegistryError(Exception):
    pass


class BusinessRegistryConfigurationError(BusinessRegistryError):
    pass


def required_config():
    names = ('BRS_API_BASE_URL', 'BRS_API_KEY')
    missing = [name for name in names if not str(current_app.config.get(name) or '').strip()]
    if missing:
        raise BusinessRegistryConfigurationError(
            f'Business registry lookups are not configured: {", ".join(missing)}. '
            'Requires a Kenya eCitizen/BRS API consumer agreement.'
        )


def lookup_business(registration_number):
    required_config()
    request_obj = Request(
        f'{current_app.config["BRS_API_BASE_URL"].rstrip("/")}/businesses/{registration_number}',
        headers={'Authorization': f'Bearer {current_app.config["BRS_API_KEY"]}', 'Accept': 'application/json'},
    )
    try:
        with urlopen(request_obj, timeout=20) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        if exc.code == 404:
            return None
        current_app.logger.warning('Business registry request returned HTTP %s.', exc.code)
        raise BusinessRegistryError('The business registry rejected the request.') from exc
    except (URLError, json.JSONDecodeError) as exc:
        raise BusinessRegistryError('Business registry request failed.') from exc
