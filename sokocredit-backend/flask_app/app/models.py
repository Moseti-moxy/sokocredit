from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import synonym

from .extensions import db
from .security import ROLES, EncryptedString, hash_password, verify_password


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
    group_id = db.Column(db.String(36), db.ForeignKey('lending_groups.id'), index=True)
    applied_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    decision = db.relationship('LoanDecision', back_populates='loan', uselist=False, cascade='all, delete-orphan')
    group = db.relationship('LendingGroup', back_populates='loans')
    disbursements = db.relationship('Disbursement', back_populates='loan', cascade='all, delete-orphan', order_by='Disbursement.disbursed_at')
    repayment_schedule = db.relationship('RepaymentScheduleItem', back_populates='loan', cascade='all, delete-orphan', order_by='RepaymentScheduleItem.installment')
    repayments = db.relationship('Repayment', back_populates='loan', cascade='all, delete-orphan', order_by='Repayment.paid_at')
    mpesa_stk_requests = db.relationship('MpesaStkRequest', back_populates='loan', cascade='all, delete-orphan', order_by='MpesaStkRequest.created_at')
    airtel_requests = db.relationship('AirtelMoneyRequest', back_populates='loan', cascade='all, delete-orphan', order_by='AirtelMoneyRequest.created_at')
    stripe_intents = db.relationship('StripePaymentIntent', back_populates='loan', cascade='all, delete-orphan', order_by='StripePaymentIntent.created_at')
    reminders = db.relationship('PaymentReminder', back_populates='loan', cascade='all, delete-orphan', order_by='PaymentReminder.sent_at')
    inventory_items = db.relationship('InventoryFinancingItem', back_populates='loan', cascade='all, delete-orphan')


class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    name = db.Column(db.String(160), nullable=False)
    # PII at rest: encrypted with app.security.EncryptedString (Fernet/AES). Because
    # Fernet ciphertext is randomized, exact-match lookups and the uniqueness
    # constraint run against a paired blind-index hash column instead (see
    # app.security.blind_index) - never against the ciphertext itself.
    phone_number = db.Column(EncryptedString(255), nullable=False)
    phone_number_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    national_id = db.Column(EncryptedString(255), nullable=False)
    national_id_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    business = db.Column(db.String(160), nullable=False)
    market = db.Column(db.String(160), nullable=False)
    stall = db.Column(db.String(160), nullable=False)
    kra_pin = db.Column(EncryptedString(255))
    years_operating = db.Column(db.Integer, nullable=False, default=0)
    daily_turnover = db.Column(db.Numeric(12, 2), nullable=False)
    daily_profit = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    chama = db.Column(db.String(160))
    next_of_kin = db.Column(db.String(160))
    relationship = db.Column(db.String(64))
    next_of_kin_phone = db.Column(EncryptedString(255))
    appraisal_notes = db.Column(db.Text)
    status = db.Column(db.String(16), nullable=False, default='ACTIVE')
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    # CM's API names map onto the existing persistent customer record so both
    # features share one table and existing customers remain available.
    full_name = synonym('name')
    business_name = synonym('business')
    stall_number = synonym('stall')
    years_in_business = synonym('years_operating')

    email = db.Column(EncryptedString(255))
    email_hash = db.Column(db.String(64), unique=True, index=True)
    gender = db.Column(db.String(16))
    date_of_birth = db.Column(db.Date)
    business_type = db.Column(db.String(64))
    business_registration_number = db.Column(db.String(64))
    address = db.Column(EncryptedString(1000))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    seasonal_pattern = db.Column(db.JSON, default=dict)
    registered_by = db.Column(db.String(100))
    group_id = db.Column(db.String(36), db.ForeignKey('lending_groups.id'), index=True)
    # Customer self-service portal login. Nullable: a customer created by staff
    # (the normal onboarding path) has no login until they self-register or an
    # agent issues them one - login is refused with a clear message rather than
    # silently accepting an empty/None PIN (see customer_auth_routes.login()).
    pin_hash = db.Column(db.String(255))
    # Geofencing fields: current location and registered/home location
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    registered_lat = db.Column(db.Float)
    registered_lng = db.Column(db.Float)
    zone_radius_m = db.Column(db.Integer, nullable=False, default=200)
    documents = db.relationship('Document', back_populates='customer', cascade='all, delete-orphan', order_by='Document.uploaded_at')
    group = db.relationship('LendingGroup', back_populates='members')


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
    disbursed_by_user_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    disbursed_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    loan = db.relationship('Loan', back_populates='disbursements')


class RepaymentScheduleItem(db.Model):
    __tablename__ = 'repayment_schedule_items'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    installment = db.Column(db.Integer, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    original_due_date = db.Column(db.Date)
    amount_due = db.Column(db.Numeric(12, 2), nullable=False)
    amount_paid = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status = db.Column(db.String(16), nullable=False, default='PENDING')
    rescheduled_count = db.Column(db.Integer, nullable=False, default=0)
    reschedule_reason = db.Column(db.Text)
    last_reminder_sent_at = db.Column(db.DateTime(timezone=True))

    loan = db.relationship('Loan', back_populates='repayment_schedule')


class Repayment(db.Model):
    __tablename__ = 'repayments'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    method = db.Column(db.String(32), nullable=False)
    reference = db.Column(db.String(100))
    recorded_by_user_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    paid_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    loan = db.relationship('Loan', back_populates='repayments')


class GeofenceAlert(db.Model):
    __tablename__ = 'geofence_alerts'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    type = db.Column(db.String(32), nullable=False)  # 'agent_checkin' | 'customer_zone_drift'
    customer_id = db.Column(db.String(36), db.ForeignKey('customers.id'), nullable=False, index=True)
    agent_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True, index=True)
    distance_m = db.Column(db.Float)
    status = db.Column(db.String(16), nullable=False, default='open')  # 'open' | 'resolved'
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    customer = db.relationship('Customer', backref='geofence_alerts')
    agent = db.relationship('User')


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


class AirtelMoneyRequest(db.Model):
    """Mirrors MpesaStkRequest's shape for Airtel Money's Open API collection flow."""
    __tablename__ = 'airtel_money_requests'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    phone_number = db.Column(db.String(16), nullable=False)
    transaction_id = db.Column(db.String(100), nullable=False, unique=True)
    airtel_money_id = db.Column(db.String(100))
    status = db.Column(db.String(16), nullable=False, default='PENDING', index=True)
    status_message = db.Column(db.Text)
    callback_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    loan = db.relationship('Loan', back_populates='airtel_requests')


class StripePaymentIntent(db.Model):
    __tablename__ = 'stripe_payment_intents'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(8), nullable=False, default='usd')
    payment_intent_id = db.Column(db.String(100), nullable=False, unique=True)
    client_secret = db.Column(db.String(200))
    status = db.Column(db.String(24), nullable=False, default='requires_payment_method', index=True)
    event_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    loan = db.relationship('Loan', back_populates='stripe_intents')


class PaymentReminder(db.Model):
    """A log of every reminder attempt, whatever the channel, so we never double-send
    and lenders can audit what a customer was actually told."""
    __tablename__ = 'payment_reminders'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    schedule_item_id = db.Column(db.String(36), db.ForeignKey('repayment_schedule_items.id'))
    channel = db.Column(db.String(16), nullable=False)  # SMS, WHATSAPP
    language = db.Column(db.String(8), nullable=False, default='en')
    recipient_phone = db.Column(db.String(16), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(16), nullable=False, default='SENT')  # SENT, FAILED
    provider_response = db.Column(db.JSON)
    sent_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    loan = db.relationship('Loan', back_populates='reminders')


class WhatsAppMessage(db.Model):
    """An ad-hoc WhatsApp message sent to a customer from the Communication Center
    (as opposed to PaymentReminder, which is scoped to an automated installment
    reminder for a specific loan/schedule item)."""
    __tablename__ = 'whatsapp_messages'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    customer_id = db.Column(db.String(36), db.ForeignKey('customers.id'), nullable=False, index=True)
    phone_number = db.Column(db.String(16), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(16), nullable=False, default='SENT')  # SENT, FAILED
    provider_response = db.Column(db.JSON)
    sent_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    customer = db.relationship('Customer')


class RiskAlert(db.Model):
    """Automated alerts raised by app.risk for overdue payments and high-risk accounts."""
    __tablename__ = 'risk_alerts'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    customer_id = db.Column(db.String(36), db.ForeignKey('customers.id'), index=True)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), index=True)
    alert_type = db.Column(db.String(32), nullable=False)  # OVERDUE, HIGH_RISK_SCORE, MULTIPLE_MISSED
    severity = db.Column(db.String(16), nullable=False, default='MEDIUM')  # LOW, MEDIUM, HIGH
    message = db.Column(db.Text, nullable=False)
    is_resolved = db.Column(db.Boolean, nullable=False, default=False)
    resolved_by = db.Column(db.String(100))
    resolved_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)

    customer = db.relationship('Customer')
    loan = db.relationship('Loan')


class CollectionTarget(db.Model):
    """A lender-set collection goal for a period (daily/weekly/monthly), compared
    against actual repayments received in that window to compute achievement %."""
    __tablename__ = 'collection_targets'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    period = db.Column(db.String(16), nullable=False)  # daily, weekly, monthly
    period_start = db.Column(db.Date, nullable=False, index=True)
    period_end = db.Column(db.Date, nullable=False)
    target_amount = db.Column(db.Numeric(14, 2), nullable=False)
    market = db.Column(db.String(160))
    set_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


class LendingGroup(db.Model):
    """A women's group / chama for group lending with shared liability."""
    __tablename__ = 'lending_groups'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    name = db.Column(db.String(160), nullable=False, unique=True)
    market = db.Column(db.String(160))
    shared_liability = db.Column(db.Boolean, nullable=False, default=True)
    notes = db.Column(db.Text)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    members = db.relationship('Customer', back_populates='group')
    loans = db.relationship('Loan', back_populates='group')


class InventoryFinancingItem(db.Model):
    """Stock/inventory items purchased using an inventory-financing loan, so lenders
    can track what a loan was actually spent on rather than just its cash purpose."""
    __tablename__ = 'inventory_financing_items'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    loan_id = db.Column(db.String(36), db.ForeignKey('loans.id'), nullable=False, index=True)
    item_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Numeric(12, 2), nullable=False, default=1)
    unit_cost = db.Column(db.Numeric(12, 2), nullable=False)
    supplier = db.Column(db.String(160))
    purchased_at = db.Column(db.Date)
    sold_units = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    loan = db.relationship('Loan', back_populates='inventory_items')


class ExternalLookup(db.Model):
    """A generic log of calls to third-party lookup services that require a
    commercial agreement Anthropic/Claude cannot sign on your behalf - Kenya's
    Credit Reference Bureaus (Metropol/TransUnion/CreditInfo) and business
    registration systems (eCitizen/BRS). See app/crb.py and app/business_registry.py:
    both are wired end-to-end and will work the moment real credentials are supplied.
    """
    __tablename__ = 'external_lookups'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    provider = db.Column(db.String(32), nullable=False)  # CRB, BUSINESS_REGISTRY
    customer_id = db.Column(db.String(36), db.ForeignKey('customers.id'), index=True)
    status = db.Column(db.String(16), nullable=False)  # SUCCESS, FAILED, NOT_CONFIGURED
    request_reference = db.Column(db.String(100))
    result_summary = db.Column(db.JSON)
    requested_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


class AuditLog(db.Model):
    """Immutable log of who did what, when. Written via app.audit.log_action() -
    never updated or deleted through the API, satisfying the 'all transactions must
    be logged with timestamps and user authentication' requirement."""
    __tablename__ = 'audit_logs'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), index=True)
    user_email = db.Column(db.String(255))
    action = db.Column(db.String(64), nullable=False, index=True)
    entity_type = db.Column(db.String(32), nullable=False, index=True)
    entity_id = db.Column(db.String(36), index=True)
    details = db.Column(db.JSON)
    ip_address = db.Column(db.String(64))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)
