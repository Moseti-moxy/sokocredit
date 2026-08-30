from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity

from .airtel import AirtelConfigurationError, AirtelError, initiate_collection as airtel_initiate_collection
from .audit import log_action
from .extensions import db
from .i18n import current_lang
from .models import (
    AirtelMoneyRequest, Customer, Disbursement, InventoryFinancingItem, Loan, LoanDecision,
    MpesaStkRequest, Repayment, RepaymentScheduleItem, StripePaymentIntent,
)
from .mpesa import MpesaConfigurationError, MpesaError, initiate_stk_push, normalize_phone_number
from .reports import generate_customer_statement_pdf, generate_loan_statement_pdf, generate_receipt_pdf
from .security import blind_index, role_required
from .services import decimal, schedule_terms
from .stripe_client import StripeConfigurationError, StripeError, create_payment_intent, verify_webhook_signature
import io

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


def serialize_inventory_item(item):
    loan = item.loan
    next_unpaid = next((i for i in loan.repayment_schedule if i.amount_paid < i.amount_due), None)
    today = date.today()
    return {
        'id': item.id, 'loanId': loan.id, 'itemName': item.item_name, 'quantity': float(item.quantity),
        'unitCost': float(item.unit_cost), 'totalCost': float(item.quantity * item.unit_cost),
        'soldUnits': float(item.sold_units), 'supplier': item.supplier,
        'purchasedAt': item.purchased_at.isoformat() if item.purchased_at else None,
        'financedAmount': float(loan.amount),
        'repaymentStatus': 'At Risk' if next_unpaid and next_unpaid.due_date < today else 'On Track',
        'daysLeft': (next_unpaid.due_date - today).days if next_unpaid else None,
    }


def serialize_repayment(repayment):
    return {
        'id': repayment.id,
        'amount': float(repayment.amount),
        'method': repayment.method,
        'reference': repayment.reference,
        'paidAt': repayment.paid_at.isoformat(),
    }


def allocate_repayment(loan, amount, *, method, reference, paid_at, recorded_by_user_id=None):
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
    repayment = Repayment(loan=loan, amount=amount, method=method, reference=reference, paid_at=paid_at, recorded_by_user_id=recorded_by_user_id)
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
    """
    Health check
    ---
    tags: [Health]
    responses:
      200: {description: "{'status': 'ok'}"}
    """
    return {'status': 'ok'}


@api.get('/legacy/customers')
@role_required('admin', 'lender', 'agent')
def list_customers():
    """
    List legacy customers
    Deprecated: use /api/customers instead. Reads from a separate, older customer table.
    ---
    tags: [Legacy Customers]
    responses:
      200: {description: Array of legacy customers}
    """
    return jsonify(customers=[serialize_customer(customer) for customer in Customer.query.order_by(Customer.created_at.desc()).all()])


@api.post('/legacy/customers')
@role_required('admin', 'lender', 'agent')
def create_customer():
    """
    Create a legacy customer
    Deprecated: use POST /api/customers instead.
    ---
    tags: [Legacy Customers]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [name, phone, nationalId, business, market, stall, dailyTurnover]
          properties:
            name: {type: string}
            phone: {type: string, example: '0712345678'}
            nationalId: {type: string}
            business: {type: string}
            market: {type: string}
            stall: {type: string}
            dailyTurnover: {type: number}
            dailyProfit: {type: number}
            yearsOperating: {type: integer}
    responses:
      201: {description: Customer created}
      400: {description: Validation error}
      409: {description: A customer with this phone number or national ID already exists}
    """
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
    national_id = str(values['nationalId']).strip()
    if Customer.query.filter(
        (Customer.phone_number_hash == blind_index(phone)) | (Customer.national_id_hash == blind_index(national_id))
    ).first():
        return error('A customer with this phone number or national ID already exists.', 409)
    customer = Customer(
        name=str(values['name']).strip(), phone_number=phone, phone_number_hash=blind_index(phone),
        national_id=national_id, national_id_hash=blind_index(national_id),
        business=str(values['business']).strip(), market=str(values['market']).strip(), stall=str(values['stall']).strip(),
        kra_pin=str(values.get('kraPin') or '').strip() or None, years_operating=years_operating,
        daily_turnover=turnover, daily_profit=profit, chama=str(values.get('chama') or '').strip() or None,
        next_of_kin=str(values.get('nextOfKin') or '').strip() or None, relationship=str(values.get('relationship') or '').strip() or None,
        next_of_kin_phone=normalize_phone_number(values['nextOfKinPhone']) if len(''.join(char for char in str(values.get('nextOfKinPhone', '')) if char.isdigit())) >= 9 else None,
        appraisal_notes=str(values.get('appraisalNotes') or '').strip() or None,
    )
    db.session.add(customer)
    log_action('CREATE_CUSTOMER_LEGACY', 'Customer', customer.id)
    db.session.commit()
    return jsonify(customer=serialize_customer(customer)), 201


@api.post('/loans')
@role_required('admin', 'lender', 'agent')
def apply_for_loan():
    """
    Apply for a loan
    ---
    tags: [Loans]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [customerId, amount, interestRate, duration, durationUnit, repaymentFrequency]
          properties:
            customerId: {type: string}
            amount: {type: number, example: 10000}
            interestRate: {type: number, example: 10}
            duration: {type: integer, example: 30}
            durationUnit: {type: string, example: days}
            repaymentFrequency: {type: string, enum: [daily, weekly, monthly], example: daily}
            purpose: {type: string, example: Restock inventory}
    responses:
      201: {description: Loan created with status PENDING}
      400: {description: Validation error}
    """
    values = body()
    if not values.get('customerId'):
        return error('customerId is required.')
    loan = Loan(customer_id=values['customerId'], purpose=values.get('purpose'))
    try:
        apply_terms(loan, values)
    except (ValueError, TypeError, InvalidOperation):
        return error('Provide valid positive amount, duration, interestRate, and repaymentFrequency.')
    db.session.add(loan)
    log_action('CREATE_LOAN', 'Loan', loan.id, {'customerId': loan.customer_id, 'amount': float(loan.amount)})
    db.session.commit()
    return jsonify(loan=serialize_loan(loan)), 201


@api.get('/loans')
@role_required('admin', 'lender', 'agent')
def list_loans():
    """
    List loans
    ---
    tags: [Loans]
    parameters:
      - in: query
        name: customerId
        type: string
        required: false
    responses:
      200: {description: Array of loans}
    """
    query = Loan.query.order_by(Loan.created_at.desc())
    if customer_id := request.args.get('customerId'):
        query = query.filter_by(customer_id=customer_id)
    if status := request.args.get('status'):
        query = query.filter_by(status=status.upper())
    return jsonify(loans=[serialize_loan(loan) for loan in query.all()])


@api.get('/loans/overdue')
@role_required('admin', 'lender', 'agent')
def overdue_loans():
    """
    List active loans with at least one overdue, unpaid installment
    ---
    tags: [Loans]
    security: [{Bearer: []}]
    responses:
      200: {description: Array of loans, each annotated with overdueInstallments and daysOverdue}
    """
    today = date.today()
    results = []
    for loan in Loan.query.filter_by(status='ACTIVE').order_by(Loan.created_at.desc()).all():
        overdue_items = [i for i in loan.repayment_schedule if i.status != 'PAID' and i.amount_paid < i.amount_due and i.due_date < today]
        if not overdue_items:
            continue
        results.append({
            **serialize_loan(loan),
            'outstandingBalance': float(outstanding_balance(loan)),
            'overdueInstallments': len(overdue_items),
            'daysOverdue': (today - overdue_items[0].due_date).days,
            'oldestOverdueDate': overdue_items[0].due_date.isoformat(),
        })
    results.sort(key=lambda r: r['daysOverdue'], reverse=True)
    return jsonify(loans=results)


@api.get('/loans/<loan_id>')
@role_required('admin', 'lender', 'agent')
def get_loan(loan_id):
    """
    Get a loan by id
    ---
    tags: [Loans]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
    responses:
      200: {description: The loan}
      404: {description: Loan not found}
    """
    loan = loan_or_404(loan_id)
    return error('Loan not found.', 404) if not loan else jsonify(loan=serialize_loan(loan))


@api.post('/loans/<loan_id>/approve')
@role_required('admin', 'lender')
def approve(loan_id):
    """
    Approve a pending loan
    ---
    tags: [Loans]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [approvedAmount, interestRate, duration, durationUnit, repaymentFrequency]
          properties:
            approvedAmount: {type: number}
            interestRate: {type: number}
            duration: {type: integer}
            durationUnit: {type: string}
            repaymentFrequency: {type: string, enum: [daily, weekly, monthly]}
            approvedBy: {type: string}
            conditions: {type: array, items: {type: string}}
    responses:
      200: {description: Loan approved}
      400: {description: Invalid approval terms}
      404: {description: Loan not found}
      409: {description: Only pending applications can be approved}
    """
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
    log_action('APPROVE_LOAN', 'Loan', loan.id, {'approvedAmount': float(loan.amount)})
    db.session.commit()
    return jsonify(loan=serialize_loan(loan))


@api.post('/loans/<loan_id>/reject')
@role_required('admin', 'lender')
def reject(loan_id):
    """
    Reject a pending loan
    ---
    tags: [Loans]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [reason]
          properties:
            reason: {type: string, example: Insufficient collateral}
            rejectedBy: {type: string}
            conditions: {type: array, items: {type: string}}
    responses:
      200: {description: Loan rejected}
      400: {description: A rejection reason is required}
      404: {description: Loan not found}
      409: {description: Only pending applications can be rejected}
    """
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
    log_action('REJECT_LOAN', 'Loan', loan.id, {'reason': values['reason'].strip()})
    db.session.commit()
    return jsonify(loan=serialize_loan(loan))


@api.post('/loans/<loan_id>/disburse')
@role_required('admin', 'lender')
def disburse(loan_id):
    """
    Disburse an approved loan
    Generates the repayment schedule and moves the loan to ACTIVE.
    ---
    tags: [Loans]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            amount: {type: number, description: Defaults to the approved amount}
            method: {type: string, example: bank_transfer}
            reference: {type: string}
            disbursedBy: {type: string}
            disbursedAt: {type: string, format: date-time}
    responses:
      201: {description: Loan disbursed, status ACTIVE}
      400: {description: Invalid amount or disbursedAt}
      404: {description: Loan not found}
      409: {description: Only approved loans can be disbursed}
    """
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
    disbursement = Disbursement(
        loan=loan, amount=amount, method=values.get('method', 'bank_transfer'), reference=values.get('reference'),
        disbursed_by=values.get('disbursedBy'), disbursed_by_user_id=get_jwt_identity(), disbursed_at=disbursed_at,
    )
    for item in schedule_terms(amount, loan.interest_rate, loan.duration, loan.duration_unit, loan.repayment_frequency, disbursed_at.date()):
        db.session.add(RepaymentScheduleItem(loan=loan, original_due_date=item['due_date'], **item))
    loan.status = 'ACTIVE'
    db.session.add(disbursement)
    log_action('DISBURSE_LOAN', 'Loan', loan.id, {'amount': float(amount), 'method': disbursement.method})
    db.session.commit()
    return jsonify(loan=serialize_loan(loan), disbursement={'id': disbursement.id, 'amount': float(disbursement.amount), 'method': disbursement.method, 'reference': disbursement.reference, 'disbursedAt': disbursement.disbursed_at.isoformat()}), 201


@api.get('/loans/<loan_id>/disbursements')
@role_required('admin', 'lender', 'agent')
def disbursement_history(loan_id):
    """
    List a loan's disbursements
    ---
    tags: [Loans]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
    responses:
      200: {description: Array of disbursements}
      404: {description: Loan not found}
    """
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    return jsonify(disbursements=[{'id': d.id, 'amount': float(d.amount), 'method': d.method, 'reference': d.reference, 'disbursedAt': d.disbursed_at.isoformat()} for d in loan.disbursements])


@api.get('/loans/<loan_id>/repayment-schedule')
@role_required('admin', 'lender', 'agent')
def repayment_schedule(loan_id):
    """
    Get a loan's repayment schedule
    ---
    tags: [Loans]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
    responses:
      200: {description: repaymentSchedule array plus outstandingBalance}
      404: {description: Loan not found}
    """
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    items = [{'installment': i.installment, 'dueDate': i.due_date.isoformat(), 'amountDue': float(i.amount_due), 'amountPaid': float(i.amount_paid), 'status': i.status} for i in loan.repayment_schedule]
    return jsonify(repaymentSchedule=items, outstandingBalance=float(outstanding_balance(loan)))


@api.patch('/loans/<loan_id>/repayment-schedule/<item_id>/reschedule')
@role_required('admin', 'lender')
def reschedule_installment(loan_id, item_id):
    """
    Reschedule a single repayment-schedule installment
    Moves an unpaid or partially-paid installment's due date. Requires a reason,
    per the 'loan terms cannot be modified without proper authorization and
    documentation' rule - the reason and who approved it are both recorded.
    ---
    tags: [Loans]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: path
        name: item_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [newDueDate, reason]
          properties:
            newDueDate: {type: string, format: date}
            reason: {type: string, example: Customer requested extension due to slow market week}
    responses:
      200: {description: Updated schedule item}
      400: {description: Invalid date or missing reason}
      404: {description: Loan or installment not found}
      409: {description: Cannot reschedule an already-paid installment}
    """
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    item = next((i for i in loan.repayment_schedule if i.id == item_id), None)
    if not item:
        return error('Installment not found.', 404)
    if item.status == 'PAID':
        return error('Cannot reschedule an installment that has already been paid.', 409)
    values = body()
    reason = str(values.get('reason', '')).strip()
    if not reason:
        return error('A reason is required to reschedule an installment.')
    try:
        new_due_date = date.fromisoformat(values['newDueDate'])
    except (KeyError, ValueError, TypeError):
        return error('newDueDate must be a valid ISO date.')
    if not item.original_due_date:
        item.original_due_date = item.due_date
    item.due_date = new_due_date
    item.rescheduled_count += 1
    item.reschedule_reason = reason
    log_action('RESCHEDULE_INSTALLMENT', 'RepaymentScheduleItem', item.id, {
        'loanId': loan.id, 'newDueDate': new_due_date.isoformat(), 'reason': reason,
    })
    db.session.commit()
    return jsonify(item={
        'installment': item.installment, 'dueDate': item.due_date.isoformat(),
        'originalDueDate': item.original_due_date.isoformat(), 'amountDue': float(item.amount_due),
        'amountPaid': float(item.amount_paid), 'status': item.status,
        'rescheduledCount': item.rescheduled_count, 'rescheduleReason': item.reschedule_reason,
    })


@api.post('/loans/<loan_id>/repayments')
@role_required('admin', 'lender', 'agent')
def record_repayment(loan_id):
    """
    Record a manual repayment (cash, bank, etc.)
    ---
    tags: [Loans]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [amount]
          properties:
            amount: {type: number, example: 500}
            method: {type: string, example: cash}
            reference: {type: string}
            paidAt: {type: string, format: date-time}
    responses:
      201: {description: repayment, updated loan, and outstandingBalance}
      400: {description: Invalid amount or paidAt, or amount exceeds balance}
      404: {description: Loan not found}
      409: {description: Loan not active or has no outstanding balance}
    """
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

    repayment = allocate_repayment(
        loan, amount, method=values.get('method', 'cash'), reference=values.get('reference'),
        paid_at=paid_at, recorded_by_user_id=get_jwt_identity(),
    )
    log_action('RECORD_REPAYMENT', 'Loan', loan.id, {'amount': float(amount), 'method': repayment.method})
    db.session.commit()
    return jsonify(
        repayment=serialize_repayment(repayment),
        loan=serialize_loan(loan),
        outstandingBalance=float(outstanding_balance(loan)),
    ), 201


@api.get('/loans/<loan_id>/repayments')
@role_required('admin', 'lender', 'agent')
def repayment_history(loan_id):
    """
    List a loan's repayments
    ---
    tags: [Loans]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
    responses:
      200: {description: Array of repayments}
      404: {description: Loan not found}
    """
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    return jsonify(repayments=[serialize_repayment(repayment) for repayment in loan.repayments])


@api.get('/repayments/<repayment_id>/receipt')
@role_required('admin', 'lender', 'agent')
def repayment_receipt(repayment_id):
    """
    Download a PDF receipt for a repayment
    ---
    tags: [Loans]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: repayment_id
        type: string
        required: true
      - in: query
        name: lang
        type: string
        enum: [en, sw]
        required: false
    responses:
      200: {description: PDF receipt}
      404: {description: Repayment not found}
    """
    result = generate_receipt_pdf(repayment_id, lang=current_lang())
    if not result:
        return error('Repayment not found.', 404)
    pdf_bytes, filename = result
    log_action('DOWNLOAD_RECEIPT', 'Repayment', repayment_id)
    db.session.commit()
    return send_file(io.BytesIO(pdf_bytes), mimetype='application/pdf', as_attachment=True, download_name=filename)


@api.get('/loans/<loan_id>/statement')
@role_required('admin', 'lender', 'agent')
def loan_statement(loan_id):
    """
    Download a PDF statement for a loan (schedule + payment history)
    ---
    tags: [Loans]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: query
        name: lang
        type: string
        enum: [en, sw]
        required: false
    responses:
      200: {description: PDF statement}
      404: {description: Loan not found}
    """
    result = generate_loan_statement_pdf(loan_id, lang=current_lang())
    if not result:
        return error('Loan not found.', 404)
    pdf_bytes, filename = result
    log_action('DOWNLOAD_LOAN_STATEMENT', 'Loan', loan_id)
    db.session.commit()
    return send_file(io.BytesIO(pdf_bytes), mimetype='application/pdf', as_attachment=True, download_name=filename)


@api.get('/customers/<customer_id>/statement')
@role_required('admin', 'lender', 'agent')
def customer_statement(customer_id):
    """
    Download a PDF statement summarising all of a customer's loans
    ---
    tags: [Customers]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
      - in: query
        name: lang
        type: string
        enum: [en, sw]
        required: false
    responses:
      200: {description: PDF statement}
      404: {description: Customer not found}
    """
    result = generate_customer_statement_pdf(customer_id, lang=current_lang())
    if not result:
        return error('Customer not found.', 404)
    pdf_bytes, filename = result
    log_action('DOWNLOAD_CUSTOMER_STATEMENT', 'Customer', customer_id)
    db.session.commit()
    return send_file(io.BytesIO(pdf_bytes), mimetype='application/pdf', as_attachment=True, download_name=filename)


@api.post('/loans/<loan_id>/mpesa/stk-push')
@role_required('admin', 'lender', 'agent')
def initiate_mpesa_repayment(loan_id):
    """
    Initiate an M-PESA STK push repayment
    Requires MPESA_* env vars to be configured; amount must be a whole shilling.
    ---
    tags: [Loans]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [amount, phoneNumber]
          properties:
            amount: {type: number, example: 500}
            phoneNumber: {type: string, example: '0712345678'}
    responses:
      202: {description: STK push initiated, returns checkoutRequestId}
      400: {description: Invalid amount, phone number, or non-whole-shilling amount}
      404: {description: Loan not found}
      409: {description: Loan not active}
      502: {description: M-PESA API error}
      503: {description: M-PESA not configured}
    """
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
    log_action('INITIATE_MPESA_STK', 'Loan', loan.id, {'amount': float(amount)})
    db.session.commit()
    return jsonify(
        checkoutRequestId=request_record.checkout_request_id,
        merchantRequestId=request_record.merchant_request_id,
        status=request_record.status,
        customerMessage=response.get('CustomerMessage'),
    ), 202


@api.post('/loans/<loan_id>/airtel/collect')
@role_required('admin', 'lender', 'agent')
def initiate_airtel_repayment(loan_id):
    """
    Initiate an Airtel Money collection (push payment) for a loan repayment
    Requires AIRTEL_* env vars to be configured.
    ---
    tags: [Loans]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [amount, phoneNumber]
          properties:
            amount: {type: number, example: 500}
            phoneNumber: {type: string, example: '0733123456'}
    responses:
      202: {description: Collection initiated, returns transactionId}
      400: {description: Invalid amount or phone number}
      404: {description: Loan not found}
      409: {description: Loan not active}
      502: {description: Airtel Money API error}
      503: {description: Airtel Money not configured}
    """
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
    try:
        phone_number = normalize_phone_number(values.get('phoneNumber'))
        response = airtel_initiate_collection(amount=amount, phone_number=phone_number, reference=f'Loan repayment {loan.id[:8]}')
    except AirtelConfigurationError as exc:
        return error(str(exc), 503)
    except AirtelError as exc:
        return error(str(exc), 502)

    request_record = AirtelMoneyRequest(
        loan=loan, amount=amount, phone_number=phone_number, transaction_id=response['transaction_id'],
        airtel_money_id=response.get('data', {}).get('transaction', {}).get('id'),
    )
    db.session.add(request_record)
    log_action('INITIATE_AIRTEL_COLLECTION', 'Loan', loan.id, {'amount': float(amount)})
    db.session.commit()
    return jsonify(transactionId=request_record.transaction_id, status=request_record.status), 202


@api.post('/airtel/callback')
def airtel_callback():
    """
    Airtel Money collection callback (Airtel -> server)
    Not meant for manual testing; Airtel calls this to report collection results.
    ---
    tags: [Loans]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          description: Airtel Money collection callback payload
    responses:
      200: {description: Acknowledged}
    """
    from .airtel import verify_callback_signature

    raw_body = request.get_data()
    if not verify_callback_signature(raw_body, request.headers.get('X-Signature')):
        return jsonify(status='invalid signature'), 401

    payload = body()
    transaction = payload.get('transaction', {})
    transaction_id = transaction.get('id')
    request_record = AirtelMoneyRequest.query.filter_by(transaction_id=transaction_id).first() if transaction_id else None
    if not request_record:
        return jsonify(status='accepted')
    if request_record.status != 'PENDING':
        return jsonify(status='already processed')

    request_record.callback_data = payload
    status_code = str(transaction.get('status', '')).upper()
    if status_code not in {'TS', 'SUCCESS'}:
        request_record.status = 'FAILED'
        request_record.status_message = transaction.get('message') or 'Airtel Money reported a failed collection.'
        db.session.commit()
        return jsonify(status='accepted')

    try:
        callback_amount = decimal(transaction.get('amount'))
    except (InvalidOperation, TypeError, ValueError):
        callback_amount = None
    if callback_amount != request_record.amount:
        request_record.status = 'FAILED'
        request_record.status_message = 'Callback amount did not match the pending request.'
        db.session.commit()
        return jsonify(status='accepted')

    request_record.status = 'SUCCESS'
    allocate_repayment(request_record.loan, request_record.amount, method='airtel_money', reference=transaction_id, paid_at=datetime.now().astimezone())
    db.session.commit()
    return jsonify(status='accepted')


@api.post('/loans/<loan_id>/stripe/payment-intent')
@role_required('admin', 'lender', 'agent')
def create_stripe_intent(loan_id):
    """
    Create a Stripe PaymentIntent for a loan repayment (card / international payers)
    Amount is in the loan's currency's smallest unit (e.g. cents for USD).
    Requires STRIPE_SECRET_KEY to be configured.
    ---
    tags: [Loans]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [amount]
          properties:
            amount: {type: integer, example: 500, description: Amount in the smallest currency unit}
            currency: {type: string, example: usd, default: usd}
    responses:
      201: {description: PaymentIntent created, returns clientSecret for the frontend to confirm}
      400: {description: Invalid amount}
      404: {description: Loan not found}
      502: {description: Stripe API error}
      503: {description: Stripe not configured}
    """
    loan = loan_or_404(loan_id)
    values = body()
    if not loan:
        return error('Loan not found.', 404)
    try:
        amount = int(values.get('amount'))
    except (TypeError, ValueError):
        return error('amount must be a valid integer in the smallest currency unit.')
    if amount <= 0:
        return error('amount must be positive.')
    currency = str(values.get('currency', 'usd')).lower()
    try:
        response = create_payment_intent(amount=amount, currency=currency, loan_id=loan.id, description=f'Loan repayment {loan.id[:8]}')
    except StripeConfigurationError as exc:
        return error(str(exc), 503)
    except StripeError as exc:
        return error(str(exc), 502)

    intent = StripePaymentIntent(
        loan=loan, amount=Decimal(amount) / 100, currency=currency,
        payment_intent_id=response['id'], client_secret=response.get('client_secret'), status=response.get('status', 'requires_payment_method'),
    )
    db.session.add(intent)
    log_action('CREATE_STRIPE_INTENT', 'Loan', loan.id, {'amount': amount, 'currency': currency})
    db.session.commit()
    return jsonify(paymentIntentId=intent.payment_intent_id, clientSecret=intent.client_secret, status=intent.status), 201


@api.post('/stripe/webhook')
def stripe_webhook():
    """
    Stripe webhook (Stripe -> server)
    Not meant for manual testing; verifies the Stripe-Signature header before processing.
    ---
    tags: [Loans]
    responses:
      200: {description: Acknowledged}
      400: {description: Invalid signature}
    """
    raw_body = request.get_data()
    try:
        if not verify_webhook_signature(raw_body, request.headers.get('Stripe-Signature')):
            return jsonify(error='Invalid signature.'), 400
    except StripeConfigurationError as exc:
        return error(str(exc), 503)

    event = body()
    data_object = event.get('data', {}).get('object', {})
    payment_intent_id = data_object.get('id')
    intent = StripePaymentIntent.query.filter_by(payment_intent_id=payment_intent_id).first() if payment_intent_id else None
    if not intent:
        return jsonify(received=True)

    intent.status = data_object.get('status', intent.status)
    intent.event_data = event
    if event.get('type') == 'payment_intent.succeeded' and intent.loan.status == 'ACTIVE':
        allocate_repayment(intent.loan, intent.amount, method='stripe', reference=payment_intent_id, paid_at=datetime.now().astimezone())
    db.session.commit()
    return jsonify(received=True)


@api.post('/loans/<loan_id>/inventory-items')
@role_required('admin', 'lender', 'agent')
def add_inventory_item(loan_id):
    """
    Record a stock/inventory item purchased with an inventory-financing loan
    ---
    tags: [Loans]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [itemName, unitCost]
          properties:
            itemName: {type: string, example: 20kg sack of maize flour}
            quantity: {type: number, default: 1}
            unitCost: {type: number, example: 2500}
            supplier: {type: string}
            purchasedAt: {type: string, format: date}
    responses:
      201: {description: Inventory item recorded}
      400: {description: Validation error}
      404: {description: Loan not found}
    """
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    values = body()
    item_name = str(values.get('itemName', '')).strip()
    if not item_name:
        return error('itemName is required.')
    try:
        quantity = decimal(values.get('quantity', 1))
        unit_cost = decimal(values['unitCost'])
        purchased_at = date.fromisoformat(values['purchasedAt']) if values.get('purchasedAt') else None
    except (KeyError, InvalidOperation, TypeError, ValueError):
        return error('quantity, unitCost, and purchasedAt (if given) must be valid.')
    if quantity <= 0 or unit_cost <= 0:
        return error('quantity and unitCost must be positive.')
    item = InventoryFinancingItem(
        loan=loan, item_name=item_name, quantity=quantity, unit_cost=unit_cost,
        supplier=values.get('supplier'), purchased_at=purchased_at,
    )
    db.session.add(item)
    log_action('ADD_INVENTORY_ITEM', 'Loan', loan.id, {'itemName': item_name})
    db.session.commit()
    return jsonify(item=serialize_inventory_item(item)), 201


@api.get('/loans/<loan_id>/inventory-items')
@role_required('admin', 'lender', 'agent')
def list_inventory_items(loan_id):
    """
    List inventory items purchased with a loan
    ---
    tags: [Loans]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
    responses:
      200: {description: Array of inventory items}
      404: {description: Loan not found}
    """
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    return jsonify(items=[serialize_inventory_item(i) for i in loan.inventory_items])


@api.patch('/loans/<loan_id>/inventory-items/<item_id>')
@role_required('admin', 'lender', 'agent')
def update_inventory_item(loan_id, item_id):
    """
    Update a stock/inventory item (e.g. record units sold)
    ---
    tags: [Loans]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: path
        name: item_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            soldUnits: {type: number, example: 3}
            quantity: {type: number}
            unitCost: {type: number}
            supplier: {type: string}
    responses:
      200: {description: Updated inventory item}
      400: {description: Validation error}
      404: {description: Loan or item not found}
    """
    loan = loan_or_404(loan_id)
    if not loan:
        return error('Loan not found.', 404)
    item = next((i for i in loan.inventory_items if i.id == item_id), None)
    if not item:
        return error('Inventory item not found.', 404)
    values = body()
    try:
        if 'soldUnits' in values:
            item.sold_units = decimal(values['soldUnits'])
        if 'quantity' in values:
            item.quantity = decimal(values['quantity'])
        if 'unitCost' in values:
            item.unit_cost = decimal(values['unitCost'])
    except (InvalidOperation, TypeError, ValueError):
        return error('soldUnits, quantity, and unitCost must be valid numbers.')
    if item.sold_units < 0 or item.quantity <= 0 or item.unit_cost <= 0:
        return error('soldUnits must not be negative; quantity and unitCost must be positive.')
    if item.sold_units > item.quantity:
        return error('soldUnits cannot exceed quantity.')
    if 'supplier' in values:
        item.supplier = values.get('supplier')
    log_action('UPDATE_INVENTORY_ITEM', 'Loan', loan.id, {'itemId': item.id})
    db.session.commit()
    return jsonify(item=serialize_inventory_item(item))


@api.post('/mpesa/stk-callback')
def mpesa_stk_callback():
    """
    M-PESA STK push callback (Safaricom -> server)
    Not meant for manual testing; Safaricom calls this to report STK push results.
    ---
    tags: [Loans]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          description: Safaricom Daraja STK callback payload
    responses:
      200: {description: Always returns ResultCode 0 to acknowledge receipt}
    """
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
@role_required('admin', 'lender')
def renew(loan_id):
    """
    Renew an active or completed loan
    Creates a new loan linked via renewalOf. Requires no outstanding balance, or settleOutstandingBalance: true.
    ---
    tags: [Loans]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            purpose: {type: string}
            amount: {type: number}
            interestRate: {type: number}
            duration: {type: integer}
            durationUnit: {type: string}
            repaymentFrequency: {type: string, enum: [daily, weekly, monthly]}
            settleOutstandingBalance: {type: boolean}
    responses:
      201: {description: New loan created, returns loan and renewalOf}
      400: {description: Invalid renewal terms}
      404: {description: Loan not found}
      409: {description: Loan must be active/completed with no outstanding balance}
    """
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
    log_action('RENEW_LOAN', 'Loan', renewal.id, {'renewalOf': loan.id})
    db.session.commit()
    return jsonify(loan=serialize_loan(renewal), renewalOf=loan.id), 201
