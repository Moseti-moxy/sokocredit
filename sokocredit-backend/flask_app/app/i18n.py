"""Minimal multi-language support (English / Swahili).

This is deliberately a plain dict-based translator rather than a full
Flask-Babel setup: the API's user-facing text is almost entirely short,
fixed messages (errors, SMS/WhatsApp reminder templates, receipt/statement
labels), so a lookup table covers the real need without adding a
translation-file build step to the project.

Usage:
    from .i18n import t, current_lang
    lang = current_lang()              # reads ?lang= or Accept-Language, default 'en'
    return jsonify(error=t('customer_not_found', lang))
"""
from flask import request

SUPPORTED_LANGUAGES = ('en', 'sw')
DEFAULT_LANGUAGE = 'en'

TRANSLATIONS = {
    # ---- Common API errors ----
    'customer_not_found': {'en': 'Customer not found.', 'sw': 'Mteja hakupatikana.'},
    'loan_not_found': {'en': 'Loan not found.', 'sw': 'Mkopo haukupatikana.'},
    'insufficient_permissions': {'en': 'Insufficient permissions.', 'sw': 'Huna ruhusa ya kutosha.'},
    'validation_error': {'en': 'One or more fields are invalid.', 'sw': 'Sehemu moja au zaidi si sahihi.'},
    'duplicate_customer': {
        'en': 'A customer with this phone number or national ID already exists.',
        'sw': 'Mteja mwenye nambari hii ya simu au kitambulisho tayari yupo.',
    },
    'only_active_loans_repay': {
        'en': 'Only active loans can receive repayments.',
        'sw': 'Ni mikopo inayoendelea pekee inayoweza kupokea malipo.',
    },
    'repayment_exceeds_balance': {
        'en': 'Repayment amount cannot exceed the outstanding balance.',
        'sw': 'Kiasi cha malipo hakiwezi kuzidi salio linalodaiwa.',
    },
    # ---- Payment reminder templates. {name}, {amount}, {due_date}, {loan_ref} are
    # filled in by app.notifications.build_reminder_message(). ----
    'reminder_upcoming': {
        'en': 'Hi {name}, a payment of KES {amount} for loan {loan_ref} is due on {due_date}. Pay via M-Pesa/Airtel Money to avoid late fees. - SokoCredit',
        'sw': 'Habari {name}, malipo ya KES {amount} kwa mkopo {loan_ref} yanatakiwa {due_date}. Lipa kupitia M-Pesa/Airtel Money kuepuka adhabu. - SokoCredit',
    },
    'reminder_overdue': {
        'en': 'Hi {name}, your payment of KES {amount} for loan {loan_ref} was due on {due_date} and is now overdue. Please pay as soon as possible. - SokoCredit',
        'sw': 'Habari {name}, malipo yako ya KES {amount} kwa mkopo {loan_ref} yalitakiwa {due_date} na sasa yamechelewa. Tafadhali lipa haraka. - SokoCredit',
    },
    'receipt_title': {'en': 'Payment Receipt', 'sw': 'Risiti ya Malipo'},
    'statement_title': {'en': 'Loan Statement', 'sw': 'Taarifa ya Mkopo'},
}


def current_lang():
    """?lang=sw wins, then Accept-Language, then English."""
    requested = (request.args.get('lang') or '').lower()
    if requested in SUPPORTED_LANGUAGES:
        return requested
    best = request.accept_languages.best_match(SUPPORTED_LANGUAGES)
    return best or DEFAULT_LANGUAGE


def t(key, lang=None, **kwargs):
    lang = lang if lang in SUPPORTED_LANGUAGES else (lang or current_lang())
    entry = TRANSLATIONS.get(key)
    if not entry:
        return key
    text = entry.get(lang, entry.get(DEFAULT_LANGUAGE, key))
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, IndexError):
            return text
    return text
