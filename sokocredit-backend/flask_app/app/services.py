from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

FREQUENCY_DAYS = {'daily': 1, 'weekly': 7, 'monthly': 30}


def decimal(value):
    return Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def installment_count(duration, duration_unit, frequency):
    duration_days = duration if duration_unit == 'days' else duration * 30
    return max(1, -(-duration_days // FREQUENCY_DAYS[frequency]))


def schedule_terms(amount, interest_rate, duration, duration_unit, frequency, start_date=None):
    count = installment_count(duration, duration_unit, frequency)
    total = decimal(amount) * (Decimal('1') + decimal(interest_rate) / Decimal('100'))
    regular_amount = (total / count).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    beginning = start_date or date.today()
    items = []
    for installment in range(1, count + 1):
        due = total - regular_amount * (count - 1) if installment == count else regular_amount
        items.append({'installment': installment, 'due_date': beginning + timedelta(days=FREQUENCY_DAYS[frequency] * installment), 'amount_due': due})
    return items
