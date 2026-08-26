from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from extensions import db
from models.payment import Payment
from services.payment_service import PaymentService
from services.notification_service import NotificationService
from sqlalchemy import func

payments_bp = Blueprint("payments", __name__, url_prefix="/api/v1")


def error_res(msg, code=400):
    return jsonify({"success": False, "error": msg}), code


def success_res(data, code=200):
    return jsonify({"success": True, "data": data}), code


@payments_bp.route("/payments", methods=["POST"])
@jwt_required()
def record_payment():
    data = request.get_json() or {}
    loan_id = data.get("loan_id")
    amount = data.get("amount")
    method = data.get("method")
    ref = data.get("reference_code")

    if not all([loan_id, amount, method]):
        return error_res("Missing required fields: loan_id, amount, method")

    from models.loan import Loan
    loan = Loan.query.get(loan_id)
    if not loan:
        return error_res("Loan not found", 404)

    payment = PaymentService.record_payment(loan, amount, method, ref)
    return success_res(payment.to_dict(), 201)


@payments_bp.route("/loans/<loan_id>/reschedule", methods=["POST"])
@jwt_required()
def reschedule_loan(loan_id):
    data = request.get_json() or {}
    new_days = data.get("new_duration_days")
    new_rate = data.get("new_interest_rate")

    if not new_days:
        return error_res("Missing new_duration_days")

    from models.loan import Loan
    loan = Loan.query.get(loan_id)
    if not loan:
        return error_res("Loan not found", 404)

    try:
        updated_loan = PaymentService.reschedule_loan(loan, new_days, new_rate)
        return success_res(updated_loan.to_dict())
    except ValueError as e:
        return error_res(str(e))


@payments_bp.route("/notifications/remind", methods=["POST"])
@jwt_required()
def send_manual_reminder():
    data = request.get_json() or {}
    phone = data.get("phone")
    message = data.get("message")
    channel = data.get("channel", "sms")

    if not phone or not message:
        return error_res("Phone and message are required.")

    if channel == "whatsapp":
        res = NotificationService.send_whatsapp_twilio(phone, message)
    else:
        res = NotificationService.send_sms_africas_talking(phone, message)

    return success_res(res)


@payments_bp.route("/analytics/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard_metrics():
    from models.loan import Loan
    
    total_disbursed = db.session.query(func.coalesce(func.sum(Loan.principal_amount), 0)).scalar()
    total_collected = db.session.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == "completed").scalar()
    
    total_loans = db.session.query(func.count(Loan.id)).scalar() or 1
    overdue_loans = db.session.query(func.count(Loan.id)).filter(Loan.status == "OVERDUE").scalar()
    
    default_rate = round((overdue_loans / total_loans) * 100, 2)

    return success_res({
        "portfolio_metrics": {
            "total_disbursed": float(total_disbursed),
            "total_collected": float(total_collected),
            "outstanding_balance": float(total_disbursed) - float(total_collected),
        },
        "risk_metrics": {
            "total_loans": total_loans,
            "overdue_loans": overdue_loans,
            "default_rate_percentage": default_rate
        }
    })


@payments_bp.route("/payments/<payment_id>/receipt", methods=["GET"])
@jwt_required()
def generate_receipt(payment_id):
    payment = Payment.query.get(payment_id)
    if not payment:
        return error_res("Payment not found", 404)

    receipt_text = f"""
    ========================================
                 PAYMENT RECEIPT            
    ========================================
    Receipt No:  {payment.id}
    Date:        {payment.created_at.strftime('%Y-%m-%d %H:%M:%S')}
    Loan ID:     {payment.loan_id}
    Amount Paid: ${payment.amount:.2f}
    Method:      {payment.method.upper()}
    Reference:   {payment.reference_code or 'N/A'}
    ----------------------------------------
    Principal Paid: ${payment.allocated_to_principal:.2f}
    Interest Paid:  ${payment.allocated_to_interest:.2f}
    ========================================
    """
    
    return Response(receipt_text, mimetype="text/plain", headers={
        "Content-Disposition": f"attachment;filename=receipt_{payment.id}.txt"
    })