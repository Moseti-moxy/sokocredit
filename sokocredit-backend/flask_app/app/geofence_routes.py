from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from .extensions import db
from .models import Customer, GeofenceAlert, User
from .geofence import calculate_distance
from .audit import log_action

geofence = Blueprint('geofence', __name__, url_prefix='/api')


def error(message, status=400):
    return jsonify(error=message), status


@geofence.post('/visits/checkin')
@jwt_required()
def checkin():
    values = request.get_json(silent=True) or {}
    customer_id = values.get('customer_id')
    try:
        agent_lat = float(values.get('agent_lat'))
        agent_lng = float(values.get('agent_lng'))
    except (TypeError, ValueError):
        return error('Invalid coordinates', 400)
    visit_type = values.get('visit_type')
    if not customer_id:
        return error('customer_id is required', 400)
    customer = db.session.get(Customer, customer_id)
    if not customer:
        return error('Customer not found', 404)
    # If customer has registered zone, check distance
    if customer.registered_lat is not None and customer.registered_lng is not None:
        dist = calculate_distance(customer.registered_lat, customer.registered_lng, agent_lat, agent_lng)
        if dist is None:
            return error('Invalid coordinates', 400)
        if dist > (customer.zone_radius_m or 200):
            alert = GeofenceAlert(type='agent_checkin', customer_id=customer.id, agent_id=get_jwt_identity(), distance_m=dist, status='open')
            db.session.add(alert)
            db.session.commit()
            return error('Agent is outside customer zone', 403)
    # Log visit - use audit
    log_action('AGENT_CHECKIN', 'Visit', customer.id)
    db.session.commit()
    return jsonify(message='Check-in recorded')


@geofence.post('/customers/<id>/location')
@jwt_required()
def update_customer_location(id):
    values = request.get_json(silent=True) or {}
    try:
        lat = float(values.get('latitude'))
        lng = float(values.get('longitude'))
    except (TypeError, ValueError):
        return error('Invalid coordinates', 400)
    customer = db.session.get(Customer, id)
    if not customer:
        return error('Customer not found', 404)
    customer.latitude = lat
    customer.longitude = lng
    # Compare with registered location
    if customer.registered_lat is not None and customer.registered_lng is not None:
        dist = calculate_distance(customer.registered_lat, customer.registered_lng, lat, lng)
        if dist is not None and dist > (customer.zone_radius_m or 200):
            alert = GeofenceAlert(type='customer_zone_drift', customer_id=customer.id, agent_id=None, distance_m=dist, status='open')
            db.session.add(alert)
    db.session.commit()
    return jsonify(message='Location updated')


@geofence.get('/geofence-alerts')
@jwt_required()
def list_alerts():
    status = request.args.get('status')
    atype = request.args.get('type')
    customer_id = request.args.get('customer_id')
    page = int(request.args.get('page', 1))
    per_page = min(100, int(request.args.get('per_page', 20)))
    q = GeofenceAlert.query
    if status: q = q.filter_by(status=status)
    if atype: q = q.filter_by(type=atype)
    if customer_id: q = q.filter_by(customer_id=customer_id)
    items = q.order_by(GeofenceAlert.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    results = []
    for a in items.items:
        results.append({
            'id': a.id,
            'type': a.type,
            'customerId': a.customer_id,
            'agentId': a.agent_id,
            'distanceM': a.distance_m,
            'status': a.status,
            'createdAt': a.created_at.isoformat(),
        })
    return jsonify(items=results, total=items.total, page=page, perPage=per_page)


@geofence.get('/geofence-alerts/<id>')
@jwt_required()
def get_alert(id):
    a = db.session.get(GeofenceAlert, id)
    if not a:
        return error('Not found', 404)
    return jsonify({
        'id': a.id,
        'type': a.type,
        'customerId': a.customer_id,
        'agentId': a.agent_id,
        'distanceM': a.distance_m,
        'status': a.status,
        'createdAt': a.created_at.isoformat(),
    })


@geofence.patch('/geofence-alerts/<id>')
@jwt_required()
def patch_alert(id):
    a = db.session.get(GeofenceAlert, id)
    if not a:
        return error('Not found', 404)
    values = request.get_json(silent=True) or {}
    status = values.get('status')
    if status and status in ('open', 'resolved'):
        a.status = status
        db.session.commit()
    return jsonify(message='Updated')


@geofence.get('/customers/<id>/zone')
@jwt_required()
def get_customer_zone(id):
    c = db.session.get(Customer, id)
    if not c:
        return error('Customer not found', 404)
    return jsonify({ 'customerId': c.id, 'zoneRadiusM': c.zone_radius_m })


@geofence.patch('/customers/<id>/zone')
@jwt_required()
def update_customer_zone(id):
    c = db.session.get(Customer, id)
    if not c:
        return error('Customer not found', 404)
    values = request.get_json(silent=True) or {}
    try:
        radius = int(values.get('zoneRadiusM'))
    except (TypeError, ValueError):
        return error('Invalid radius', 400)
    c.zone_radius_m = radius
    db.session.commit()
    return jsonify(message='Zone updated')
