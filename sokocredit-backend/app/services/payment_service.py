from decimal import Decimal
from datetime import datetime, timezone
from extensions import db
from models.payment import Payment, PaymentStatus


class PaymentService:

    @staticmethod
    def record_payment(loan, amount, method, reference_code=None):
        """
        Handles full & partial payments, updating loan balance and payment allocations.
        """
        amount = Decimal(str(amount))
        
        # 1. Allocate payment (Interest first, then Principal)
        allocated_interest = min(loan.pending_interest, amount)
        remaining_after_interest = amount - allocated_interest
        
        allocated_principal = min(loan.balance, remaining_after_interest)
        
        # 2. Update Loan State
        loan.pending_interest -= allocated_interest
        loan.balance -= allocated_principal
        
        if loan.balance <= 0 and loan.pending_interest <= 0:
            loan.status = "PAID_OFF"
            loan.balance = Decimal("0.0")
            loan.pending_interest = Decimal("0.0")
        elif loan.status == "OVERDUE" and loan.balance > 0:
            loan.status = "ACTIVE"  # Partially restored to active status

        # 3. Create Payment Record
        payment = Payment(
            loan_id=loan.id,
            amount=amount,
            method=method,
            reference_code=reference_code,
            status=PaymentStatus.COMPLETED,
            allocated_to_principal=allocated_principal,
            allocated_to_interest=allocated_interest,
        )

        db.session.add(payment)
        db.session.commit()
        return payment

    @staticmethod
    def reschedule_loan(loan, new_duration_days, new_interest_rate=None):
        """
        Reschedules an active or overdue loan by extending its maturity date and updating schedule.
        """
        if loan.status not in ["ACTIVE", "OVERDUE"]:
            raise ValueError("Only active or overdue loans can be rescheduled.")

        if new_interest_rate:
            loan.interest_rate = Decimal(str(new_interest_rate))
        
        loan.duration_days = new_duration_days
        loan.status = "RESCHEDULED"
        
        # Recalculate remaining interest on outstanding balance
        additional_interest = (loan.balance * loan.interest_rate) / Decimal("100")
        loan.pending_interest += additional_interest

        db.session.commit()
        return loan