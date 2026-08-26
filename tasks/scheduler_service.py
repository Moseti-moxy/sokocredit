from datetime import datetime, timezone
from extensions import db
from services.notification_service import NotificationService


def check_overdue_loans_and_notify(app):
    with app.app_context():
        now = datetime.now(timezone.utc)
        
        from models.loan import Loan 
        
        overdue_loans = Loan.query.filter(
            Loan.status.in_(["ACTIVE", "RESCHEDULED"]),
            Loan.due_date < now,
            Loan.balance > 0
        ).all()

        for loan in overdue_loans:
            loan.status = "OVERDUE"
            db.session.commit()

            customer = loan.customer
            msg = (
                f"Hello {customer.name}, your loan balance of ${loan.balance:.2f} "
                f"was due on {loan.due_date.strftime('%Y-%m-%d')}. "
                f"Please make a payment to avoid penalties."
            )
            
            NotificationService.send_sms_africas_talking(customer.phone, msg)