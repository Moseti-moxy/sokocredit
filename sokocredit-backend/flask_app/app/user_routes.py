from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from .extensions import db
from .models import User
from .security import ROLES, role_required

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


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
        'updatedAt': user.updated_at.isoformat(),
    }


@users_bp.get('/me')
@jwt_required()
def me():
    """
    Get the current logged-in user
    ---
    tags: [Users]
    security: [{Bearer: []}]
    responses:
      200: {description: The current user}
      404: {description: User not found}
    """
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return error('User not found.', 404)
    return jsonify(user=serialize_user(user))


@users_bp.patch('/me/password')
@jwt_required()
def change_own_password():
    """
    Change your own password
    ---
    tags: [Users]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [currentPassword, newPassword]
          properties:
            currentPassword: {type: string}
            newPassword: {type: string, example: NewSecret1}
    responses:
      200: {description: Password updated}
      401: {description: Current password is incorrect}
      400: {description: New password must be at least 8 characters}
    """
    user = db.session.get(User, get_jwt_identity())
    values = body()
    new_password = values.get('newPassword', '')
    if not user or not user.check_password(values.get('currentPassword', '')):
        return error('Current password is incorrect.', 401)
    if not isinstance(new_password, str) or len(new_password) < 8:
        return error('New password must be at least 8 characters.')
    user.set_password(new_password)
    db.session.commit()
    return jsonify(message='Password updated.')


@users_bp.post('')
@role_required('admin')
def create_user():
    """
    Create a user (admin only)
    ---
    tags: [Users]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [email, password, fullName]
          properties:
            email: {type: string, example: agent@sokocredit.test}
            password: {type: string, example: SuperSecret1}
            fullName: {type: string, example: New Agent}
            role: {type: string, enum: [admin, lender, agent], example: agent}
    responses:
      201: {description: User created}
      400: {description: Validation error}
      403: {description: Admin role required}
      409: {description: An account with this email already exists}
    """
    values = body()
    email = str(values.get('email', '')).strip().lower()
    password = values.get('password', '')
    full_name = str(values.get('fullName', '')).strip()
    role = values.get('role', 'agent')
    if not email or '@' not in email:
        return error('A valid email is required.')
    if role not in ROLES:
        return error(f'role must be one of {", ".join(ROLES)}.')
    if not isinstance(password, str) or len(password) < 8:
        return error('Password must be at least 8 characters.')
    if not full_name:
        return error('fullName is required.')
    user = User(email=email, full_name=full_name, role=role)
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error('An account with this email already exists.', 409)
    return jsonify(user=serialize_user(user)), 201


@users_bp.get('')
@role_required('admin')
def list_users():
    """
    List users (admin only)
    ---
    tags: [Users]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: role
        type: string
        enum: [admin, lender, agent]
        required: false
    responses:
      200: {description: Array of users}
      403: {description: Admin role required}
    """
    query = User.query.order_by(User.created_at.desc())
    if role := request.args.get('role'):
        query = query.filter_by(role=role)
    return jsonify(users=[serialize_user(u) for u in query.all()])


@users_bp.get('/<user_id>')
@role_required('admin')
def get_user(user_id):
    """
    Get a user by id (admin only)
    ---
    tags: [Users]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: user_id
        type: string
        required: true
    responses:
      200: {description: The user}
      403: {description: Admin role required}
      404: {description: User not found}
    """
    user = db.session.get(User, user_id)
    return error('User not found.', 404) if not user else jsonify(user=serialize_user(user))


@users_bp.patch('/<user_id>')
@role_required('admin')
def update_user(user_id):
    """
    Update a user (admin only)
    Any subset of the fields below may be sent.
    ---
    tags: [Users]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: user_id
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            fullName: {type: string}
            role: {type: string, enum: [admin, lender, agent]}
            isActive: {type: boolean}
            password: {type: string}
    responses:
      200: {description: Updated user}
      400: {description: Validation error}
      403: {description: Admin role required}
      404: {description: User not found}
    """
    user = db.session.get(User, user_id)
    if not user:
        return error('User not found.', 404)
    values = body()
    if 'fullName' in values:
        full_name = str(values['fullName']).strip()
        if not full_name:
            return error('fullName cannot be empty.')
        user.full_name = full_name
    if 'role' in values:
        if values['role'] not in ROLES:
            return error(f'role must be one of {", ".join(ROLES)}.')
        user.role = values['role']
    if 'isActive' in values:
        user.is_active = bool(values['isActive'])
    if 'password' in values:
        if not isinstance(values['password'], str) or len(values['password']) < 8:
            return error('Password must be at least 8 characters.')
        user.set_password(values['password'])
    db.session.commit()
    return jsonify(user=serialize_user(user))


@users_bp.delete('/<user_id>')
@role_required('admin')
def deactivate_user(user_id):
    """
    Deactivate a user (admin only)
    Soft-delete: sets isActive to false. Admins cannot deactivate themselves.
    ---
    tags: [Users]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: user_id
        type: string
        required: true
    responses:
      200: {description: Deactivated user}
      403: {description: Admin role required}
      404: {description: User not found}
      409: {description: You cannot deactivate your own account}
    """
    user = db.session.get(User, user_id)
    if not user:
        return error('User not found.', 404)
    if user.id == get_jwt_identity():
        return error('You cannot deactivate your own account.', 409)
    user.is_active = False
    db.session.commit()
    return jsonify(user=serialize_user(user))
