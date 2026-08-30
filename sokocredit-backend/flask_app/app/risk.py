"""Risk management: scans active loans/customers and raises RiskAlert rows for
overdue installments and low credit scores, plus suggests loan renewals for
customers with a strong repayment history. Designed to be called both from an
API endpoint (POST /api/risk/scan) and from a scheduled job (cron/APScheduler)
- see app/notifications.py's docstring for the same reminder-sending pattern.
"""
from datetime import date

from customers.scoring import compute_credit_score

from .extensions import db
from .models import Customer, Loan, RiskAlert

HIGH_RISK_SCORE_THRESHOLD = 45
MULTIPLE_MISSED_THRESHOLD = 2


def _open_alert_exists(customer_id, loan_id, alert_type):
    return db.session.query(RiskAlert.id).filter_by(
        customer_id=customer_id, loan_id=loan_id, alert_type=alert_type, is_resolved=False,
    ).first() is not None


def scan_for_risk_alerts():
    """Idempotent: running this repeatedly won't create duplicate open alerts
    for the same customer/loan/alert_type. Returns the list of newly created
    RiskAlert objects (not yet committed - caller commits).
    """
    created = []
    today = date.today()
    active_loans = Loan.query.filter_by(status='ACTIVE').all()

    for loan in active_loans:
        overdue_items = [i for i in loan.repayment_schedule if i.status != 'PAID' and i.amount_paid < i.amount_due and i.due_date < today]
        if not overdue_items:
            continue
        alert_type = 'MULTIPLE_MISSED' if len(overdue_items) >= MULTIPLE_MISSED_THRESHOLD else 'OVERDUE'
        if _open_alert_exists(loan.customer_id, loan.id, alert_type):
            continue
        days_overdue = (today - overdue_items[0].due_date).days
        severity = 'HIGH' if len(overdue_items) >= MULTIPLE_MISSED_THRESHOLD or days_overdue > 30 else 'MEDIUM'
        alert = RiskAlert(
            customer_id=loan.customer_id, loan_id=loan.id, alert_type=alert_type, severity=severity,
            message=f'{len(overdue_items)} overdue installment(s) on loan {loan.id[:8]}, oldest {days_overdue} day(s) overdue.',
        )
        db.session.add(alert)
        created.append(alert)

    for customer in Customer.query.filter_by(status='ACTIVE').all():
        result = compute_credit_score(customer.id)
        if result['score'] >= HIGH_RISK_SCORE_THRESHOLD or result['loansConsidered'] == 0:
            continue
        if _open_alert_exists(customer.id, None, 'HIGH_RISK_SCORE'):
            continue
        alert = RiskAlert(
            customer_id=customer.id, loan_id=None, alert_type='HIGH_RISK_SCORE', severity='HIGH',
            message=f'Credit score {result["score"]} ({result["rating"]}); default rate {result["defaultRatePct"]}%.',
        )
        db.session.add(alert)
        created.append(alert)

    return created


def suggest_renewals(min_score=65, min_completed_loans=1):
    """Returns customers whose repayment history supports offering a renewal:
    a good credit score and at least one fully completed loan, with no
    currently active loan (so they're free to take a new one)."""
    suggestions = []
    for customer in Customer.query.filter_by(status='ACTIVE').all():
        has_active = any(loan.status == 'ACTIVE' for loan in Loan.query.filter_by(customer_id=customer.id).all())
        if has_active:
            continue
        result = compute_credit_score(customer.id)
        if result['score'] >= min_score and result['completedLoans'] >= min_completed_loans:
            last_loan = Loan.query.filter_by(customer_id=customer.id, status='COMPLETED').order_by(Loan.updated_at.desc()).first()
            suggestions.append({
                'customerId': customer.id,
                'customerName': customer.full_name,
                'creditScore': result['score'],
                'rating': result['rating'],
                'completedLoans': result['completedLoans'],
                'lastLoanId': last_loan.id if last_loan else None,
                'suggestedAmount': float(last_loan.amount) * 1.1 if last_loan else None,
            })
    return suggestions
