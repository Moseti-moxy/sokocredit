import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app.models import MpesaStkRequest
from tests.helpers import auth_headers


def test_repayments_allocate_to_schedule_and_complete_loan():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite://',
    })
    with app.app_context():
        db.create_all()

    client = app.test_client()
    headers = auth_headers(client)
    application = client.post('/api/loans', json={
        'customerId': 'customer-1', 'amount': 100, 'interestRate': 10,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=headers).get_json()['loan']
    loan_id = application['id']
    assert client.post(f'/api/loans/{loan_id}/approve', json={}, headers=headers).status_code == 200
    assert client.post(f'/api/loans/{loan_id}/disburse', json={}, headers=headers).status_code == 201

    first_payment = client.post(f'/api/loans/{loan_id}/repayments', json={
        'amount': 40, 'method': 'mobile_money', 'reference': 'MPESA-001',
    }, headers=headers)
    assert first_payment.status_code == 201
    assert first_payment.get_json()['outstandingBalance'] == 70.0

    schedule = client.get(f'/api/loans/{loan_id}/repayment-schedule', headers=headers).get_json()
    assert schedule['repaymentSchedule'][0]['amountPaid'] == 40.0
    assert schedule['repaymentSchedule'][0]['status'] == 'PARTIAL'

    final_payment = client.post(f'/api/loans/{loan_id}/repayments', json={'amount': 70}, headers=headers)
    assert final_payment.status_code == 201
    assert final_payment.get_json()['loan']['status'] == 'COMPLETED'
    assert final_payment.get_json()['outstandingBalance'] == 0.0

    history = client.get(f'/api/loans/{loan_id}/repayments', headers=headers).get_json()
    assert len(history['repayments']) == 2

    receipt_id = client.get(f'/api/loans/{loan_id}/repayments', headers=headers).get_json()['repayments'][0]['id']
    receipt = client.get(f'/api/repayments/{receipt_id}/receipt', headers=headers)
    assert receipt.status_code == 200
    assert receipt.mimetype == 'application/pdf'

    statement = client.get(f'/api/loans/{loan_id}/statement', headers=headers)
    assert statement.status_code == 200
    assert statement.mimetype == 'application/pdf'


def test_loan_endpoints_require_authentication():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    assert client.post('/api/loans', json={}).status_code == 401
    assert client.get('/api/loans').status_code == 401


def test_only_lender_or_admin_can_approve_a_loan():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    admin_headers = auth_headers(client, email='admin@sokocredit.test')
    # Second registration self-registers as the lowest-privilege role (agent).
    agent_headers = auth_headers(client, email='agent@sokocredit.test')

    loan = client.post('/api/loans', json={
        'customerId': 'customer-x', 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=agent_headers).get_json()['loan']

    forbidden = client.post(f"/api/loans/{loan['id']}/approve", json={}, headers=agent_headers)
    assert forbidden.status_code == 403

    allowed = client.post(f"/api/loans/{loan['id']}/approve", json={}, headers=admin_headers)
    assert allowed.status_code == 200


def test_overdue_endpoint_flags_a_missed_installment():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    headers = auth_headers(client)
    loan = client.post('/api/loans', json={
        'customerId': 'customer-overdue', 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'days', 'repaymentFrequency': 'daily',
    }, headers=headers).get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={}, headers=headers)
    from datetime import datetime, timedelta
    backdated = (datetime.now().astimezone() - timedelta(days=5)).isoformat()
    client.post(f'/api/loans/{loan_id}/disburse', json={'disbursedAt': backdated}, headers=headers)

    overdue = client.get('/api/loans/overdue', headers=headers).get_json()['loans']
    assert any(l['id'] == loan_id for l in overdue)


def test_reschedule_installment_requires_a_reason():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    headers = auth_headers(client)
    loan = client.post('/api/loans', json={
        'customerId': 'customer-resched', 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=headers).get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={}, headers=headers)
    client.post(f'/api/loans/{loan_id}/disburse', json={}, headers=headers)
    schedule = client.get(f'/api/loans/{loan_id}/repayment-schedule', headers=headers).get_json()
    item_id = None
    with app.app_context():
        from app.models import RepaymentScheduleItem
        item_id = RepaymentScheduleItem.query.filter_by(loan_id=loan_id).first().id

    missing_reason = client.patch(
        f'/api/loans/{loan_id}/repayment-schedule/{item_id}/reschedule',
        json={'newDueDate': '2027-01-01'}, headers=headers,
    )
    assert missing_reason.status_code == 400

    ok = client.patch(
        f'/api/loans/{loan_id}/repayment-schedule/{item_id}/reschedule',
        json={'newDueDate': '2027-01-01', 'reason': 'Customer requested extension'}, headers=headers,
    )
    assert ok.status_code == 200
    assert ok.get_json()['item']['dueDate'] == '2027-01-01'
    assert ok.get_json()['item']['rescheduledCount'] == 1


def test_mpesa_callback_records_a_confirmed_repayment_once():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    headers = auth_headers(client)
    loan = client.post('/api/loans', json={
        'customerId': 'customer-2', 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=headers).get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={}, headers=headers)
    client.post(f'/api/loans/{loan_id}/disburse', json={}, headers=headers)
    with app.app_context():
        db.session.add(MpesaStkRequest(
            loan_id=loan_id, amount=100, phone_number='254712345678', checkout_request_id='checkout-1',
        ))
        db.session.commit()

    callback = {
        'Body': {'stkCallback': {
            'CheckoutRequestID': 'checkout-1', 'ResultCode': 0, 'ResultDesc': 'Success',
            'CallbackMetadata': {'Item': [
                {'Name': 'Amount', 'Value': 100},
                {'Name': 'MpesaReceiptNumber', 'Value': 'TEST-RECEIPT-1'},
            ]},
        }},
    }
    # M-PESA's servers call this callback directly - no bearer token, by design.
    assert client.post('/api/mpesa/stk-callback', json=callback).status_code == 200
    assert client.post('/api/mpesa/stk-callback', json=callback).get_json()['ResultDesc'] == 'Already processed'
    assert client.get(f'/api/loans/{loan_id}/repayments', headers=headers).get_json()['repayments'][0]['reference'] == 'TEST-RECEIPT-1'


def test_stk_push_normalizes_phone_and_tracks_the_request():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite://',
        'MPESA_ENV': 'sandbox',
        'MPESA_CONSUMER_KEY': 'key',
        'MPESA_CONSUMER_SECRET': 'secret',
        'MPESA_SHORTCODE': '174379',
        'MPESA_PASSKEY': 'passkey',
        'MPESA_CALLBACK_URL': 'https://payments.sokocredit.test/api/mpesa/stk-callback',
    })
    with app.app_context():
        db.create_all()
    client = app.test_client()
    headers = auth_headers(client)
    loan = client.post('/api/loans', json={
        'customerId': 'customer-3', 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=headers).get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={}, headers=headers)
    client.post(f'/api/loans/{loan_id}/disburse', json={}, headers=headers)

    response = {'CheckoutRequestID': 'checkout-2', 'MerchantRequestID': 'merchant-2', 'CustomerMessage': 'Prompt sent'}
    with patch('app.routes.initiate_stk_push', return_value=response) as stk_push:
        result = client.post(f'/api/loans/{loan_id}/mpesa/stk-push', json={'amount': 100, 'phoneNumber': '0712 345 678'}, headers=headers)

    assert result.status_code == 202
    assert result.get_json()['checkoutRequestId'] == 'checkout-2'
    assert stk_push.call_args.kwargs['phone_number'] == '254712345678'
    with app.app_context():
        assert MpesaStkRequest.query.filter_by(checkout_request_id='checkout-2').one().status == 'PENDING'


def test_stk_push_reports_missing_configuration_without_calling_daraja():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    headers = auth_headers(client)
    loan = client.post('/api/loans', json={
        'customerId': 'customer-4', 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=headers).get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={}, headers=headers)
    client.post(f'/api/loans/{loan_id}/disburse', json={}, headers=headers)

    result = client.post(f'/api/loans/{loan_id}/mpesa/stk-push', json={'amount': 100, 'phoneNumber': '0712345678'}, headers=headers)

    assert result.status_code == 503
    assert 'not configured' in result.get_json()['error']


def test_mpesa_callback_rejects_invalid_payload():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()

    result = app.test_client().post('/api/mpesa/stk-callback', json={})

    assert result.status_code == 400
