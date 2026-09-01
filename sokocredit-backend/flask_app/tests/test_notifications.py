import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from tests.helpers import auth_headers


def _make_app():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    return app


def register_customer(client, **overrides):
    payload = {
        'fullName': 'Agnes Muthoni', 'phoneNumber': '0712345678', 'nationalId': '29481029',
        'password': '1234',
    }
    payload.update(overrides)
    response = client.post('/api/customer-auth/register', json=payload)
    body = response.get_json()
    return {'Authorization': f"Bearer {body['accessToken']}"}, body['customer']['id']


def test_customer_loan_request_notifies_admin_and_lender_but_not_agent():
    app = _make_app()
    client = app.test_client()
    admin_headers = auth_headers(client)
    customer_headers, _ = register_customer(client)

    applied = client.post('/api/customer/loans', json={
        'amount': 5000, 'interestRate': 10, 'duration': 1,
        'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=customer_headers)
    assert applied.status_code == 201
    loan_id = applied.get_json()['loan']['id']

    admin_notifications = client.get('/api/notifications', headers=admin_headers).get_json()['notifications']
    matching = [n for n in admin_notifications if n['type'] == 'LOAN_REQUESTED' and n['relatedEntityId'] == loan_id]
    assert len(matching) == 1
    assert matching[0]['isRead'] is False

    from tests.helpers import staff_headers
    agent_headers = staff_headers(client, admin_headers, email='agent@sokocredit.test', role='agent')
    agent_notifications = client.get('/api/notifications', headers=agent_headers).get_json()['notifications']
    assert not any(n['relatedEntityId'] == loan_id for n in agent_notifications)


def test_disbursement_notifies_the_customer():
    app = _make_app()
    client = app.test_client()
    admin_headers = auth_headers(client)
    customer_headers, customer_id = register_customer(client)

    loan_id = client.post('/api/customer/loans', json={
        'amount': 5000, 'interestRate': 10, 'duration': 1,
        'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=customer_headers).get_json()['loan']['id']
    assert client.post(f'/api/loans/{loan_id}/approve', json={}, headers=admin_headers).status_code == 200
    assert client.post(f'/api/loans/{loan_id}/disburse', json={}, headers=admin_headers).status_code == 201

    notifications = client.get('/api/notifications', headers=customer_headers).get_json()['notifications']
    matching = [n for n in notifications if n['type'] == 'LOAN_DISBURSED' and n['relatedEntityId'] == loan_id]
    assert len(matching) == 1

    other_headers, _ = register_customer(client, phoneNumber='0700111222', nationalId='55556666')
    other_notifications = client.get('/api/notifications', headers=other_headers).get_json()['notifications']
    assert not any(n['relatedEntityId'] == loan_id for n in other_notifications)


def test_overdue_scan_notifies_the_customer():
    app = _make_app()
    client = app.test_client()
    admin_headers = auth_headers(client)
    customer_headers, _ = register_customer(client)

    loan_id = client.post('/api/customer/loans', json={
        'amount': 100, 'interestRate': 0, 'duration': 1,
        'durationUnit': 'days', 'repaymentFrequency': 'daily',
    }, headers=customer_headers).get_json()['loan']['id']
    client.post(f'/api/loans/{loan_id}/approve', json={}, headers=admin_headers)
    backdated = (datetime.now().astimezone() - timedelta(days=5)).isoformat()
    client.post(f'/api/loans/{loan_id}/disburse', json={'disbursedAt': backdated}, headers=admin_headers)

    scan = client.post('/api/risk/scan', json={}, headers=admin_headers)
    assert scan.status_code == 200
    assert scan.get_json()['created'] >= 1

    notifications = client.get('/api/notifications', headers=customer_headers).get_json()['notifications']
    assert any(n['type'] == 'PAYMENT_OVERDUE' and n['relatedEntityId'] == loan_id for n in notifications)

    # Idempotent: scanning again while the same alert is still open must not
    # duplicate the notification.
    client.post('/api/risk/scan', json={}, headers=admin_headers)
    notifications_again = client.get('/api/notifications', headers=customer_headers).get_json()['notifications']
    overdue_count = sum(1 for n in notifications_again if n['type'] == 'PAYMENT_OVERDUE' and n['relatedEntityId'] == loan_id)
    assert overdue_count == 1


def test_mark_notification_read_and_read_all():
    app = _make_app()
    client = app.test_client()
    admin_headers = auth_headers(client)
    customer_headers, _ = register_customer(client)

    loan_id = client.post('/api/customer/loans', json={
        'amount': 5000, 'interestRate': 10, 'duration': 1,
        'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=customer_headers).get_json()['loan']['id']

    notifications = client.get('/api/notifications', headers=admin_headers).get_json()['notifications']
    target = next(n for n in notifications if n['relatedEntityId'] == loan_id)
    assert target['isRead'] is False

    marked = client.patch(f"/api/notifications/{target['id']}/read", headers=admin_headers)
    assert marked.status_code == 200
    assert marked.get_json()['notification']['isRead'] is True

    read_all = client.post('/api/notifications/read-all', headers=admin_headers)
    assert read_all.status_code == 200
    assert all(n['isRead'] for n in client.get('/api/notifications', headers=admin_headers).get_json()['notifications'])


def test_notifications_require_authentication():
    app = _make_app()
    client = app.test_client()
    assert client.get('/api/notifications').status_code == 401
