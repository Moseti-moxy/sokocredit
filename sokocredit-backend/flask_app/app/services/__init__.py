
from decimal import Decimal, Decimal as decimal

try:
    from .schedule import schedule_terms
except ImportError:
    # Minimal fallback schedule generator used for tests and simple installations.
    from datetime import date

    def schedule_terms(amount, interest_rate, duration, duration_unit, frequency, disbursed_date=None):
        """Return a simple repayment schedule as a list of dicts.

        This fallback splits `amount` into `duration` equal installments.
        Fields returned match what `routes.disburse` expects: `installment`,
        `due_date` and `amount_due`.
        """
        amt = Decimal(amount)
        dur = int(duration) if duration else 1
        # avoid division by zero
        if dur <= 0:
            dur = 1
        # equal split, last installment gets remainder
        base = (amt / dur).quantize(Decimal('0.01'))
        items = []
        for i in range(1, dur + 1):
            if i < dur:
                amount_due = base
            else:
                # last installment picks up any rounding remainder
                amount_due = (amt - base * (dur - 1)).quantize(Decimal('0.01'))
            items.append({'installment': i, 'due_date': (disbursed_date or date.today()), 'amount_due': amount_due})
        return items
