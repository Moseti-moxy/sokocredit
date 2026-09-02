"""Customer self-service portal authentication - a Customer record's own login,
separate from staff (User) accounts in app/auth_routes.py.

Login accepts email OR national ID as the identifier (matching the frontend's
Login.jsx), plus a short PIN as the password. Field names in request bodies
below (`identifier`, `password`) intentionally match what the frontend already
sends, to avoid a second round of frontend changes.

Every issued token carries additional_claims={'type': 'customer', 'customerId': ...}
and NO 'role' claim - this is what lets app.security.customer_required() and
role_required() cleanly reject each other's tokens (see security.py docstrings).
"""
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from .audit import log_action
from .extensions import db, limiter
from .models import Customer
from .mpesa import MpesaError, normalize_phone_number
from .security import blind_index, customer_required, hash_password, verify_password

customer_auth = Blueprint('customer_auth', __name__, url_prefix='/api/customer-auth')


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


def coordinate(value, *, minimum, maximum):
    try:
        result = float(value)
    except (TypeError, ValueError):
        raise ValueError('Invalid coordinates.')
    if not minimum <= result <= maximum:
        raise ValueError('Invalid coordinates.')
    return result


def serialize_customer_account(customer):
    return {
        'id': customer.id, 'fullName': customer.full_name, 'phoneNumber': customer.phone_number,
        'email': customer.email, 'nationalId': customer.national_id, 'market': customer.market,
        'business': customer.business, 'status': customer.status,
    }


def issue_customer_token(customer):
    claims = {'type': 'customer', 'customerId': customer.id}
    return {
        'accessToken': create_access_token(identity=customer.id, additional_claims=claims),
        'refreshToken': create_refresh_token(identity=customer.id, additional_claims=claims),
    }


def find_customer_by_identifier(identifier):
    """identifier can be an email or a national ID - both resolve to the same
    blind-index lookup pattern already used for staff-side duplicate checks."""
    needle_hash = blind_index(identifier)
    return Customer.query.filter(
        db.or_(Customer.email_hash == needle_hash, Customer.national_id_hash == needle_hash)
    ).first()


@customer_auth.post('/register')
@limiter.limit('10/minute')
def register():
    """
    Self-register a customer account (light-touch - full KYC comes later from staff)
    ---
    tags: [Customer Portal]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [fullName, phoneNumber, nationalId, password]
          properties:
            fullName: {type: string, example: Jane Wanjiru}
            phoneNumber: {type: string, example: '0712345678'}
            nationalId: {type: string, example: '29874561'}
            email: {type: string}
            password: {type: string, example: '1234', description: A short PIN, at least 4 digits/characters}
    responses:
      201: {description: Account created, returns customer object plus accessToken and refreshToken}
      400: {description: Validation error}
      409: {description: An account with this phone, national ID, or email already exists}
    """
    values = body()
    full_name = str(values.get('fullName', '')).strip()
    national_id = str(values.get('nationalId', '')).strip()
    pin = values.get('password', '')
    email = str(values.get('email') or '').strip() or None
    if not full_name or not national_id:
        return error('fullName and nationalId are required.')
    if not isinstance(pin, str) or len(pin) < 4:
        return error('password (PIN) must be at least 4 characters.')
    try:
        phone = normalize_phone_number(values.get('phoneNumber'))
        has_latitude = values.get('latitude') is not None
        has_longitude = values.get('longitude') is not None
        if has_latitude != has_longitude:
            return error('Latitude and longitude must be provided together.')
        latitude = coordinate(values['latitude'], minimum=-90, maximum=90) if has_latitude else None
        longitude = coordinate(values['longitude'], minimum=-180, maximum=180) if has_longitude else None
    except MpesaError as exc:
        return error(str(exc))
    except ValueError:
        return error('Latitude or longitude is invalid.')

    if Customer.query.filter(
        db.or_(
            Customer.phone_number_hash == blind_index(phone),
            Customer.national_id_hash == blind_index(national_id),
            *([Customer.email_hash == blind_index(email)] if email else []),
        )
    ).first():
        return error('An account with this phone, national ID, or email already exists.', 409)

    # Full KYC fields (business, market, stall, turnover) are unknown at
    # self-signup time - placeholders here, filled in properly by an agent
    # during onboarding, same as the rest of the Customer model's optional fields.
    customer = Customer(
        full_name=full_name, phone_number=phone, phone_number_hash=blind_index(phone),
        national_id=national_id, national_id_hash=blind_index(national_id),
        email=email, email_hash=blind_index(email) if email else None,
        business_name='Not yet provided', market='Not yet provided', stall_number='Not yet provided',
        years_in_business=0, daily_turnover=0, registered_by='SELF', pin_hash=hash_password(pin),
        latitude=latitude, longitude=longitude,
        registered_lat=latitude, registered_lng=longitude,
    )
    try:
        db.session.add(customer)
        log_action('CUSTOMER_SELF_REGISTER', 'Customer', customer.id)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error('An account with this phone, national ID, or email already exists.', 409)
    return jsonify(customer=serialize_customer_account(customer), **issue_customer_token(customer)), 201


@customer_auth.post('/login')
@limiter.limit('10/minute')
def login():
    """
    Log in as a customer using email or national ID + PIN
    ---
    tags: [Customer Portal]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [identifier, password]
          properties:
            identifier: {type: string, example: '29874561', description: Email or national ID}
            password: {type: string, example: '1234', description: PIN}
    responses:
      200: {description: Returns customer object plus accessToken and refreshToken}
      401: {description: Invalid identifier or PIN}
      403: {description: This account has not been set up for online access}
    """
    values = body()
    identifier = str(values.get('identifier', '')).strip()
    pin = values.get('password', '')
    if not identifier or not isinstance(pin, str):
        return error('identifier and password are required.', 401)
    customer = find_customer_by_identifier(identifier)
    if not customer:
        return error('Invalid identifier or PIN.', 401)
    if not customer.pin_hash:
        return error('This account has not been set up for online access. Ask your agent to help you register.', 403)
    if not verify_password(pin, customer.pin_hash):
        return error('Invalid identifier or PIN.', 401)
    if customer.status != 'ACTIVE':
        return error('This account is not active. Contact support.', 403)
    log_action('CUSTOMER_LOGIN', 'Customer', customer.id)
    db.session.commit()
    return jsonify(customer=serialize_customer_account(customer), **issue_customer_token(customer))


@customer_auth.post('/refresh')
@jwt_required(refresh=True)
def refresh():
    """
    Exchange a refresh token for a new customer access token
    ---
    tags: [Customer Portal]
    security: [{Bearer: []}]
    responses:
      200: {description: Returns a new accessToken}
      401: {description: Refresh token missing, invalid, or account no longer available}
    """
    from flask_jwt_extended import get_jwt

    if get_jwt().get('type') != 'customer':
        return error('Invalid token type for this endpoint.', 401)
    customer = db.session.get(Customer, get_jwt_identity())
    if not customer or customer.status != 'ACTIVE':
        return error('Account no longer available.', 401)
    claims = {'type': 'customer', 'customerId': customer.id}
    return jsonify(accessToken=create_access_token(identity=customer.id, additional_claims=claims))


@customer_auth.get('/me')
@customer_required
def me():
    """
    Get the currently logged-in customer's own profile
    ---
    tags: [Customer Portal]
    security: [{Bearer: []}]
    responses:
      200: {description: The current customer}
      404: {description: Customer not found}
    """
    customer = db.session.get(Customer, get_jwt_identity())
    if not customer:
        return error('Customer not found.', 404)
    return jsonify(customer=serialize_customer_account(customer))


@customer_auth.patch('/me/pin')
@customer_required
def change_own_pin():
    """
    Change your own PIN
    ---
    tags: [Customer Portal]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [currentPin, newPin]
          properties:
            currentPin: {type: string}
            newPin: {type: string, example: '5678'}
    responses:
      200: {description: PIN updated}
      401: {description: Current PIN is incorrect}
      400: {description: New PIN must be at least 4 characters}
    """
    customer = db.session.get(Customer, get_jwt_identity())
    values = body()
    new_pin = values.get('newPin', '')
    if not customer or not customer.pin_hash or not verify_password(values.get('currentPin', ''), customer.pin_hash):
        return error('Current PIN is incorrect.', 401)
    if not isinstance(new_pin, str) or len(new_pin) < 4:
        return error('New PIN must be at least 4 characters.')
    customer.pin_hash = hash_password(new_pin)
    log_action('CUSTOMER_CHANGE_PIN', 'Customer', customer.id)
    db.session.commit()
    return jsonify(message='PIN updated.')
