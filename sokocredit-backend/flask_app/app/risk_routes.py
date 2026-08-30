from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from .audit import log_action
from .extensions import db
from .models import RiskAlert
from .risk import scan_for_risk_alerts, suggest_renewals
from .security import role_required

risk = Blueprint('risk', __name__, url_prefix='/api/risk')


def error(message, status=400):
    return jsonify(error=message), status


def serialize_alert(alert):
    return {
        'id': alert.id, 'customerId': alert.customer_id, 'loanId': alert.loan_id,
        'alertType': alert.alert_type, 'severity': alert.severity, 'message': alert.message,
        'isResolved': alert.is_resolved, 'resolvedBy': alert.resolved_by,
        'resolvedAt': alert.resolved_at.isoformat() if alert.resolved_at else None,
        'createdAt': alert.created_at.isoformat(),
    }


@risk.post('/scan')
@role_required('admin', 'lender')
def run_scan():
    """
    Scan active loans and customers for overdue payments / high-risk scores
    Idempotent - safe to call from a cron job as often as you like; it only creates
    an alert if there isn't already an unresolved one of the same kind.
    ---
    tags: [Risk]
    security: [{Bearer: []}]
    responses:
      200: {description: Number and list of newly created alerts}
    """
    created = scan_for_risk_alerts()
    db.session.commit()
    return jsonify(created=len(created), alerts=[serialize_alert(a) for a in created])


@risk.get('/alerts')
@role_required('admin', 'lender', 'agent')
def list_alerts():
    """
    List risk alerts
    ---
    tags: [Risk]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: resolved
        type: boolean
        required: false
      - in: query
        name: severity
        type: string
        required: false
    responses:
      200: {description: Array of alerts}
    """
    query = RiskAlert.query.order_by(RiskAlert.created_at.desc())
    if 'resolved' in request.args:
        query = query.filter_by(is_resolved=request.args.get('resolved').lower() == 'true')
    if severity := request.args.get('severity'):
        query = query.filter_by(severity=severity.upper())
    return jsonify(alerts=[serialize_alert(a) for a in query.all()])


@risk.patch('/alerts/<alert_id>/resolve')
@role_required('admin', 'lender')
def resolve_alert(alert_id):
    """
    Mark a risk alert resolved
    ---
    tags: [Risk]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: alert_id
        type: string
        required: true
    responses:
      200: {description: Resolved alert}
      404: {description: Alert not found}
    """
    from datetime import datetime, timezone

    alert = db.session.get(RiskAlert, alert_id)
    if not alert:
        return error('Alert not found.', 404)
    alert.is_resolved = True
    alert.resolved_by = get_jwt_identity()
    alert.resolved_at = datetime.now(timezone.utc)
    log_action('RESOLVE_RISK_ALERT', 'RiskAlert', alert.id)
    db.session.commit()
    return jsonify(alert=serialize_alert(alert))


@risk.get('/renewal-suggestions')
@role_required('admin', 'lender', 'agent')
def renewal_suggestions():
    """
    Customers whose repayment history supports offering a loan renewal
    ---
    tags: [Risk]
    security: [{Bearer: []}]
    responses:
      200: {description: Array of renewal suggestions}
    """
    return jsonify(suggestions=suggest_renewals())
