from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, jsonify, request

from .audit import log_action
from .extensions import db
from .i18n import current_lang
from .models import Customer, Loan, PaymentReminder, RepaymentScheduleItem
from .notifications import NotificationConfigurationError, NotificationError, build_reminder_message, send_sms, send_whatsapp
from .security import role_required

reminders = Blueprint('reminders', __name__, url_prefix='/api/reminders')

DEFAULT_LOOKAHEAD_DAYS = 3
MIN_HOURS_BETWEEN_REMINDERS = 20


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


def serialize_reminder(reminder):
    return {
        'id': reminder.id, 'loanId': reminder.loan_id, 'scheduleItemId': reminder.schedule_item_id,
        'channel': reminder.channel, 'language': reminder.language, 'recipientPhone': reminder.recipient_phone,
        'message': reminder.message, 'status': reminder.status, 'sentAt': reminder.sent_at.isoformat(),
    }


def _due_soon_and_overdue_items(lookahead_days):
    today = date.today()
    horizon = today + timedelta(days=lookahead_days)
    items = (
        RepaymentScheduleItem.query
        .join(Loan, RepaymentScheduleItem.loan_id == Loan.id)
        .filter(Loan.status == 'ACTIVE', RepaymentScheduleItem.status != 'PAID', RepaymentScheduleItem.due_date <= horizon)
        .all()
    )
    return [item for item in items if item.amount_paid < item.amount_due]


def _should_send(item):
    if not item.last_reminder_sent_at:
        return True
    elapsed = datetime.now(timezone.utc) - item.last_reminder_sent_at
    return elapsed >= timedelta(hours=MIN_HOURS_BETWEEN_REMINDERS)


def _send_one(item, *, channel, lang):
    loan = item.loan
    customer = db.session.get(Customer, loan.customer_id)
    if not customer:
        return None
    overdue = item.due_date < date.today()
    message = build_reminder_message(
        customer_name=customer.full_name, amount=float(item.amount_due - item.amount_paid),
        due_date=item.due_date, loan_ref=loan.id, overdue=overdue, lang=lang,
    )
    status, provider_response = 'SENT', None
    try:
        provider_response = send_sms(customer.phone_number, message) if channel == 'SMS' else send_whatsapp(customer.phone_number, message)
    except (NotificationConfigurationError, NotificationError) as exc:
        status, provider_response = 'FAILED', {'error': str(exc)}
    reminder = PaymentReminder(
        loan_id=loan.id, schedule_item_id=item.id, channel=channel, language=lang,
        recipient_phone=customer.phone_number, message=message, status=status, provider_response=provider_response,
    )
    db.session.add(reminder)
    if status == 'SENT':
        item.last_reminder_sent_at = datetime.now(timezone.utc)
    return reminder


@reminders.post('/run')
@role_required('admin', 'lender')
def run_reminders():
    """
    Send automated reminders for installments due soon or overdue
    Meant to be called by a scheduler (cron / APScheduler) as well as on demand.
    Skips any installment reminded within the last 20 hours to avoid spamming.
    ---
    tags: [Reminders]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            channel: {type: string, enum: [SMS, WHATSAPP], default: SMS}
            lookaheadDays: {type: integer, default: 3}
            language: {type: string, enum: [en, sw]}
    responses:
      200: {description: Count of reminders sent/failed}
    """
    values = body()
    channel = values.get('channel', 'SMS').upper()
    if channel not in {'SMS', 'WHATSAPP'}:
        return error('channel must be SMS or WHATSAPP.')
    lookahead_days = int(values.get('lookaheadDays', DEFAULT_LOOKAHEAD_DAYS))
    lang = values.get('language', current_lang())

    items = [item for item in _due_soon_and_overdue_items(lookahead_days) if _should_send(item)]
    results = [_send_one(item, channel=channel, lang=lang) for item in items]
    results = [r for r in results if r]
    log_action('RUN_REMINDERS', 'PaymentReminder', details={'channel': channel, 'count': len(results)})
    db.session.commit()
    sent = sum(1 for r in results if r.status == 'SENT')
    failed = sum(1 for r in results if r.status == 'FAILED')
    return jsonify(evaluated=len(items), sent=sent, failed=failed, reminders=[serialize_reminder(r) for r in results])


@reminders.post('/loans/<loan_id>/send')
@role_required('admin', 'lender', 'agent')
def send_for_loan(loan_id):
    """
    Manually trigger a reminder for a specific loan's next unpaid installment
    ---
    tags: [Reminders]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            channel: {type: string, enum: [SMS, WHATSAPP], default: SMS}
            language: {type: string, enum: [en, sw]}
    responses:
      201: {description: Reminder sent (or attempted)}
      404: {description: Loan not found or has no outstanding installment}
    """
    loan = db.session.get(Loan, loan_id)
    if not loan:
        return error('Loan not found.', 404)
    values = body()
    channel = values.get('channel', 'SMS').upper()
    if channel not in {'SMS', 'WHATSAPP'}:
        return error('channel must be SMS or WHATSAPP.')
    next_item = next((i for i in loan.repayment_schedule if i.amount_paid < i.amount_due), None)
    if not next_item:
        return error('This loan has no outstanding installment to remind about.', 404)
    reminder = _send_one(next_item, channel=channel, lang=values.get('language', current_lang()))
    log_action('SEND_REMINDER', 'Loan', loan.id, {'channel': channel})
    db.session.commit()
    return jsonify(reminder=serialize_reminder(reminder)), 201


@reminders.get('/loans/<loan_id>')
@role_required('admin', 'lender', 'agent')
def reminder_history(loan_id):
    """
    List reminders sent for a loan
    ---
    tags: [Reminders]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: loan_id
        type: string
        required: true
    responses:
      200: {description: Array of reminders}
    """
    loan = db.session.get(Loan, loan_id)
    if not loan:
        return error('Loan not found.', 404)
    return jsonify(reminders=[serialize_reminder(r) for r in loan.reminders])
