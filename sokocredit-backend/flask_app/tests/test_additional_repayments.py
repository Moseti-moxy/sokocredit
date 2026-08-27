from datetime import datetime
from decimal import Decimal


def test_overpayment_recorded(client, app):
    rv = client.post('/api/loans', json={'customerId': 'CUST3', 'amount': 500, 'interestRate': 5, 'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly'})
    loan = rv.get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={'approvedBy': 'admin', 'approvedAmount': 500, 'interestRate': 5, 'duration': 1, 'repaymentFrequency': 'monthly'})
    disbursed_at = datetime.utcnow().isoformat()
    client.post(f'/api/loans/{loan_id}/disburse', json={'amount': 500, 'method': 'cash', 'disbursedAt': disbursed_at})

    # pay more than outstanding
    pay_amount = 1000
    rv = client.post(f'/api/loans/{loan_id}/repayments', json={'amount': pay_amount, 'method': 'cash', 'customerPhone': '+254700000003'})
    assert rv.status_code == 200
    data = rv.get_json()
    payment_id = data['payment']['id']

    from app.models import Payment
    with app.app_context():
        p = Payment.query.get(payment_id)
        assert p is not None
        assert p.metadata_json and 'overpaid' in p.metadata_json
        assert float(p.metadata_json['overpaid']) == float(pay_amount - 500)


def test_multi_installment_allocation(client, app):
    # create loan with 2 installments
    rv = client.post('/api/loans', json={'customerId': 'CUST4', 'amount': 2000, 'interestRate': 5, 'duration': 2, 'durationUnit': 'months', 'repaymentFrequency': 'monthly'})
    loan = rv.get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={'approvedBy': 'admin', 'approvedAmount': 2000, 'interestRate': 5, 'duration': 2, 'repaymentFrequency': 'monthly'})
    disbursed_at = datetime.utcnow().isoformat()
    client.post(f'/api/loans/{loan_id}/disburse', json={'amount': 2000, 'method': 'cash', 'disbursedAt': disbursed_at})

    # make a payment that spans both installments
    rv = client.get(f'/api/loans/{loan_id}/repayment-schedule')
    schedule = rv.get_json()['repaymentSchedule']
    total_due = sum(item['amountDue'] for item in schedule)
    pay_amount = total_due
    rv = client.post(f'/api/loans/{loan_id}/repayments', json={'amount': pay_amount, 'method': 'cash', 'customerPhone': '+254700000004'})
    assert rv.status_code == 200
    data = rv.get_json()
    allocations = data['payment']['allocations']
    # expect allocations covering at least two installments
    assert len(allocations) >= 2


def test_receipt_generation_returns_pdf(client, app):
    rv = client.post('/api/loans', json={'customerId': 'CUST5', 'amount': 800, 'interestRate': 5, 'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly'})
    loan = rv.get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={'approvedBy': 'admin', 'approvedAmount': 800, 'interestRate': 5, 'duration': 1, 'repaymentFrequency': 'monthly'})
    disbursed_at = datetime.utcnow().isoformat()
    client.post(f'/api/loans/{loan_id}/disburse', json={'amount': 800, 'method': 'cash', 'disbursedAt': disbursed_at})

    rv = client.post(f'/api/loans/{loan_id}/repayments', json={'amount': 400, 'method': 'cash', 'customerPhone': '+254700000005'})
    payment_id = rv.get_json()['payment']['id']
    rv = client.get(f'/api/loans/{loan_id}/payments/{payment_id}/receipt')
    assert rv.status_code == 200
    assert rv.headers.get('Content-Type') == 'application/pdf'
