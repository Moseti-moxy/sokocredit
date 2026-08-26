from datetime import datetime, timezone
from uuid import uuid4

from .extensions import db
from .security import ROLES, hash_password, verify_password


def new_id():
    return str(uuid4())


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = (
        db.CheckConstraint(f"role IN ({', '.join(repr(r) for r in ROLES)})", name='ck_users_role'),
    )

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(16), nullable=False, default='agent')
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    def set_password(self, password):
        self.password_hash = hash_password(password)

    def check_password(self, password):
        return verify_password(password, self.password_hash)


class TokenBlocklist(db.Model):
    __tablename__ = 'token_blocklist'

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, unique=True, index=True)
    token_type = db.Column(db.String(10), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)


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
