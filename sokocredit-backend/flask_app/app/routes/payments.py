@payments_bp.route("/loans/<loan_id>/statement", methods=["GET"])
@jwt_required()
def generate_loan_statement(loan_id):
    from models.loan import Loan
    
    loan = Loan.query.get(loan_id)
    if not loan:
        return error_res("Loan not found", 404)

    payments = Payment.query.filter_by(loan_id=loan_id).order_by(Payment.created_at.asc()).all()

    statement_text = f"""
    ==================================================
                 SOKOCREDIT LOAN STATEMENT            
    ==================================================
    Loan ID:           {loan.id}
    Principal Amount:  ${float(loan.principal_amount):.2f}
    Current Balance:   ${float(loan.balance):.2f}
    Status:            {loan.status}
    --------------------------------------------------
    PAYMENT HISTORY:
    --------------------------------------------------
    {"Date":<20} | {"Method":<10} | {"Amount":<10} | {"Ref Code"}
    --------------------------------------------------
    """
    
    for p in payments:
        date_str = p.created_at.strftime('%Y-%m-%d %H:%M')
        statement_text += f"\n    {date_str:<20} | {p.method.upper():<10} | ${float(p.amount):<9.2f} | {p.reference_code or 'N/A'}"

    statement_text += "\n    =================================================="

    return Response(statement_text, mimetype="text/plain", headers={
        "Content-Disposition": f"attachment;filename=statement_{loan_id}.txt"
    })

@payments_bp.route("/analytics/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard_metrics():
    from models.loan import Loan
    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Core Metrics
    total_disbursed = db.session.query(func.coalesce(func.sum(Loan.principal_amount), 0)).scalar()
    total_collected = db.session.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == "completed").scalar()
    
    # Collection Targets (Daily & Monthly actuals)
    daily_collected = db.session.query(func.coalesce(func.sum(Payment.amount), 0))\
        .filter(Payment.status == "completed", Payment.created_at >= start_of_today).scalar()
        
    monthly_collected = db.session.query(func.coalesce(func.sum(Payment.amount), 0))\
        .filter(Payment.status == "completed", Payment.created_at >= start_of_month).scalar()

    total_loans = db.session.query(func.count(Loan.id)).scalar() or 1
    overdue_loans = db.session.query(func.count(Loan.id)).filter(Loan.status == "OVERDUE").scalar()
    default_rate = round((overdue_loans / total_loans) * 100, 2)

    return success_res({
        "portfolio_metrics": {
            "total_disbursed": float(total_disbursed),
            "total_collected": float(total_collected),
            "outstanding_balance": float(total_disbursed) - float(total_collected),
        },
        "collection_targets": {
            "daily_collected": float(daily_collected),
            "monthly_collected": float(monthly_collected),
        },
        "risk_metrics": {
            "total_loans": total_loans,
            "overdue_loans": overdue_loans,
            "default_rate_percentage": default_rate
        }
    })