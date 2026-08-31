from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from sqlalchemy.exc import IntegrityError

from .extensions import db, limiter
from .models import TokenBlocklist, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def error(message, status=400):
    return jsonify(error=message), status


def body():
    return request.get_json(silent=True) or {}


def serialize_user(user):
    return {
        'id': user.id,
        'email': user.email,
        'fullName': user.full_name,
        'role': user.role,
        'isActive': user.is_active,
        'createdAt': user.created_at.isoformat(),
    }


def user_claims(user):
    return {'role': user.role, 'email': user.email}


def issue_tokens(user):
    return {
        'accessToken': create_access_token(identity=user.id, additional_claims=user_claims(user)),
        'refreshToken': create_refresh_token(identity=user.id, additional_claims=user_claims(user)),
    }


@auth_bp.post('/register')
@limiter.limit('10/minute')
def register():
    """
    Bootstrap the first admin account
    Only works once, when no staff account exists yet. Every subsequent
    account is created by an admin via POST /api/users - this endpoint
    stays closed afterward so registration can't be used as an open
    signup for staff/admin access.
    ---
    tags: [Auth]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [email, password, fullName]
          properties:
            email: {type: string, example: admin@sokocredit.test}
            password: {type: string, example: SuperSecret1}
            fullName: {type: string, example: Eugene Admin}
    responses:
      201: {description: Admin account created, returns user object plus accessToken and refreshToken}
      400: {description: Validation error}
      403: {description: An account already exists - use POST /api/users (admin only) instead}
    """
    if User.query.first() is not None:
        return error('Registration is closed. Ask an administrator to create your account.', 403)

    values = body()
    email = str(values.get('email', '')).strip().lower()
    password = values.get('password', '')
    full_name = str(values.get('fullName', '')).strip()
    if not email or '@' not in email:
        return error('A valid email is required.')
    if not isinstance(password, str) or len(password) < 8:
        return error('Password must be at least 8 characters.')
    if not full_name:
        return error('fullName is required.')

    # Only reachable when the users table is empty (checked above) - this is
    # the one-time bootstrap that lets someone manage the system at all.
    user = User(email=email, full_name=full_name, role='admin')
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error('An account with this email already exists.', 409)
    return jsonify(user=serialize_user(user), **issue_tokens(user)), 201


@auth_bp.post('/login')
@limiter.limit('10/minute')
def login():
    """
    Log in with email and password
    ---
    tags: [Auth]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [email, password]
          properties:
            email: {type: string, example: admin@sokocredit.test}
            password: {type: string, example: SuperSecret1}
    responses:
      200: {description: Returns user object plus accessToken and refreshToken}
      401: {description: Invalid email or password}
      403: {description: Account has been deactivated}
    """
    values = body()
    email = str(values.get('email', '')).strip().lower()
    password = values.get('password', '')
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return error('Invalid email or password.', 401)
    if not user.is_active:
        return error('This account has been deactivated.', 403)
    return jsonify(user=serialize_user(user), **issue_tokens(user))


@auth_bp.post('/refresh')
@jwt_required(refresh=True)
def refresh():
    """
    Exchange a refresh token for a new access token
    ---
    tags: [Auth]
    security: [{Bearer: []}]
    responses:
      200: {description: Returns a new accessToken}
      401: {description: Refresh token missing, invalid, or account no longer available}
    """
    user = db.session.get(User, get_jwt_identity())
    if not user or not user.is_active:
        return error('Account no longer available.', 401)
    return jsonify(accessToken=create_access_token(identity=user.id, additional_claims=user_claims(user)))


@auth_bp.post('/logout')
@jwt_required(verify_type=False)
def logout():
    """
    Log out and revoke the current token
    Accepts either an access or a refresh token in the Authorization header.
    ---
    tags: [Auth]
    security: [{Bearer: []}]
    responses:
      200: {description: Token revoked}
      401: {description: Missing or invalid token}
    """
    payload = get_jwt()
    db.session.add(TokenBlocklist(
        jti=payload['jti'],
        token_type=payload['type'],
        user_id=get_jwt_identity(),
        expires_at=datetime.fromtimestamp(payload['exp'], tz=timezone.utc),
    ))
    db.session.commit()
    return jsonify(message='Successfully logged out.')
