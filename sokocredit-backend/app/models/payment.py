import uuid
from datetime import datetime, timezone
from enum import Enum
from extensions import db


class PaymentMethod(str, Enum):
    CASH = "cash"
    MPESA = "mpesa"
    AIRTEL = "airtel"


class PaymentStatus(str, Enum):
    COMPLETED = "completed"
    PENDING = "pending"
    FAILED = "failed"


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    loan_id = db.Column(db.String(36), db.ForeignKey("loans.id"), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    method = db.Column(db.String(20), nullable=False)  # cash, mpesa, airtel, stripe
    reference_code = db.Column(db.String(100), unique=True, nullable=True)  # Gateway Transaction Ref
    status = db.Column(db.String(20), default=PaymentStatus.COMPLETED)
    allocated_to_principal = db.Column(db.Numeric(12, 2), default=0.0)
    allocated_to_interest = db.Column(db.Numeric(12, 2), default=0.0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "loan_id": self.loan_id,
            "amount": float(self.amount),
            "method": self.method,
            "reference_code": self.reference_code,
            "status": self.status,
            "allocated_to_principal": float(self.allocated_to_principal),
            "allocated_to_interest": float(self.allocated_to_interest),
            "created_at": self.created_at.isoformat(),
        }