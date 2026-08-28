"""Simple scheduler to detect overdue repayments and send reminders.

Run with: `python -m tasks.scheduler_service` from the repo root (ensure PYTHONPATH includes flask_app).
"""
from datetime import date
from flask import Flask
import os
import logging

import sys
from pathlib import Path

# ensure flask_app package is importable when running from repo root
ROOT = Path(__file__).resolve().parents[1] / 'sokocredit-backend' / 'flask_app'
sys.path.insert(0, str(ROOT))
from app import create_app  # type: ignore


def setup_app():
    # create app using environment config
    app = create_app()
    return app


def find_overdue_and_notify(app):
    from app.extensions import db
    from app.models import Loan
    from app.services.notification_service import notify_overdue

    with app.app_context():
        today = date.today()
        loans = Loan.query.all()
        for loan in loans:
            for item in loan.repayment_schedule:
                if item.due_date < today and item.amount_paid < item.amount_due:
                    # Try to resolve a phone number from latest payment, if any
                    phone = None
                    last_payment = loan.payments.order_by(db.desc('received_at')).first() if hasattr(loan, 'payments') else None
                    if last_payment:
                        phone = last_payment.customer_phone
                    # fallback to environment-defined admin number
                    if not phone:
                        phone = os.getenv('ADMIN_PHONE')
                    amount_due = float(item.amount_due - item.amount_paid)
                    if phone:
                        res = notify_overdue(loan.id, phone, amount_due)
                        logging.info('Notified %s for loan %s: %s', phone, loan.id, res)
                    else:
                        logging.info('No phone available to notify for loan %s (overdue %s)', loan.id, amount_due)
                    break


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    app = setup_app()
    find_overdue_and_notify(app)
