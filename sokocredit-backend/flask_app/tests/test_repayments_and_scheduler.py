from datetime import datetime, timedelta
import json


def test_repayment_allocation_and_schedule(client, app):
    # create loan
    rv = client.post('/api/loans', json={'customerId': 'CUST1', 'amount': 1000, 'interestRate': 10, 'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly'})
    assert rv.status_code == 201
    loan = rv.get_json()['loan']
    loan_id = loan['id']

    # approve
    rv = client.post(f'/api/loans/{loan_id}/approve', json={'approvedBy': 'admin', 'approvedAmount': 1000, 'interestRate': 10, 'duration': 1, 'repaymentFrequency': 'monthly'})
    assert rv.status_code == 200

    # disburse with today as disbursedAt
    disbursed_at = datetime.utcnow().isoformat()
    rv = client.post(f'/api/loans/{loan_id}/disburse', json={'amount': 1000, 'method': 'cash', 'disbursedAt': disbursed_at})
    assert rv.status_code == 201

    # get schedule
    rv = client.get(f'/api/loans/{loan_id}/repayment-schedule')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'repaymentSchedule' in data
    schedule = data['repaymentSchedule']
    assert len(schedule) >= 1
    first = schedule[0]
    amount_due = first['amountDue']

    # make a partial payment smaller than amount_due
    pay_amount = float(amount_due) / 2
    rv = client.post(f'/api/loans/{loan_id}/repayments', json={'amount': pay_amount, 'method': 'cash', 'customerPhone': '+254700000001'})
    assert rv.status_code == 200
    resp = rv.get_json()
    assert resp['payment']['allocations'][0]['amount'] == float(pay_amount)

    # verify schedule updated via API
    rv = client.get(f'/api/loans/{loan_id}/repayment-schedule')
    schedule2 = rv.get_json()['repaymentSchedule']
    assert schedule2[0]['amountPaid'] == float(pay_amount)
    assert schedule2[0]['status'] in ('PARTIAL', 'PAID')
    # verify DB rows: Payment and Repayment created and linked
    from app.models import Payment, Repayment, RepaymentScheduleItem
    with app.app_context():
        payments = Payment.query.filter_by(loan_id=loan_id).all()
        assert len(payments) == 1
        payment = payments[0]
        assert float(payment.amount) == float(pay_amount)
        # repayment linked to payment
        repayments = Repayment.query.filter_by(payment_id=payment.id).all()
        assert len(repayments) >= 1
        rep = repayments[0]
        assert float(rep.amount) == float(pay_amount)
        # schedule item updated
        schedule_item = RepaymentScheduleItem.query.filter_by(loan_id=loan_id, installment=rep.schedule_item.installment).first()
        assert float(schedule_item.amount_paid) == float(pay_amount)


def test_scheduler_triggers_notifications(client, app, monkeypatch):
    notified = []

    def fake_notify(loan_id, to_number, amount_due):
        notified.append((loan_id, to_number, amount_due))
        return {'sentAt': 'now', 'result': 'ok'}

    # monkeypatch notify_overdue in service
    import app.services.notification_service as notif
    monkeypatch.setattr(notif, 'notify_overdue', fake_notify)

    # create loan and disburse with a past date to create overdue item
    rv = client.post('/api/loans', json={'customerId': 'CUST2', 'amount': 1000, 'interestRate': 10, 'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly'})
    loan = rv.get_json()['loan']
    loan_id = loan['id']
    client.post(f'/api/loans/{loan_id}/approve', json={'approvedBy': 'admin', 'approvedAmount': 1000, 'interestRate': 10, 'duration': 1, 'repaymentFrequency': 'monthly'})

    past = (datetime.utcnow() - timedelta(days=40)).isoformat()
    client.post(f'/api/loans/{loan_id}/disburse', json={'amount': 1000, 'method': 'cash', 'disbursedAt': past})

    # run scheduler
    from tasks.scheduler_service import find_overdue_and_notify
    find_overdue_and_notify(app)

    # expect at least one notification
    assert len(notified) >= 1
    lid, to, amt = notified[0]
    assert lid == loan_id
