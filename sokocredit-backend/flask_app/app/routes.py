from datetime import datetime
from decimal import Decimal

from flask import Blueprint, jsonify, request

from .extensions import db
from .models import Disbursement, Loan, LoanDecision, Repayment, RepaymentScheduleItem
from .services import decimal, schedule_terms

api = Blueprint('api', __name__, url_prefix='/api')
FREQUENCIES = {'daily', 'weekly', 'monthly'}


def serialize_loan(loan):
    return {
        'id': loan.id, 'customerId': loan.customer_id, 'amount': float(loan.amount), 'interestRate': float(loan.interest_rate),
        'duration': loan.duration, 'durationUnit': loan.duration_unit, 'repaymentFrequency': loan.repayment_frequency,
        'purpose': loan.purpose, 'status': loan.status, 'renewalOf': loan.renewal_of_id, 'appliedAt': loan.applied_at.isoformat(),
        'decision': None if not loan.decision else {'type': loan.decision.decision_type, 'by': loan.decision.decided_by, 'reason': loan.decision.reason, 'conditions': loan.decision.conditions, 'decidedAt': loan.decision.decided_at.isoformat()},
    }


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


def loan_or_404(loan_id):
    return db.session.get(Loan, loan_id)


def apply_terms(loan, values):
    frequency = values.get('repaymentFrequency', loan.repayment_frequency)
    if frequency not in FREQUENCIES:
        raise ValueError('repaymentFrequency must be daily, weekly, or monthly.')
    loan.amount = decimal(values.get('approvedAmount', values.get('amount', loan.amount)))
    loan.interest_rate = decimal(values.get('interestRate', loan.interest_rate))
    loan.duration = int(values.get('duration', loan.duration))
    loan.duration_unit = values.get('durationUnit', loan.duration_unit)
    loan.repayment_frequency = frequency
    if loan.amount <= 0 or loan.interest_rate < 0 or loan.duration <= 0:
        raise ValueError('amount and duration must be positive; interestRate cannot be negative.')


@api.get('/health')
def health():
    return {'status': 'ok'}


@api.post('/loans')
def apply_for_loan():
    values = body()
    if not values.get('customerId'):
        return error('customerId is required.')
    loan = Loan(customer_id=values['customerId'], purpose=values.get('purpose'))
    try:
        apply_terms(loan, values)
    except (ValueError, TypeError):
        return error('Provide valid positive amount, duration, interestRate, and repaymentFrequency.')
    db.session.add(loan)
    db.session.commit()
    return jsonify(loan=serialize_loan(loan)), 201


@api.get('/loans')
def list_loans():
    query = Loan.query.order_by(Loan.created_at.desc())
    if customer_id := request.args.get('customerId'):
        query = query.filter_by(customer_id=customer_id)
    return jsonify(loans=[serialize_loan(loan) for loan in query.all()])


@api.get('/loans/<loan_id>')
def get_loan(loan_id):
    loan = loan_or_404(loan_id)
    return error('Loan not found.', 404) if not loan else jsonify(loan=serialize_loan(loan))


@api.post('/loans/<loan_id>/approve')
def approve(loan_id):
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    if loan.status != 'PENDING':
        return error('Only pending applications can be approved.', 409)
    values = body()
    try:
        apply_terms(loan, values)
    except (ValueError, TypeError):
        return error('Approval terms are invalid.')
    loan.status = 'APPROVED'
    loan.decision = LoanDecision(decision_type='APPROVED', decided_by=values.get('approvedBy'), conditions=values.get('conditions', []))
    db.session.commit()
    return jsonify(loan=serialize_loan(loan))


@api.post('/loans/<loan_id>/reject')
def reject(loan_id):
    loan = loan_or_404(loan_id)
    values = body()
    if not loan:
        return error('Loan not found.', 404)
    if loan.status != 'PENDING':
        return error('Only pending applications can be rejected.', 409)
    if not str(values.get('reason', '')).strip():
        return error('A rejection reason is required.')
    loan.status = 'REJECTED'
    loan.decision = LoanDecision(decision_type='REJECTED', decided_by=values.get('rejectedBy'), reason=values['reason'].strip(), conditions=values.get('conditions', []))
    db.session.commit()
    return jsonify(loan=serialize_loan(loan))


@api.post('/loans/<loan_id>/disburse')
def disburse(loan_id):
    loan = loan_or_404(loan_id)
    values = body()
    if not loan:
        return error('Loan not found.', 404)
    if loan.status != 'APPROVED':
        return error('Only approved loans can be disbursed.', 409)
    amount = decimal(values.get('amount', loan.amount))
    if amount <= 0 or amount > loan.amount:
        return error('Disbursement amount must be positive and cannot exceed the approved amount.')
    disbursed_at = datetime.fromisoformat(values['disbursedAt']) if values.get('disbursedAt') else datetime.now().astimezone()
    disbursement = Disbursement(loan=loan, amount=amount, method=values.get('method', 'bank_transfer'), reference=values.get('reference'), disbursed_by=values.get('disbursedBy'), disbursed_at=disbursed_at)
    for item in schedule_terms(amount, loan.interest_rate, loan.duration, loan.duration_unit, loan.repayment_frequency, disbursed_at.date()):
        db.session.add(RepaymentScheduleItem(loan=loan, **item))
    loan.status = 'ACTIVE'
    db.session.add(disbursement)
    db.session.commit()
    return jsonify(loan=serialize_loan(loan), disbursement={'id': disbursement.id, 'amount': float(disbursement.amount), 'method': disbursement.method, 'reference': disbursement.reference, 'disbursedAt': disbursement.disbursed_at.isoformat()}), 201


@api.get('/loans/<loan_id>/disbursements')
def disbursement_history(loan_id):
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    return jsonify(disbursements=[{'id': d.id, 'amount': float(d.amount), 'method': d.method, 'reference': d.reference, 'disbursedAt': d.disbursed_at.isoformat()} for d in loan.disbursements])


@api.get('/loans/<loan_id>/repayment-schedule')
def repayment_schedule(loan_id):
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    items = [{'installment': i.installment, 'dueDate': i.due_date.isoformat(), 'amountDue': float(i.amount_due), 'amountPaid': float(i.amount_paid), 'status': i.status} for i in loan.repayment_schedule]
    return jsonify(repaymentSchedule=items, outstandingBalance=float(sum((i.amount_due - i.amount_paid for i in loan.repayment_schedule), Decimal('0'))))


@api.post('/loans/<loan_id>/renew')
def renew(loan_id):
    loan = loan_or_404(loan_id)
    values = body()
    if not loan:
        return error('Loan not found.', 404)
    balance = sum((i.amount_due - i.amount_paid for i in loan.repayment_schedule), Decimal('0'))
    if loan.status not in {'ACTIVE', 'COMPLETED'} or (balance > 0 and not values.get('settleOutstandingBalance')):
        return error('An active or completed loan with no outstanding balance is required for renewal.', 409)
    renewal = Loan(customer_id=loan.customer_id, purpose=values.get('purpose', loan.purpose), renewal_of_id=loan.id)
    try:
        apply_terms(renewal, {**values, 'amount': values.get('amount', loan.amount), 'interestRate': values.get('interestRate', loan.interest_rate), 'duration': values.get('duration', loan.duration), 'durationUnit': values.get('durationUnit', loan.duration_unit), 'repaymentFrequency': values.get('repaymentFrequency', loan.repayment_frequency)})
    except (ValueError, TypeError):
        return error('Renewal terms are invalid.')
    db.session.add(renewal)
    db.session.commit()
    return jsonify(loan=serialize_loan(renewal), renewalOf=loan.id), 201
