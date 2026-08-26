import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db


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
