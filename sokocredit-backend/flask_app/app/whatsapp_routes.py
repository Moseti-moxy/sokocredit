"""Ad-hoc WhatsApp messaging from the Communication Center - a staff member
sending a customer a one-off message, as opposed to the automated installment
reminders in app/reminders_routes.py (which log to PaymentReminder instead).
"""
from .audit import log_action
from .extensions import db
from .models import Customer, WhatsAppMessage
from .notifications import NotificationConfigurationError, NotificationError, send_whatsapp
from .security import role_required
from flask import Blueprint, jsonify, request

whatsapp = Blueprint('whatsapp', __name__, url_prefix='/api/whatsapp')


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


def serialize_message(msg):
    return {
        'id': msg.id, 'customerId': msg.customer_id, 'phoneNumber': msg.phone_number,
        'message': msg.message, 'status': msg.status, 'sentAt': msg.sent_at.isoformat(),
    }


@whatsapp.post('/send')
@role_required('admin', 'lender', 'agent')
def send():
    """
    Send a WhatsApp message to a customer
    ---
    tags: [Communications]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [customerId, message]
          properties:
            customerId: {type: string}
            message: {type: string}
    responses:
      201: {description: Message sent (or attempted)}
      400: {description: Validation error}
      404: {description: Customer not found}
      502: {description: WhatsApp provider error}
      503: {description: WhatsApp not configured}
    """
    values = body()
    customer_id = values.get('customerId')
    message_text = str(values.get('message', '')).strip()
    customer = db.session.get(Customer, customer_id) if customer_id else None
    if not customer:
        return error('Customer not found.', 404)
    if not message_text:
        return error('message is required.')

    status, provider_response = 'SENT', None
    try:
        provider_response = send_whatsapp(customer.phone_number, message_text)
    except NotificationConfigurationError as exc:
        db.session.add(WhatsAppMessage(
            customer_id=customer.id, phone_number=customer.phone_number, message=message_text,
            status='FAILED', provider_response={'error': str(exc)},
        ))
        db.session.commit()
        return error(str(exc), 503)
    except NotificationError as exc:
        status, provider_response = 'FAILED', {'error': str(exc)}

    record = WhatsAppMessage(
        customer_id=customer.id, phone_number=customer.phone_number, message=message_text,
        status=status, provider_response=provider_response,
    )
    db.session.add(record)
    log_action('WHATSAPP_SEND', 'Customer', customer.id, {'status': status})
    db.session.commit()
    if status == 'FAILED':
        return error('The WhatsApp provider rejected the message.', 502)
    return jsonify(message=serialize_message(record)), 201


@whatsapp.get('/history/<customer_id>')
@role_required('admin', 'lender', 'agent')
def history(customer_id):
    """
    List WhatsApp messages sent to a customer
    ---
    tags: [Communications]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: customer_id
        type: string
        required: true
    responses:
      200: {description: Array of messages, newest first}
      404: {description: Customer not found}
    """
    customer = db.session.get(Customer, customer_id)
    if not customer:
        return error('Customer not found.', 404)
    messages = (
        WhatsAppMessage.query.filter_by(customer_id=customer_id)
        .order_by(WhatsAppMessage.sent_at.desc()).all()
    )
    return jsonify(messages=[serialize_message(m) for m in messages])
