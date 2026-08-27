from datetime import datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request

from .extensions import db
from .models import Customer, Disbursement, Loan, LoanDecision, MpesaStkRequest, Repayment, RepaymentScheduleItem
from .mpesa import MpesaConfigurationError, MpesaError, initiate_stk_push, normalize_phone_number
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


def serialize_customer(customer):
    return {
        'id': customer.id, 'name': customer.name, 'phone': customer.phone_number,
        'nationalId': customer.national_id, 'business': customer.business, 'market': customer.market,
        'stall': customer.stall, 'kraPin': customer.kra_pin, 'yearsOperating': customer.years_operating,
        'dailyTurnover': float(customer.daily_turnover), 'dailyProfit': float(customer.daily_profit),
        'chama': customer.chama, 'nextOfKin': customer.next_of_kin, 'relationship': customer.relationship,
        'nextOfKinPhone': customer.next_of_kin_phone, 'appraisalNotes': customer.appraisal_notes,
        'status': customer.status.title(), 'createdAt': customer.created_at.isoformat(),
    }


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


def loan_or_404(loan_id):
    return db.session.get(Loan, loan_id)


def outstanding_balance(loan):
    return sum((item.amount_due - item.amount_paid for item in loan.repayment_schedule), Decimal('0'))


def serialize_repayment(repayment):
    return {
        'id': repayment.id,
        'amount': float(repayment.amount),
        'method': repayment.method,
        'reference': repayment.reference,
        'paidAt': repayment.paid_at.isoformat(),
    }


def allocate_repayment(loan, amount, *, method, reference, paid_at):
    remaining = amount
    for item in loan.repayment_schedule:
        due = item.amount_due - item.amount_paid
        if due <= 0:
            continue
        allocated = min(remaining, due)
        item.amount_paid += allocated
        remaining -= allocated
        item.status = 'PAID' if item.amount_paid >= item.amount_due else 'PARTIAL'
        if remaining == 0:
            break
    repayment = Repayment(loan=loan, amount=amount, method=method, reference=reference, paid_at=paid_at)
    db.session.add(repayment)
    if outstanding_balance(loan) == 0:
        loan.status = 'COMPLETED'
    return repayment


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


@api.get('/customers')
def list_customers():
    return jsonify(customers=[serialize_customer(customer) for customer in Customer.query.order_by(Customer.created_at.desc()).all()])


@api.post('/customers')
def create_customer():
    values = body()
    required = ('name', 'phone', 'nationalId', 'business', 'market', 'stall', 'dailyTurnover')
    missing = [name for name in required if not str(values.get(name, '')).strip()]
    if missing:
        return error(f'Missing required customer fields: {", ".join(missing)}.')
    try:
        phone = normalize_phone_number(values['phone'])
        turnover = decimal(values['dailyTurnover'])
        profit = decimal(values.get('dailyProfit', 0))
        years_operating = int(values.get('yearsOperating', 0))
    except (ValueError, TypeError, InvalidOperation):
        return error('Customer phone, turnover, profit, or years operating is invalid.')
    if turnover <= 0 or profit < 0 or years_operating < 0:
        return error('Customer turnover must be positive; profit and years operating cannot be negative.')
    if Customer.query.filter((Customer.phone_number == phone) | (Customer.national_id == str(values['nationalId']).strip())).first():
        return error('A customer with this phone number or national ID already exists.', 409)
    customer = Customer(
        name=str(values['name']).strip(), phone_number=phone, national_id=str(values['nationalId']).strip(),
        business=str(values['business']).strip(), market=str(values['market']).strip(), stall=str(values['stall']).strip(),
        kra_pin=str(values.get('kraPin') or '').strip() or None, years_operating=years_operating,
        daily_turnover=turnover, daily_profit=profit, chama=str(values.get('chama') or '').strip() or None,
        next_of_kin=str(values.get('nextOfKin') or '').strip() or None, relationship=str(values.get('relationship') or '').strip() or None,
        next_of_kin_phone=normalize_phone_number(values['nextOfKinPhone']) if len(''.join(char for char in str(values.get('nextOfKinPhone', '')) if char.isdigit())) >= 9 else None,
        appraisal_notes=str(values.get('appraisalNotes') or '').strip() or None,
    )
    db.session.add(customer)
    db.session.commit()
    return jsonify(customer=serialize_customer(customer)), 201


@api.post('/loans')
def apply_for_loan():
    values = body()
    if not values.get('customerId'):
        return error('customerId is required.')
    loan = Loan(customer_id=values['customerId'], purpose=values.get('purpose'))
    try:
        apply_terms(loan, values)
    except (ValueError, TypeError, InvalidOperation):
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
    except (ValueError, TypeError, InvalidOperation):
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
    try:
        amount = decimal(values.get('amount', loan.amount))
        disbursed_at = datetime.fromisoformat(values['disbursedAt']) if values.get('disbursedAt') else datetime.now().astimezone()
    except (ValueError, TypeError, InvalidOperation):
        return error('Provide a valid amount and disbursedAt.')
    if amount <= 0 or amount > loan.amount:
        return error('Disbursement amount must be positive and cannot exceed the approved amount.')
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
    return jsonify(repaymentSchedule=items, outstandingBalance=float(outstanding_balance(loan)))


@api.post('/loans/<loan_id>/repayments')
def record_repayment(loan_id):
    loan = loan_or_404(loan_id)
    values = body()
    if not loan:
        return error('Loan not found.', 404)
    if loan.status != 'ACTIVE':
        return error('Only active loans can receive repayments.', 409)

    try:
        amount = decimal(values.get('amount'))
    except (InvalidOperation, TypeError, ValueError):
        return error('Repayment amount must be a valid positive number.')
    if amount <= 0:
        return error('Repayment amount must be a valid positive number.')

    balance = outstanding_balance(loan)
    if balance <= 0:
        return error('This loan has no outstanding balance.', 409)
    if amount > balance:
        return error('Repayment amount cannot exceed the outstanding balance.')

    try:
        paid_at = datetime.fromisoformat(values['paidAt']) if values.get('paidAt') else datetime.now().astimezone()
    except (TypeError, ValueError):
        return error('paidAt must be a valid ISO 8601 datetime.')

    repayment = allocate_repayment(loan, amount, method=values.get('method', 'cash'), reference=values.get('reference'), paid_at=paid_at)
    db.session.commit()
    return jsonify(
        repayment=serialize_repayment(repayment),
        loan=serialize_loan(loan),
        outstandingBalance=float(outstanding_balance(loan)),
    ), 201


@api.get('/loans/<loan_id>/repayments')
def repayment_history(loan_id):
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    return jsonify(repayments=[serialize_repayment(repayment) for repayment in loan.repayments])


@api.post('/loans/<loan_id>/mpesa/stk-push')
def initiate_mpesa_repayment(loan_id):
    loan = loan_or_404(loan_id)
    values = body()
    if not loan:
        return error('Loan not found.', 404)
    if loan.status != 'ACTIVE':
        return error('Only active loans can receive repayments.', 409)
    try:
        amount = decimal(values.get('amount'))
    except (InvalidOperation, TypeError, ValueError):
        return error('Repayment amount must be a valid positive number.')
    balance = outstanding_balance(loan)
    if amount <= 0 or amount > balance:
        return error('Repayment amount must be positive and cannot exceed the outstanding balance.')
    if amount != amount.to_integral_value():
        return error('M-PESA repayment amounts must be whole Kenyan shillings.')
    try:
        phone_number = normalize_phone_number(values.get('phoneNumber'))
        response = initiate_stk_push(
            amount=amount, phone_number=phone_number, account_reference=loan.id,
            transaction_desc=f'Loan repayment {loan.id[:8]}',
        )
    except MpesaConfigurationError as exc:
        return error(str(exc), 503)
    except MpesaError as exc:
        return error(str(exc), 502)

    request_record = MpesaStkRequest(
        loan=loan, amount=amount, phone_number=phone_number,
        checkout_request_id=response['CheckoutRequestID'],
        merchant_request_id=response.get('MerchantRequestID'),
    )
    db.session.add(request_record)
    db.session.commit()
    return jsonify(
        checkoutRequestId=request_record.checkout_request_id,
        merchantRequestId=request_record.merchant_request_id,
        status=request_record.status,
        customerMessage=response.get('CustomerMessage'),
    ), 202


@api.post('/mpesa/stk-callback')
def mpesa_stk_callback():
    payload = body()
    callback = payload.get('Body', {}).get('stkCallback')
    if not isinstance(callback, dict):
        return error('Invalid M-PESA STK callback payload.')
    checkout_request_id = callback.get('CheckoutRequestID')
    request_record = MpesaStkRequest.query.filter_by(checkout_request_id=checkout_request_id).first() if checkout_request_id else None
    if not request_record:
        return jsonify(ResultCode=0, ResultDesc='Accepted')
    if request_record.status != 'PENDING':
        return jsonify(ResultCode=0, ResultDesc='Already processed')

    try:
        result_code = int(callback.get('ResultCode'))
    except (TypeError, ValueError):
        request_record.status = 'FAILED'
        request_record.result_desc = 'Callback did not include a valid result code.'
        request_record.callback_data = callback
        db.session.commit()
        return jsonify(ResultCode=0, ResultDesc='Accepted')
    request_record.result_code = result_code
    request_record.result_desc = callback.get('ResultDesc')
    request_record.callback_data = callback
    if result_code != 0:
        request_record.status = 'FAILED'
        db.session.commit()
        return jsonify(ResultCode=0, ResultDesc='Accepted')

    metadata_items = callback.get('CallbackMetadata', {}).get('Item', [])
    if not isinstance(metadata_items, list):
        metadata_items = []
    metadata = {item.get('Name'): item.get('Value') for item in metadata_items if isinstance(item, dict)}
    receipt = metadata.get('MpesaReceiptNumber')
    try:
        callback_amount = decimal(metadata.get('Amount'))
    except (InvalidOperation, TypeError, ValueError):
        callback_amount = None
    callback_phone = metadata.get('PhoneNumber')
    if not receipt or callback_amount != request_record.amount or (callback_phone and str(callback_phone) != request_record.phone_number):
        request_record.status = 'FAILED'
        request_record.result_desc = 'Callback payment details did not match the pending request.'
        db.session.commit()
        return jsonify(ResultCode=0, ResultDesc='Accepted')
    if MpesaStkRequest.query.filter(MpesaStkRequest.mpesa_receipt_number == receipt, MpesaStkRequest.id != request_record.id).first():
        request_record.status = 'FAILED'
        request_record.result_desc = 'Duplicate M-PESA receipt number.'
        db.session.commit()
        return jsonify(ResultCode=0, ResultDesc='Accepted')

    request_record.mpesa_receipt_number = receipt
    request_record.status = 'SUCCESS'
    allocate_repayment(
        request_record.loan, request_record.amount, method='mpesa', reference=receipt,
        paid_at=datetime.now().astimezone(),
    )
    db.session.commit()
    return jsonify(ResultCode=0, ResultDesc='Accepted')


@api.post('/loans/<loan_id>/renew')
def renew(loan_id):
    loan = loan_or_404(loan_id)
    values = body()
    if not loan:
        return error('Loan not found.', 404)
    balance = outstanding_balance(loan)
    if loan.status not in {'ACTIVE', 'COMPLETED'} or (balance > 0 and not values.get('settleOutstandingBalance')):
        return error('An active or completed loan with no outstanding balance is required for renewal.', 409)
    renewal = Loan(customer_id=loan.customer_id, purpose=values.get('purpose', loan.purpose), renewal_of_id=loan.id)
    try:
        apply_terms(renewal, {**values, 'amount': values.get('amount', loan.amount), 'interestRate': values.get('interestRate', loan.interest_rate), 'duration': values.get('duration', loan.duration), 'durationUnit': values.get('durationUnit', loan.duration_unit), 'repaymentFrequency': values.get('repaymentFrequency', loan.repayment_frequency)})
    except (ValueError, TypeError, InvalidOperation):
        return error('Renewal terms are invalid.')
    db.session.add(renewal)
    db.session.commit()
    return jsonify(loan=serialize_loan(renewal), renewalOf=loan.id), 201
