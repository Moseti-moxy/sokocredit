"""Central audit-trail writer.

Every mutating endpoint (customer create/update, loan lifecycle actions,
repayments, disbursements, user management) calls log_action() right before
its db.session.commit() so the audit row lands in the *same* transaction as
the change it describes. Rows are never updated or deleted by the API -
that immutability is what makes this a real audit trail rather than a log
line that can quietly disappear.
"""
from flask import request

from .extensions import db
from .models import AuditLog, User
from .security import current_user_id


def log_action(action, entity_type, entity_id=None, details=None):
    """Queue an AuditLog row on the current session. Does not commit - the
    caller's own db.session.commit() persists this alongside its own change,
    so an audit entry can never exist for a change that didn't happen (or
    vice versa).
    """
    user_id = current_user_id()
    user_email = None
    if user_id:
        user = db.session.get(User, user_id)
        user_email = user.email if user else None
    entry = AuditLog(
        user_id=user_id,
        user_email=user_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
        ip_address=request.headers.get('X-Forwarded-For', request.remote_addr) if request else None,
    )
    db.session.add(entry)
    return entry
