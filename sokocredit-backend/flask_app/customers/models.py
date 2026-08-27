from app.extensions import db
from app.models import new_id, utcnow
DOCUMENT_TYPES = {'NATIONAL_ID', 'BUSINESS_PERMIT', 'PASSPORT_PHOTO', 'OTHER'}
CUSTOMER_STATUSES = {'ACTIVE', 'INACTIVE', 'BLACKLISTED'}


class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.String(36), primary_key=True, default=new_id)

    # Personal info
    full_name = db.Column(db.String(120), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False, unique=True, index=True)
    national_id = db.Column(db.String(20), unique=True)
    email = db.Column(db.String(120))
    gender = db.Column(db.String(16))
    date_of_birth = db.Column(db.Date)

    # Business details
    business_name = db.Column(db.String(120), nullable=False)
    business_type = db.Column(db.String(64))
    business_registration_number = db.Column(db.String(64))
    years_in_business = db.Column(db.Integer)

    # Location
    market = db.Column(db.String(120), index=True)
    stall_number = db.Column(db.String(32))
    address = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    # Seasonal trading pattern, e.g. {"peakMonths": [11,12], "lowMonths": [3,4], "notes": "..."}
    seasonal_pattern = db.Column(db.JSON, default=dict)

    status = db.Column(db.String(16), nullable=False, default='ACTIVE', index=True)
    registered_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    documents = db.relationship('Document', back_populates='customer', cascade='all, delete-orphan', order_by='Document.uploaded_at')


class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(db.String(36), primary_key=True, default=new_id)
    customer_id = db.Column(db.String(36), db.ForeignKey('customers.id'), nullable=False, index=True)
    document_type = db.Column(db.String(20), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    storage_path = db.Column(db.String(500), nullable=False)
    mime_type = db.Column(db.String(100))
    size_bytes = db.Column(db.Integer)
    uploaded_by = db.Column(db.String(100))
    uploaded_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    customer = db.relationship('Customer', back_populates='documents')
