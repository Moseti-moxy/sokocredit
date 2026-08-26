import uuid
from datetime import datetime, timezone

from extensions import db


class Loan(db.Model):
    __tablename__ = "loans"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = db.Column(db.String(36), nullable=False)
    customer_name = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(32), nullable=True)
    principal_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    balance = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    pending_interest = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    interest_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    duration_days = db.Column(db.Integer, nullable=False, default=30)
    due_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(30), nullable=False, default="ACTIVE")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "customer_name": self.customer_name,
            "phone": self.phone,
            "principal_amount": float(self.principal_amount),
            "balance": float(self.balance),
            "pending_interest": float(self.pending_interest),
            "interest_rate": float(self.interest_rate),
            "duration_days": self.duration_days,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
