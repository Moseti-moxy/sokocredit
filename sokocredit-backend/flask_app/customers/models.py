from app.extensions import db
from app.models import Customer, new_id, utcnow
DOCUMENT_TYPES = {'NATIONAL_ID', 'BUSINESS_PERMIT', 'PASSPORT_PHOTO', 'OTHER'}
CUSTOMER_STATUSES = {'ACTIVE', 'INACTIVE', 'BLACKLISTED'}


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
