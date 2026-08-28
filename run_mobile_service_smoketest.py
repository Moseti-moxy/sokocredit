import os
import sys
import types
from pathlib import Path

# ensure flask_app package is importable
ROOT = Path(__file__).resolve().parents[0] / 'sokocredit-backend' / 'flask_app'
sys.path.insert(0, str(ROOT))

# stub dotenv if not installed so importing app doesn't fail during these
# isolated smoke tests
import types as _types
import sys as _sys
if 'dotenv' not in _sys.modules:
    try:
        import dotenv  # noqa: F401
    except Exception:
        _sys.modules['dotenv'] = _types.SimpleNamespace(load_dotenv=lambda *a, **k: None)

from app.services.mobile_money_service import MobileMoneyService


def assert_ok(cond, msg):
    if not cond:
        print('FAIL:', msg)
        sys.exit(1)


def test_mpesa_skipped_without_credentials():
    for k in ('MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL'):
        os.environ.pop(k, None)
    res = MobileMoneyService.initiate_mpesa_stk_push('+254700000001', 10, 'INV-1')
    assert_ok(res.get('status') == 'skipped', 'mpesa should be skipped without creds')
    print('mpesa skipped test passed')


def test_mpesa_post():
    os.environ['MPESA_CONSUMER_KEY'] = 'key'
    os.environ['MPESA_CONSUMER_SECRET'] = 'secret'
    os.environ['MPESA_SHORTCODE'] = '12345'
    os.environ['MPESA_PASSKEY'] = 'pass'
    os.environ['MPESA_CALLBACK_URL'] = 'https://example.com/cb'

    # monkeypatch token acquisition
    MobileMoneyService._get_mpesa_token = staticmethod(lambda k, s, token_url=None: 'fake-token')

    fake_requests = types.SimpleNamespace()

    class FakeResponse:
        def __init__(self, status_code, data):
            self.status_code = status_code
            self._data = data

        def json(self):
            return self._data

        @property
        def text(self):
            return str(self._data)

    def fake_post(url, json=None, headers=None, timeout=None):
        return FakeResponse(200, {'CheckoutRequestID': 'ABC123', 'ResponseCode': '0'})

    fake_requests.post = fake_post
    sys.modules['requests'] = fake_requests

    res = MobileMoneyService.initiate_mpesa_stk_push('+254700000001', 50, 'INV-2')
    assert_ok(res.get('status') == 'success', 'mpesa post should succeed with fake requests')
    print('mpesa post test passed')


def test_airtel():
    os.environ['AFRICASTALKING_API_KEY'] = 'akey'
    os.environ['AFRICASTALKING_USERNAME'] = 'user'

    fake_at = types.SimpleNamespace()

    class FakeSMS:
        @staticmethod
        def send(message, recipients):
            return {'status': 'sent', 'recipients': recipients, 'message': message}

    fake_at.SMS = FakeSMS
    fake_at.initialize = lambda u, k: None
    sys.modules['africastalking'] = fake_at

    res = MobileMoneyService.initiate_airtel_payment('+254700000002', 100, 'TXN-1')
    assert_ok(res.get('status') == 'success', 'airtel should return success with fake at')
    print('airtel test passed')


if __name__ == '__main__':
    test_mpesa_skipped_without_credentials()
    test_mpesa_post()
    test_airtel()
    print('All mobile money smoke tests passed')
