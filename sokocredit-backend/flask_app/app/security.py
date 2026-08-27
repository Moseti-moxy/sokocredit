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
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from sqlalchemy.types import String, TypeDecorator

ROLES = ('admin', 'lender', 'agent')


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


def _fernet():
    key = os.environ.get('FIELD_ENCRYPTION_KEY')
    if not key:
        raise RuntimeError(
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
