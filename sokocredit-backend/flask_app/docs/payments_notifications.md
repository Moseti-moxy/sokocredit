# Payments, Notifications & Analytics — Overview

This document describes the payments, notifications, scheduler and analytics features in the Flask app.

Key endpoints (under `/api`):

- `POST /loans` — create loan application.
- `POST /loans/<loan_id>/approve` — approve application.
- `POST /loans/<loan_id>/disburse` — disburse and create repayment schedule.
- `GET /loans/<loan_id>/repayment-schedule` — view schedule and outstanding balance.
- `POST /loans/<loan_id>/repayments` — record repayments.
  - If `customerPhone` or `provider` is supplied the request creates a `Payment` record and allows partial allocations and overpayment metadata.
  - Otherwise the simple allocation flow consumes schedule installments strictly and returns 201.
- `POST /loans/<loan_id>/mpesa/stk-push` — start Safaricom M-PESA STK push (Daraja).
- `POST /mpesa/stk-callback` — webhook to receive Daraja callback and confirm repayments.
- `GET /loans/<loan_id>/payments/<payment_id>/receipt` — generate a PDF receipt (uses ReportLab if installed).
- `GET /analytics/portfolio` — simple portfolio metrics (total loans, active loans, outstanding, defaultRate).

Notifications and scheduler
- `tasks/scheduler_service.py` implements a simple script that finds overdue schedule items and calls `app.services.notification_service.notify_overdue`.
- `app/services/notification_service.py` supports sending via Twilio or Africa's Talking (prefers Africa's Talking when configured). The CLI `send-overdue-reminders` calls the same scheduler-invoking function.

Extensibility notes
- Add adapters for additional providers (Stripe, Airtel) in `app/services` and wire webhook endpoints to allocate repayments.
- For production scheduling consider Celery/RQ or cron to run `find_overdue_and_notify` periodically.

Testing
- The `tests/` folder contains unit and integration tests for repayments, M-PESA flows, scheduler and mobile money adapters.
- To run tests from repo root (recommended):

```bash
cd sokocredit-backend/flask_app
pytest -q
```

If you want me to open a PR with these docs + tests, I can add a short changelog and CI config next.
