import os
import types
import importlib

from app.services.mobile_money_service import MobileMoneyService


def test_mpesa_skipped_without_credentials(monkeypatch):
    # Ensure MPESA env vars are absent
    for k in ('MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL'):
        monkeypatch.delenv(k, raising=False)

    res = MobileMoneyService.initiate_mpesa_stk_push('+254700000001', 10, 'INV-1')
    assert res['status'] == 'skipped'


def test_mpesa_initiate_posts_request(monkeypatch):
    # Provide dummy env vars so method proceeds
    monkeypatch.setenv('MPESA_CONSUMER_KEY', 'key')
    monkeypatch.setenv('MPESA_CONSUMER_SECRET', 'secret')
    monkeypatch.setenv('MPESA_SHORTCODE', '12345')
    monkeypatch.setenv('MPESA_PASSKEY', 'passkey')
    monkeypatch.setenv('MPESA_CALLBACK_URL', 'https://example.com/cb')

    # Monkeypatch token acquisition to avoid network
    monkeypatch.setattr(MobileMoneyService, '_get_mpesa_token', staticmethod(lambda k, s, token_url=None: 'fake-token'))

    # Provide a fake requests module
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
    import sys
    sys.modules['requests'] = fake_requests

    res = MobileMoneyService.initiate_mpesa_stk_push('+254700000001', 50, 'INV-2')
    assert res['status'] == 'success'
    assert 'response' in res and res['response'].get('CheckoutRequestID') == 'ABC123'


def test_airtel_uses_africastalking(monkeypatch):
    # set africa's talking env
    monkeypatch.setenv('AFRICASTALKING_API_KEY', 'akey')
    monkeypatch.setenv('AFRICASTALKING_USERNAME', 'user')

    # construct fake africastalking module
    fake_at = types.SimpleNamespace()

    class FakeSMS:
        @staticmethod
        def send(message, recipients):
            return {'status': 'sent', 'recipients': recipients, 'message': message}

    fake_at.SMS = FakeSMS
    def fake_init(u, k):
        return None

    fake_at.initialize = fake_init

    import sys
    sys.modules['africastalking'] = fake_at

    res = MobileMoneyService.initiate_airtel_payment('+254700000002', 100, 'TXN-1')
    assert res['status'] == 'success'
    assert 'result' in res
