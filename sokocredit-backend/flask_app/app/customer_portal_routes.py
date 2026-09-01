"""Customer self-service portal: loan applications, viewing own loans/schedule,
paying via M-Pesa/Airtel/Stripe, requesting renewals, and downloading receipts.

Every route here is guarded by @customer_required and additionally checks
loan.customer_id == get_jwt_identity() before returning or acting on a loan -
the JWT proves who you are, the ownership check is what stops a logged-in
customer from ever touching another customer's data, even if they guess a
loan ID. This double-check (auth + ownership) is intentional, not redundant:
customer_required alone only proves "this is some customer", not "this is
the right customer for this loan".
"""
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity
import io

from .airtel import AirtelConfigurationError, AirtelError, initiate_collection as airtel_initiate_collection
from .audit import log_action
from .extensions import db
from .i18n import current_lang
from .models import AirtelMoneyRequest, Customer, Loan, MpesaStkRequest, StripePaymentIntent
from .mpesa import MpesaConfigurationError, MpesaError, initiate_stk_push, normalize_phone_number
from .notification_routes import notify_roles
from .reports import generate_loan_statement_pdf, generate_receipt_pdf
from .routes import allocate_repayment, apply_terms, outstanding_balance, serialize_loan
from .security import customer_required
from .services import decimal, schedule_terms
from .stripe_client import StripeConfigurationError, StripeError, create_payment_intent

customer_portal = Blueprint('customer_portal', __name__, url_prefix='/api/customer')
FREQUENCIES = {'daily', 'weekly', 'monthly'}


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


def own_loan_or_404(loan_id, customer_id):
    """Returns the loan only if it exists AND belongs to this customer -
    a loan that exists but belongs to someone else is treated identically to
    a loan that doesn't exist, so ownership can never be probed for."""
    loan = db.session.get(Loan, loan_id)
    if not loan or loan.customer_id != customer_id:
        return None
    return loan


@customer_portal.get('/loans')
@customer_required
def list_own_loans():
    """
    List the logged-in customer's own loans
    ---
    tags: [Customer Portal]
    security: [{Bearer: []}]
    responses:
      200: {description: Array of the customer's own loans}
    """
    customer_id = get_jwt_identity()
    loans = Loan.query.filter_by(customer_id=customer_id).order_by(Loan.applied_at.desc()).all()
    return jsonify(loans=[serialize_loan(loan) for loan in loans])


@customer_portal.post('/loans')
@customer_required
def apply_for_own_loan():
    """
    Apply for a new loan as the logged-in customer
    Lands as PENDING, same as a staff-created application - a staff member still
    reviews and approves/rejects every customer-submitted request.
    ---
    tags: [Customer Portal]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [amount, interestRate, duration, durationUnit, repaymentFrequency]
          properties:
            amount: {type: number, example: 10000}
            interestRate: {type: number, example: 10}
            duration: {type: integer, example: 30}
            durationUnit: {type: string, example: days}
            repaymentFrequency: {type: string, enum: [daily, weekly, monthly]}
            purpose: {type: string, example: Restock inventory}
    responses:
      201: {description: Loan created with status PENDING}
      400: {description: Validation error}
    """
    customer_id = get_jwt_identity()
    values = body()
    loan = Loan(customer_id=customer_id, purpose=values.get('purpose'))
    try:
        apply_terms(loan, values)
    except (ValueError, TypeError, InvalidOperation):
        return error('Provide valid positive amount, duration, interestRate, and repaymentFrequency.')
    db.session.add(loan)
    log_action('CUSTOMER_APPLY_FOR_LOAN', 'Loan', loan.id, {'amount': float(loan.amount)})
    customer = db.session.get(Customer, customer_id)
    customer_name = customer.full_name if customer else 'A customer'
    notify_roles(
        ('admin', 'lender'), type='LOAN_REQUESTED', title='New loan request',
        message=f'{customer_name} requested KES {loan.amount:,.2f}.',
        related_entity_type='Loan', related_entity_id=loan.id,
    )
    db.session.commit()
    return jsonify(loan=serialize_loan(loan)), 201


@customer_portal.get('/loans/<loan_id>')
@customer_required
def get_own_loan(loan_id):
    """
    Get one of the logged-in customer's own loans by id
    ---
    tags: [Customer Portal]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
    responses:
      200: {description: The loan}
      404: {description: Loan not found}
    """
    loan = own_loan_or_404(loan_id, get_jwt_identity())
    if not loan:
        return error('Loan not found.', 404)
    return jsonify(loan=serialize_loan(loan))


@customer_portal.get('/loans/<loan_id>/repayment-schedule')
@customer_required
def own_repayment_schedule(loan_id):
    """
    Get the repayment schedule for one of the logged-in customer's own loans
    ---
    tags: [Customer Portal]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
    responses:
      200: {description: repaymentSchedule array plus outstandingBalance}
      404: {description: Loan not found}
    """
    loan = own_loan_or_404(loan_id, get_jwt_identity())
    if not loan:
        return error('Loan not found.', 404)
    items = [{'installment': i.installment, 'dueDate': i.due_date.isoformat(), 'amountDue': float(i.amount_due), 'amountPaid': float(i.amount_paid), 'status': i.status} for i in loan.repayment_schedule]
    return jsonify(repaymentSchedule=items, outstandingBalance=float(outstanding_balance(loan)))


@customer_portal.get('/loans/<loan_id>/repayments')
@customer_required
def own_repayment_history(loan_id):
    """
    List repayments for one of the logged-in customer's own loans
    ---
    tags: [Customer Portal]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
    responses:
      200: {description: Array of repayments}
      404: {description: Loan not found}
    """
    loan = own_loan_or_404(loan_id, get_jwt_identity())
    if not loan:
        return error('Loan not found.', 404)
    return jsonify(repayments=[{
        'id': r.id, 'amount': float(r.amount), 'method': r.method, 'reference': r.reference, 'paidAt': r.paid_at.isoformat(),
    } for r in loan.repayments])


@customer_portal.post('/loans/<loan_id>/mpesa/stk-push')
@customer_required
def customer_mpesa_repayment(loan_id):
    """
    Pay one of your own loans via M-PESA STK push
    ---
    tags: [Customer Portal]
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
            phoneNumber: {type: string, example: '0712345678'}
    responses:
      202: {description: STK push initiated}
      400: {description: Invalid amount or phone number}
      404: {description: Loan not found}
      409: {description: Loan not active}
      502: {description: M-PESA API error}
      503: {description: M-PESA not configured}
    """
    loan = own_loan_or_404(loan_id, get_jwt_identity())
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
        response = initiate_stk_push(amount=amount, phone_number=phone_number, account_reference=loan.id, transaction_desc=f'Loan repayment {loan.id[:8]}')
    except MpesaConfigurationError as exc:
        return error(str(exc), 503)
    except MpesaError as exc:
        return error(str(exc), 502)

    request_record = MpesaStkRequest(loan=loan, amount=amount, phone_number=phone_number, checkout_request_id=response['CheckoutRequestID'], merchant_request_id=response.get('MerchantRequestID'))
    db.session.add(request_record)
    log_action('CUSTOMER_INITIATE_MPESA', 'Loan', loan.id, {'amount': float(amount)})
    db.session.commit()
    return jsonify(checkoutRequestId=request_record.checkout_request_id, status=request_record.status, customerMessage=response.get('CustomerMessage')), 202


@customer_portal.post('/loans/<loan_id>/airtel/collect')
@customer_required
def customer_airtel_repayment(loan_id):
    """
    Pay one of your own loans via Airtel Money
    ---
    tags: [Customer Portal]
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
      202: {description: Collection initiated}
      400: {description: Invalid amount or phone number}
      404: {description: Loan not found}
      409: {description: Loan not active}
      502: {description: Airtel Money API error}
      503: {description: Airtel Money not configured}
    """
    loan = own_loan_or_404(loan_id, get_jwt_identity())
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

    request_record = AirtelMoneyRequest(loan=loan, amount=amount, phone_number=phone_number, transaction_id=response['transaction_id'])
    db.session.add(request_record)
    log_action('CUSTOMER_INITIATE_AIRTEL', 'Loan', loan.id, {'amount': float(amount)})
    db.session.commit()
    return jsonify(transactionId=request_record.transaction_id, status=request_record.status), 202


@customer_portal.post('/loans/<loan_id>/stripe/payment-intent')
@customer_required
def customer_stripe_intent(loan_id):
    """
    Pay one of your own loans via Stripe (card / international)
    ---
    tags: [Customer Portal]
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
      201: {description: PaymentIntent created}
      400: {description: Invalid amount}
      404: {description: Loan not found}
      502: {description: Stripe API error}
      503: {description: Stripe not configured}
    """
    loan = own_loan_or_404(loan_id, get_jwt_identity())
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

    intent = StripePaymentIntent(loan=loan, amount=Decimal(amount) / 100, currency=currency, payment_intent_id=response['id'], client_secret=response.get('client_secret'), status=response.get('status', 'requires_payment_method'))
    db.session.add(intent)
    log_action('CUSTOMER_INITIATE_STRIPE', 'Loan', loan.id, {'amount': amount, 'currency': currency})
    db.session.commit()
    return jsonify(paymentIntentId=intent.payment_intent_id, clientSecret=intent.client_secret, status=intent.status), 201


@customer_portal.post('/loans/<loan_id>/renew')
@customer_required
def request_own_renewal(loan_id):
    """
    Request a renewal of one of your own loans
    Creates a new PENDING loan for a staff member to review and approve - this
    never auto-approves, matching how a customer-submitted application works.
    Only allowed once the source loan has no outstanding balance.
    ---
    tags: [Customer Portal]
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
          properties:
            purpose: {type: string}
            amount: {type: number}
            interestRate: {type: number}
            duration: {type: integer}
            durationUnit: {type: string}
            repaymentFrequency: {type: string, enum: [daily, weekly, monthly]}
    responses:
      201: {description: New PENDING loan created, returns loan and renewalOf}
      400: {description: Invalid renewal terms}
      404: {description: Loan not found}
      409: {description: Loan must be active/completed with no outstanding balance}
    """
    customer_id = get_jwt_identity()
    loan = own_loan_or_404(loan_id, customer_id)
    values = body()
    if not loan:
        return error('Loan not found.', 404)
    if loan.status not in {'ACTIVE', 'COMPLETED'} or outstanding_balance(loan) > 0:
        return error('An active or completed loan with no outstanding balance is required for renewal.', 409)
    renewal = Loan(customer_id=customer_id, purpose=values.get('purpose', loan.purpose), renewal_of_id=loan.id)
    try:
        apply_terms(renewal, {
            **values, 'amount': values.get('amount', loan.amount), 'interestRate': values.get('interestRate', loan.interest_rate),
            'duration': values.get('duration', loan.duration), 'durationUnit': values.get('durationUnit', loan.duration_unit),
            'repaymentFrequency': values.get('repaymentFrequency', loan.repayment_frequency),
        })
    except (ValueError, TypeError, InvalidOperation):
        return error('Renewal terms are invalid.')
    db.session.add(renewal)
    log_action('CUSTOMER_REQUEST_RENEWAL', 'Loan', renewal.id, {'renewalOf': loan.id})
    db.session.commit()
    return jsonify(loan=serialize_loan(renewal), renewalOf=loan.id), 201


@customer_portal.get('/loans/<loan_id>/statement')
@customer_required
def own_loan_statement(loan_id):
    """
    Download a PDF statement for one of your own loans
    ---
    tags: [Customer Portal]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
    responses:
      200: {description: PDF statement}
      404: {description: Loan not found}
    """
    loan = own_loan_or_404(loan_id, get_jwt_identity())
    if not loan:
        return error('Loan not found.', 404)
    pdf_bytes, filename = generate_loan_statement_pdf(loan_id, lang=current_lang())
    log_action('CUSTOMER_DOWNLOAD_STATEMENT', 'Loan', loan_id)
    db.session.commit()
    return send_file(io.BytesIO(pdf_bytes), mimetype='application/pdf', as_attachment=True, download_name=filename)


@customer_portal.get('/repayments/<repayment_id>/receipt')
@customer_required
def own_repayment_receipt(repayment_id):
    """
    Download a PDF receipt for one of your own repayments
    ---
    tags: [Customer Portal]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: repayment_id
        type: string
        required: true
    responses:
      200: {description: PDF receipt}
      404: {description: Repayment not found}
    """
    from .models import Repayment

    customer_id = get_jwt_identity()
    repayment = db.session.get(Repayment, repayment_id)
    if not repayment or repayment.loan.customer_id != customer_id:
        return error('Repayment not found.', 404)
    pdf_bytes, filename = generate_receipt_pdf(repayment_id, lang=current_lang())
    log_action('CUSTOMER_DOWNLOAD_RECEIPT', 'Repayment', repayment_id)
    db.session.commit()
    return send_file(io.BytesIO(pdf_bytes), mimetype='application/pdf', as_attachment=True, download_name=filename)
