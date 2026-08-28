import os
import types
import importlib

from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import notification_service as notif


def test_send_sms_via_twilio_skips_without_credentials(monkeypatch):
    # ensure Twilio env vars are absent
    monkeypatch.delenv('TWILIO_ACCOUNT_SID', raising=False)
    monkeypatch.delenv('TWILIO_AUTH_TOKEN', raising=False)
    monkeypatch.delenv('TWILIO_FROM', raising=False)

    res = notif.send_sms_via_twilio('+254700000001', 'hello')
    assert isinstance(res, dict)
    assert res.get('status') == 'skipped'


def test_send_sms_via_africastalking_skips_when_not_installed(monkeypatch):
    # ensure africastalking module is not present
    monkeypatch.setenv('AFRICASTALKING_USERNAME', '')
    monkeypatch.setenv('AFRICASTALKING_API_KEY', '')
    # remove any imported module
    import sys as _sys
    _sys.modules.pop('africastalking', None)

    res = notif.send_sms_via_africastalking('+254700000001', 'hello')
    assert isinstance(res, dict)
    assert res.get('status') == 'skipped'


def test_notify_overdue_prefers_africastalking_when_configured(monkeypatch):
    sent = {}

    # fake africastalking module
    fake_at = types.SimpleNamespace()

    class FakeSMS:
        @staticmethod
        def send(message, recipients):
            sent['message'] = message
            sent['recipients'] = recipients
            return {'status': 'sent'}

    fake_at.SMS = FakeSMS

    def fake_init(u, k):
        return None

    fake_at.initialize = fake_init

    monkeypatch.setenv('AFRICASTALKING_API_KEY', 'akey')
    monkeypatch.setenv('AFRICASTALKING_USERNAME', 'user')
    import sys as _sys
    _sys.modules['africastalking'] = fake_at

    res = notif.notify_overdue('loan-1', '+254700000003', 123.45)
    assert 'sentAt' in res
    assert sent.get('recipients') == ['+254700000003'] or sent.get('recipients') == '+254700000003'
