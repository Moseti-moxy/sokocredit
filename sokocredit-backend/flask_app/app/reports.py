"""PDF generation for payment receipts and loan statements (requirement #18),
plus the portfolio dashboard/analytics aggregations (requirements #12-15).

PDFs are built with reportlab straight into an in-memory buffer - no template
files, no headless-browser dependency, so it works the same in dev and on any
hosting platform.
"""
import io
from datetime import date, datetime, timedelta
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet

from .extensions import db
from .i18n import t
from .models import Customer, Loan, Repayment

styles = getSampleStyleSheet()


def _base_doc(buffer, title):
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    story = [Paragraph('SokoCredit', styles['Title']), Paragraph(title, styles['Heading2']), Spacer(1, 8 * mm)]
    return doc, story


def _styled_table(rows, col_widths=None):
    table = Table(rows, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f6f43')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
    ]))
    return table


def generate_receipt_pdf(repayment_id, lang='en'):
    """Returns (bytes, filename) for a single repayment's receipt, or None if
    the repayment doesn't exist."""
    repayment = db.session.get(Repayment, repayment_id)
    if not repayment:
        return None
    loan = repayment.loan
    customer = db.session.get(Customer, loan.customer_id)

    buffer = io.BytesIO()
    doc, story = _base_doc(buffer, t('receipt_title', lang))
    rows = [
        ['Receipt No.', repayment.id[:12].upper()],
        ['Date', repayment.paid_at.strftime('%d %b %Y, %H:%M')],
        ['Customer', customer.full_name if customer else loan.customer_id],
        ['Loan Reference', loan.id[:12].upper()],
        ['Amount Paid', f'KES {repayment.amount:,.2f}'],
        ['Method', repayment.method.replace('_', ' ').title()],
        ['Reference', repayment.reference or '-'],
    ]
    story.append(_styled_table(rows, col_widths=[50 * mm, 100 * mm]))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('This receipt confirms a repayment recorded against the loan above. Payment records are immutable once confirmed.', styles['Normal']))
    doc.build(story)
    return buffer.getvalue(), f'receipt-{repayment.id[:8]}.pdf'


def generate_loan_statement_pdf(loan_id, lang='en'):
    loan = db.session.get(Loan, loan_id)
    if not loan:
        return None
    customer = db.session.get(Customer, loan.customer_id)

    buffer = io.BytesIO()
    doc, story = _base_doc(buffer, t('statement_title', lang))
    story.append(Paragraph(
        f'Customer: {customer.full_name if customer else loan.customer_id}<br/>'
        f'Loan Reference: {loan.id[:12].upper()}<br/>'
        f'Principal: KES {loan.amount:,.2f} at {loan.interest_rate}% for {loan.duration} {loan.duration_unit}<br/>'
        f'Status: {loan.status}',
        styles['Normal'],
    ))
    story.append(Spacer(1, 6 * mm))

    schedule_rows = [['#', 'Due Date', 'Amount Due', 'Amount Paid', 'Status']]
    for item in loan.repayment_schedule:
        schedule_rows.append([str(item.installment), item.due_date.isoformat(), f'{item.amount_due:,.2f}', f'{item.amount_paid:,.2f}', item.status])
    story.append(Paragraph('Repayment Schedule', styles['Heading3']))
    story.append(_styled_table(schedule_rows))
    story.append(Spacer(1, 6 * mm))

    payment_rows = [['Date', 'Amount', 'Method', 'Reference']]
    for repayment in loan.repayments:
        payment_rows.append([repayment.paid_at.strftime('%d %b %Y'), f'{repayment.amount:,.2f}', repayment.method, repayment.reference or '-'])
    story.append(Paragraph('Payment History', styles['Heading3']))
    story.append(_styled_table(payment_rows) if len(payment_rows) > 1 else Paragraph('No repayments recorded yet.', styles['Normal']))

    doc.build(story)
    return buffer.getvalue(), f'statement-{loan.id[:8]}.pdf'


def generate_customer_statement_pdf(customer_id, lang='en'):
    customer = db.session.get(Customer, customer_id)
    if not customer:
        return None
    loans = Loan.query.filter_by(customer_id=customer_id).order_by(Loan.applied_at.desc()).all()

    buffer = io.BytesIO()
    doc, story = _base_doc(buffer, t('statement_title', lang) + f' - {customer.full_name}')
    rows = [['Loan Ref', 'Amount', 'Status', 'Applied']]
    for loan in loans:
        rows.append([loan.id[:12].upper(), f'{loan.amount:,.2f}', loan.status, loan.applied_at.strftime('%d %b %Y')])
    story.append(_styled_table(rows) if len(rows) > 1 else Paragraph('No loans on record.', styles['Normal']))
    doc.build(story)
    return buffer.getvalue(), f'customer-statement-{customer.id[:8]}.pdf'


# ---- Dashboard / analytics aggregations (requirements #12-15) --------------

def outstanding_balance_for(loan):
    return sum((item.amount_due - item.amount_paid for item in loan.repayment_schedule), Decimal('0'))


def portfolio_dashboard():
    loans = Loan.query.all()
    active = [l for l in loans if l.status == 'ACTIVE']
    completed = [l for l in loans if l.status == 'COMPLETED']
    total_disbursed = sum((d.amount for l in loans for d in l.disbursements), Decimal('0'))
    total_collected = sum((r.amount for l in loans for r in l.repayments), Decimal('0'))
    total_outstanding = sum((outstanding_balance_for(l) for l in active), Decimal('0'))

    today = date.today()
    overdue_items = [i for l in active for i in l.repayment_schedule if i.status != 'PAID' and i.amount_paid < i.amount_due and i.due_date < today]
    total_installments = sum(len(l.repayment_schedule) for l in loans)
    default_rate_pct = round((len(overdue_items) / total_installments) * 100, 2) if total_installments else 0.0

    return {
        'totalCustomers': Customer.query.count(),
        'totalLoans': len(loans),
        'activeLoans': len(active),
        'completedLoans': len(completed),
        'pendingApplications': sum(1 for l in loans if l.status == 'PENDING'),
        'totalDisbursed': float(total_disbursed),
        'totalCollected': float(total_collected),
        'totalOutstanding': float(total_outstanding),
        'overdueInstallments': len(overdue_items),
        'defaultRatePct': default_rate_pct,
        'profitability': {
            'interestEarnedEstimate': float(sum((l.amount * l.interest_rate / Decimal('100') for l in completed), Decimal('0'))),
        },
    }


def performance_report(start_date: date, end_date: date):
    loans = Loan.query.filter(Loan.applied_at >= start_date, Loan.applied_at <= end_date + timedelta(days=1)).all()
    repayments = Repayment.query.filter(Repayment.paid_at >= start_date, Repayment.paid_at <= end_date + timedelta(days=1)).all()
    approved = [l for l in loans if l.status in {'APPROVED', 'ACTIVE', 'COMPLETED'}]
    rejected = [l for l in loans if l.status == 'REJECTED']
    return {
        'periodStart': start_date.isoformat(),
        'periodEnd': end_date.isoformat(),
        'applicationsReceived': len(loans),
        'applicationsApproved': len(approved),
        'applicationsRejected': len(rejected),
        'approvalRatePct': round((len(approved) / len(loans)) * 100, 1) if loans else 0.0,
        'totalCollectedInPeriod': float(sum((r.amount for r in repayments), Decimal('0'))),
        'repaymentCountInPeriod': len(repayments),
    }


def high_risk_customers(limit=20):
    from customers.scoring import compute_credit_score
    results = []
    for customer in Customer.query.filter_by(status='ACTIVE').all():
        score = compute_credit_score(customer.id)
        if score['loansConsidered'] == 0:
            continue
        results.append({'customerId': customer.id, 'customerName': customer.full_name, **score})
    results.sort(key=lambda r: r['score'])
    return results[:limit]


def collection_target_progress(target):
    repayments = Repayment.query.filter(
        Repayment.paid_at >= target.period_start, Repayment.paid_at <= target.period_end + timedelta(days=1),
    ).all()
    collected = sum((r.amount for r in repayments), Decimal('0'))
    achievement_pct = round((float(collected) / float(target.target_amount)) * 100, 1) if target.target_amount else 0.0
    return {
        'id': target.id, 'period': target.period, 'periodStart': target.period_start.isoformat(),
        'periodEnd': target.period_end.isoformat(), 'targetAmount': float(target.target_amount),
        'market': target.market, 'collectedAmount': float(collected), 'achievementPct': achievement_pct,
    }
