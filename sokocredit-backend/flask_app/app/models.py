from datetime import datetime, timezone
from uuid import uuid4

from .extensions import db


def new_id():
    return str(uuid4())


def utcnow():
    return datetime.now(timezone.utc)


class Loan(db.Model):
    __tablename__ = 'loans'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    customer_id = db.Column(db.String(100), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    interest_rate = db.Column(db.Numeric(5, 2), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    duration_unit = db.Column(db.String(16), nullable=False, default='months')
    repayment_frequency = db.Column(db.String(16), nullable=False, default='monthly')
    purpose = db.Column(db.Text)
    status = db.Column(db.String(16), nullable=False, default='PENDING', index=True)
    renewal_of_id = db.Column(db.String(36), db.ForeignKey('loans.id'))
    applied_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    decision = db.relationship('LoanDecision', back_populates='loan', uselist=False, cascade='all, delete-orphan')
    disbursements = db.relationship('Disbursement', back_populates='loan', cascade='all, delete-orphan', order_by='Disbursement.disbursed_at')
    repayment_schedule = db.relationship('RepaymentScheduleItem', back_populates='loan', cascade='all, delete-orphan', order_by='RepaymentScheduleItem.installment')
    repayments = db.relationship('Repayment', back_populates='loan', cascade='all, delete-orphan', order_by='Repayment.paid_at')
    mpesa_stk_requests = db.relationship('MpesaStkRequest', back_populates='loan', cascade='all, delete-orphan', order_by='MpesaStkRequest.created_at')


class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    name = db.Column(db.String(160), nullable=False)
    phone_number = db.Column(db.String(16), nullable=False, unique=True)
    national_id = db.Column(db.String(32), nullable=False, unique=True)
    business = db.Column(db.String(160), nullable=False)
    market = db.Column(db.String(160), nullable=False)
    stall = db.Column(db.String(160), nullable=False)
    kra_pin = db.Column(db.String(32))
    years_operating = db.Column(db.Integer, nullable=False, default=0)
    daily_turnover = db.Column(db.Numeric(12, 2), nullable=False)
    daily_profit = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    chama = db.Column(db.String(160))
    next_of_kin = db.Column(db.String(160))
    relationship = db.Column(db.String(64))
    next_of_kin_phone = db.Column(db.String(16))
    appraisal_notes = db.Column(db.Text)
    status = db.Column(db.String(16), nullable=False, default='ACTIVE')
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


class LoanDecision(db.Model):
    __tablename__ = 'loan_decisions'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, unique=True)
    decision_type = db.Column(db.String(16), nullable=False)
    decided_by = db.Column(db.String(100))
    reason = db.Column(db.Text)
    conditions = db.Column(db.JSON, nullable=False, default=list)
    decided_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    loan = db.relationship('Loan', back_populates='decision')


class Disbursement(db.Model):
    __tablename__ = 'disbursements'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    method = db.Column(db.String(32), nullable=False)
    reference = db.Column(db.String(100))
    disbursed_by = db.Column(db.String(100))
    disbursed_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    loan = db.relationship('Loan', back_populates='disbursements')


class RepaymentScheduleItem(db.Model):
    __tablename__ = 'repayment_schedule_items'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    installment = db.Column(db.Integer, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    amount_due = db.Column(db.Numeric(12, 2), nullable=False)
    amount_paid = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status = db.Column(db.String(16), nullable=False, default='PENDING')

    loan = db.relationship('Loan', back_populates='repayment_schedule')


class Repayment(db.Model):
    __tablename__ = 'repayments'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    method = db.Column(db.String(32), nullable=False)
    reference = db.Column(db.String(100))
    paid_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    loan = db.relationship('Loan', back_populates='repayments')


class MpesaStkRequest(db.Model):
    __tablename__ = 'mpesa_stk_requests'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    phone_number = db.Column(db.String(16), nullable=False)
    checkout_request_id = db.Column(db.String(100), nullable=False, unique=True)
    merchant_request_id = db.Column(db.String(100))
    status = db.Column(db.String(16), nullable=False, default='PENDING', index=True)
    result_code = db.Column(db.Integer)
    result_desc = db.Column(db.Text)
    mpesa_receipt_number = db.Column(db.String(100), unique=True)
    callback_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    loan = db.relationship('Loan', back_populates='mpesa_stk_requests')
