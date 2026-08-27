import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app.models import MpesaStkRequest


def test_repayments_allocate_to_schedule_and_complete_loan():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite://',
    })
    with app.app_context():
        db.create_all()

    client = app.test_client()
    application = client.post('/api/loans', json={
        'customerId': 'customer-1', 'amount': 100, 'interestRate': 10,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }).get_json()['loan']
    loan_id = application['id']
    assert client.post(f'/api/loans/{loan_id}/approve', json={}).status_code == 200
    assert client.post(f'/api/loans/{loan_id}/disburse', json={}).status_code == 201

    first_payment = client.post(f'/api/loans/{loan_id}/repayments', json={
        'amount': 40, 'method': 'mobile_money', 'reference': 'MPESA-001',
    })
    assert first_payment.status_code == 201
    assert first_payment.get_json()['outstandingBalance'] == 70.0

    schedule = client.get(f'/api/loans/{loan_id}/repayment-schedule').get_json()
    assert schedule['repaymentSchedule'][0]['amountPaid'] == 40.0
    assert schedule['repaymentSchedule'][0]['status'] == 'PARTIAL'

    final_payment = client.post(f'/api/loans/{loan_id}/repayments', json={'amount': 70})
    assert final_payment.status_code == 201
    assert final_payment.get_json()['loan']['status'] == 'COMPLETED'
    assert final_payment.get_json()['outstandingBalance'] == 0.0

    history = client.get(f'/api/loans/{loan_id}/repayments').get_json()
    assert len(history['repayments']) == 2


def test_mpesa_callback_records_a_confirmed_repayment_once():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    loan = client.post('/api/loans', json={
        'customerId': 'customer-2', 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }).get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={})
    client.post(f'/api/loans/{loan_id}/disburse', json={})
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
    assert client.post('/api/mpesa/stk-callback', json=callback).status_code == 200
    assert client.post('/api/mpesa/stk-callback', json=callback).get_json()['ResultDesc'] == 'Already processed'
    assert client.get(f'/api/loans/{loan_id}/repayments').get_json()['repayments'][0]['reference'] == 'TEST-RECEIPT-1'


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
    loan = client.post('/api/loans', json={
        'customerId': 'customer-3', 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }).get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={})
    client.post(f'/api/loans/{loan_id}/disburse', json={})

    response = {'CheckoutRequestID': 'checkout-2', 'MerchantRequestID': 'merchant-2', 'CustomerMessage': 'Prompt sent'}
    with patch('app.routes.initiate_stk_push', return_value=response) as stk_push:
        result = client.post(f'/api/loans/{loan_id}/mpesa/stk-push', json={'amount': 100, 'phoneNumber': '0712 345 678'})

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
    loan = client.post('/api/loans', json={
        'customerId': 'customer-4', 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }).get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={})
    client.post(f'/api/loans/{loan_id}/disburse', json={})

    result = client.post(f'/api/loans/{loan_id}/mpesa/stk-push', json={'amount': 100, 'phoneNumber': '0712345678'})

    assert result.status_code == 503
    assert 'not configured' in result.get_json()['error']


def test_mpesa_callback_rejects_invalid_payload():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()

    result = app.test_client().post('/api/mpesa/stk-callback', json={})

    assert result.status_code == 400
