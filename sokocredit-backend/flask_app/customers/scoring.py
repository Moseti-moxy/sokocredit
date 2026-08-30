from datetime import date, timezone
from decimal import Decimal

from app.models import Loan, RepaymentScheduleItem

# Simple, explainable point-based model (0-100). Tune weights as real repayment
# data comes in — this is a starting point, not a final risk model.
BASE_SCORE = 50
ON_TIME_WEIGHT = 40
COMPLETED_LOAN_BONUS = 5
MAX_COMPLETED_BONUS = 15
OVERDUE_PENALTY_PER_ITEM = 8
MAX_OVERDUE_PENALTY = 35
NO_HISTORY_SCORE = 50


def _schedule_items_for_customer(customer_id):
    loans = Loan.query.filter_by(customer_id=customer_id).all()
    items = [item for loan in loans for item in loan.repayment_schedule]
    return loans, items


def compute_credit_score(customer_id):
    """Returns a dict: score (0-100), rating, and the factors behind it."""
    loans, items = _schedule_items_for_customer(customer_id)
    if not loans:
        return {
            'score': NO_HISTORY_SCORE,
            'rating': 'NEW',
            'loansConsidered': 0,
            'onTimeRate': None,
            'overdueInstallments': 0,
            'completedLoans': 0,
            'defaultRatePct': 0,
            'outstandingBalance': 0,
        }

    today = date.today()
    paid_items = [i for i in items if i.status == 'PAID' or i.amount_paid >= i.amount_due]
    overdue_items = [i for i in items if i.status != 'PAID' and i.amount_paid < i.amount_due and i.due_date < today]
    on_time_rate = len(paid_items) / len(items) if items else 1.0
    completed_loans = sum(1 for loan in loans if loan.status == 'COMPLETED')

    score = BASE_SCORE
    score += on_time_rate * ON_TIME_WEIGHT
    score += min(completed_loans * COMPLETED_LOAN_BONUS, MAX_COMPLETED_BONUS)
    score -= min(len(overdue_items) * OVERDUE_PENALTY_PER_ITEM, MAX_OVERDUE_PENALTY)
    score = max(0, min(100, round(score)))

    if score >= 80:
        rating = 'EXCELLENT'
    elif score >= 65:
        rating = 'GOOD'
    elif score >= 45:
        rating = 'FAIR'
    else:
        rating = 'POOR'

    outstanding_balance = sum((i.amount_due - i.amount_paid for i in items), Decimal('0'))

    return {
        'score': score,
        'rating': rating,
        'loansConsidered': len(loans),
        'onTimeRate': round(on_time_rate, 2),
        'overdueInstallments': len(overdue_items),
        'completedLoans': completed_loans,
        'defaultRatePct': round((len(overdue_items) / len(items)) * 100, 1) if items else 0,
        'outstandingBalance': float(outstanding_balance),
    }
