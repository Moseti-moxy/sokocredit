"""Persisted in-app notifications for both staff (role-broadcast, e.g. "a
customer requested a loan") and customers (targeted, e.g. "your loan was
disbursed" / "your payment is overdue"). create_notification()/notify_roles()
follow the same pattern as app.audit.log_action(): they add a row to the
current session without committing, so a notification can never exist for an
action that didn't happen (or vice versa) - the caller's own commit persists
both together.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from .extensions import db
from .models import Notification

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api')


def error(message, status=400):
    return jsonify(error=message), status


def create_notification(*, audience_role=None, customer_id=None, type, title, message,
                         related_entity_type=None, related_entity_id=None):
    """Queue one Notification row. Exactly one of audience_role/customer_id should
    be set by the caller. Does not commit - see module docstring."""
    entry = Notification(
        audience_role=audience_role, customer_id=customer_id, type=type, title=title,
        message=message, related_entity_type=related_entity_type,
        related_entity_id=related_entity_id, read_by=[],
    )
    db.session.add(entry)
    return entry


def notify_roles(roles, **kwargs):
    """Broadcast the same notification to each of several staff roles at once
    (e.g. both admin and lender, who can both approve a loan)."""
    return [create_notification(audience_role=role, **kwargs) for role in roles]


def _current_identity():
    """Returns ('customer', customer_id) or ('staff', role) for whichever kind
    of token is present - notifications are the one place both a staff and a
    customer token need to hit the same endpoint, so neither role_required()
    nor customer_required() alone fits."""
    verify_jwt_in_request()
    claims = get_jwt()
    if claims.get('type') == 'customer':
        return 'customer', get_jwt_identity()
    return 'staff', claims.get('role')


def _visible_query():
    kind, value = _current_identity()
    if kind == 'customer':
        return Notification.query.filter_by(customer_id=value)
    return Notification.query.filter_by(audience_role=value)


def serialize_notification(notification, reader_key):
    return {
        'id': notification.id,
        'type': notification.type,
        'title': notification.title,
        'message': notification.message,
        'relatedEntityType': notification.related_entity_type,
        'relatedEntityId': notification.related_entity_id,
        'isRead': reader_key in (notification.read_by or []),
        'createdAt': notification.created_at.isoformat(),
    }


@notifications_bp.get('/notifications')
def list_notifications():
    """
    List notifications visible to the current staff role or logged-in customer
    ---
    tags: [Notifications]
    security: [{Bearer: []}]
    responses:
      200: {description: Array of notifications, newest first}
    """
    kind, value = _current_identity()
    rows = _visible_query().order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify(notifications=[serialize_notification(n, value) for n in rows])


@notifications_bp.patch('/notifications/<notification_id>/read')
def mark_read(notification_id):
    """
    Mark one notification as read by the current staff role or customer
    ---
    tags: [Notifications]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: notification_id
        type: string
        required: true
    responses:
      200: {description: Marked read}
      404: {description: Notification not found}
    """
    kind, value = _current_identity()
    notification = _visible_query().filter_by(id=notification_id).first()
    if not notification:
        return error('Notification not found.', 404)
    if value not in (notification.read_by or []):
        notification.read_by = [*(notification.read_by or []), value]
        db.session.commit()
    return jsonify(notification=serialize_notification(notification, value))


@notifications_bp.post('/notifications/read-all')
def mark_all_read():
    """
    Mark every notification currently visible to the caller as read
    ---
    tags: [Notifications]
    security: [{Bearer: []}]
    responses:
      200: {description: Number of notifications marked read}
    """
    kind, value = _current_identity()
    rows = _visible_query().all()
    updated = 0
    for notification in rows:
        if value not in (notification.read_by or []):
            notification.read_by = [*(notification.read_by or []), value]
            updated += 1
    if updated:
        db.session.commit()
    return jsonify(updated=updated)
