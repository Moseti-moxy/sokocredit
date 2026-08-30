from datetime import date, datetime

from flask import Blueprint, jsonify, request

from .extensions import db
from .models import CollectionTarget
from .reports import collection_target_progress, high_risk_customers, performance_report, portfolio_dashboard
from .security import role_required

analytics = Blueprint('analytics', __name__, url_prefix='/api/analytics')


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


@analytics.get('/dashboard')
@role_required('admin', 'lender', 'agent')
def dashboard():
    """
    Loan portfolio dashboard
    ---
    tags: [Analytics]
    security: [{Bearer: []}]
    responses:
      200: {description: Key portfolio metrics}
    """
    return jsonify(portfolio_dashboard())


@analytics.get('/performance-report')
@role_required('admin', 'lender')
def performance():
    """
    Loan performance / default-rate / profitability report for a date range
    ---
    tags: [Analytics]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: startDate
        type: string
        required: false
        description: ISO date, defaults to 30 days ago
      - in: query
        name: endDate
        type: string
        required: false
        description: ISO date, defaults to today
    responses:
      200: {description: Performance metrics for the period}
      400: {description: Invalid date}
    """
    try:
        start = date.fromisoformat(request.args['startDate']) if request.args.get('startDate') else date.today().replace(day=1)
        end = date.fromisoformat(request.args['endDate']) if request.args.get('endDate') else date.today()
    except ValueError:
        return error('startDate and endDate must be valid ISO dates.')
    if start > end:
        return error('startDate must not be after endDate.')
    return jsonify(performance_report(start, end))


@analytics.get('/high-risk-customers')
@role_required('admin', 'lender')
def risky_customers():
    """
    Customers with the lowest credit scores / highest default rates
    ---
    tags: [Analytics]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: limit
        type: integer
        required: false
    responses:
      200: {description: Array of at-risk customers with their credit score details}
    """
    limit = int(request.args.get('limit', 20))
    return jsonify(customers=high_risk_customers(limit))


# ---- Collection targets (requirement #15) -----------------------------------

def serialize_target(target):
    return collection_target_progress(target)


@analytics.post('/collection-targets')
@role_required('admin', 'lender')
def create_target():
    """
    Set a collection target for a period
    ---
    tags: [Analytics]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [period, periodStart, periodEnd, targetAmount]
          properties:
            period: {type: string, enum: [daily, weekly, monthly]}
            periodStart: {type: string, format: date}
            periodEnd: {type: string, format: date}
            targetAmount: {type: number}
            market: {type: string}
    responses:
      201: {description: Target created, includes live achievement progress}
      400: {description: Validation error}
    """
    values = body()
    try:
        period_start = date.fromisoformat(values['periodStart'])
        period_end = date.fromisoformat(values['periodEnd'])
        target_amount = float(values['targetAmount'])
    except (KeyError, ValueError, TypeError):
        return error('period, periodStart, periodEnd, and targetAmount are required and must be valid.')
    if values.get('period') not in {'daily', 'weekly', 'monthly'}:
        return error('period must be daily, weekly, or monthly.')
    if period_start > period_end or target_amount <= 0:
        return error('periodStart must not be after periodEnd, and targetAmount must be positive.')
    target = CollectionTarget(
        period=values['period'], period_start=period_start, period_end=period_end,
        target_amount=target_amount, market=values.get('market'), set_by=values.get('setBy'),
    )
    db.session.add(target)
    db.session.commit()
    return jsonify(target=serialize_target(target)), 201


@analytics.get('/collection-targets')
@role_required('admin', 'lender', 'agent')
def list_targets():
    """
    List collection targets with live achievement progress
    ---
    tags: [Analytics]
    security: [{Bearer: []}]
    responses:
      200: {description: Array of targets with achievement percentages}
    """
    targets = CollectionTarget.query.order_by(CollectionTarget.period_start.desc()).all()
    return jsonify(targets=[serialize_target(target) for target in targets])
