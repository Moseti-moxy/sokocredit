from decimal import Decimal

from extensions import db
from models.payment import Payment, PaymentStatus


class PaymentService:
    @staticmethod
    def record_payment(loan, amount, method, reference_code=None):
        amount = Decimal(str(amount))
        if amount <= 0:
            raise ValueError("Payment amount must be greater than zero.")

        allocated_interest = min(Decimal(str(getattr(loan, "pending_interest", 0) or 0)), amount)
        remaining_after_interest = amount - allocated_interest
        allocated_principal = min(Decimal(str(getattr(loan, "balance", 0) or 0)), remaining_after_interest)

        loan.pending_interest = Decimal(str(getattr(loan, "pending_interest", 0) or 0)) - allocated_interest
        loan.balance = Decimal(str(getattr(loan, "balance", 0) or 0)) - allocated_principal

        if getattr(loan, "balance", 0) <= 0 and getattr(loan, "pending_interest", 0) <= 0:
            loan.status = "PAID_OFF"
            loan.balance = Decimal("0.0")
            loan.pending_interest = Decimal("0.0")
        elif getattr(loan, "status", None) == "OVERDUE" and getattr(loan, "balance", 0) > 0:
            loan.status = "ACTIVE"

        payment = Payment(
            loan_id=loan.id,
            amount=amount,
            method=method,
            reference_code=reference_code,
            status=PaymentStatus.COMPLETED.value,
            allocated_to_principal=allocated_principal,
            allocated_to_interest=allocated_interest,
        )

        db.session.add(payment)
        db.session.commit()
        return payment

    @staticmethod
    def reschedule_loan(loan, new_duration_days, new_interest_rate=None):
        if getattr(loan, "status", None) not in ["ACTIVE", "OVERDUE"]:
            raise ValueError("Only active or overdue loans can be rescheduled.")

        if new_interest_rate is not None:
            loan.interest_rate = Decimal(str(new_interest_rate))

        loan.duration_days = new_duration_days
        loan.status = "RESCHEDULED"

        additional_interest = (Decimal(str(getattr(loan, "balance", 0) or 0)) * Decimal(str(getattr(loan, "interest_rate", 0) or 0))) / Decimal("100")
        loan.pending_interest = Decimal(str(getattr(loan, "pending_interest", 0) or 0)) + additional_interest

        db.session.commit()
        return loan
