import hashlib
import hmac
import os
from functools import wraps

try:
    import bcrypt
except Exception:
    bcrypt = None
import hashlib
import os
import binascii
from cryptography.fernet import Fernet, InvalidToken
from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from sqlalchemy.types import String, TypeDecorator

ROLES = ('admin', 'lender', 'agent')


class SecurityConfigurationError(RuntimeError):
    """Raised when a required production data-protection setting is absent."""


def hash_password(password):
    if bcrypt:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    # fallback: PBKDF2-HMAC-SHA256
    salt = os.urandom(16)
    iterations = 100_000
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
    return f'pbkdf2_sha256${iterations}${binascii.hexlify(salt).decode()}${binascii.hexlify(dk).decode()}'


def verify_password(password, password_hash):
    if bcrypt:
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except (ValueError, AttributeError):
            return False
    # fallback verification for pbkdf2_sha256 format
    try:
        algo, iterations_s, salt_hex, hash_hex = password_hash.split('$')
        if algo != 'pbkdf2_sha256':
            return False
        iterations = int(iterations_s)
        salt = binascii.unhexlify(salt_hex)
        expected = binascii.unhexlify(hash_hex)
        dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
        return hashlib.compare_digest(dk, expected)
    except Exception:
        return False


def role_required(*roles):
    """Restrict a route to callers whose JWT `role` claim is one of `roles`.

    Roles come from the access token's claims (set at login/refresh), not a
    fresh DB lookup, which is why access tokens are kept short-lived.
    """
    unknown = set(roles) - set(ROLES)
    if unknown:
        raise ValueError(f'Unknown role(s) in role_required: {sorted(unknown)}')

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            if get_jwt().get('role') not in roles:
                return jsonify(error='Insufficient permissions.'), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def current_user_id():
    """Returns the JWT subject if a valid access/refresh token is present, else None.

    Safe to call from anywhere (audit logging, optional-auth endpoints) - never raises,
    since callers may need it outside of a route already guarded by jwt_required().
    """
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None


def current_user_role():
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        return claims.get('role') if claims else None
    except Exception:
        return None


def customer_required(fn):
    """Restrict a route to a customer's own access token (self-service portal),
    never a staff token. Staff tokens carry a 'role' claim and no 'type' claim;
    customer tokens carry 'type': 'customer' and no 'role' claim (see
    customer_auth_routes.issue_customer_token) - checking 'type' explicitly here
    (rather than just the absence of 'role') keeps the two token shapes from ever
    being accepted by each other's routes, even if one of them changes claims later.
    get_jwt_identity() inside the wrapped view is the customer's id.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        if get_jwt().get('type') != 'customer':
            return jsonify(error='Insufficient permissions.'), 403
        return fn(*args, **kwargs)
    return wrapper


def current_customer_id():
    """Like current_user_id(), but only returns an id for a customer-portal
    token; returns None for a staff token or no token at all."""
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        if not claims or claims.get('type') != 'customer':
            return None
        return get_jwt_identity()
    except Exception:
        return None


def _blind_index_pepper():
    pepper = os.environ.get('FIELD_ENCRYPTION_KEY')
    if not pepper:
        raise SecurityConfigurationError('FIELD_ENCRYPTION_KEY is not set; required for blind-index lookups too.')
    return pepper.encode('utf-8')


def blind_index(value):
    """Deterministic HMAC-SHA256 of a normalized value, used as a lookup/uniqueness
    index for a field whose plaintext is stored only in an EncryptedString column.

    Fernet encryption is randomized (fresh nonce per call), so encrypted values can
    never be compared or looked up directly in SQL. Pairing every EncryptedString PII
    column with a `<field>_hash` column populated via this function keeps lookups and
    unique constraints working (e.g. WHERE phone_number_hash = blind_index(phone))
    without ever storing the plaintext outside the encrypted column.
    """
    if value is None:
        return None
    normalized = str(value).strip().lower()
    return hmac.new(_blind_index_pepper(), normalized.encode('utf-8'), hashlib.sha256).hexdigest()


def _fernet():
    key = os.environ.get('FIELD_ENCRYPTION_KEY')
    if not key:
        raise SecurityConfigurationError(
            'FIELD_ENCRYPTION_KEY is not set. Generate one with: '
            'python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
        )
    return Fernet(key.encode('utf-8'))


class EncryptedString(TypeDecorator):
    """A String column that is transparently encrypted at rest with Fernet
    (AES-128-CBC + HMAC-SHA256).

    Use this for sensitive customer/PII fields (national ID, phone number,
    physical address, etc.) that must be encrypted at rest for compliance.
    The underlying DB column should be sized generously (encrypted values are
    longer than plaintext) — e.g. db.Column(EncryptedString(500)).

    Key rotation: swap `Fernet` for `cryptography.fernet.MultiFernet` seeded
    with [new_key, old_key] so old rows still decrypt until they're rewritten.
    """
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return _fernet().encrypt(str(value).encode('utf-8')).decode('utf-8')

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return _fernet().decrypt(value.encode('utf-8')).decode('utf-8')
        except InvalidToken:
            return None
