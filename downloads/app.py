import os
import logging
from flask import Flask, request, jsonify
from services import MobileMoneyService

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route("/api/v1/payments/stk-push", methods=["POST"])
def initiate_stk_push():
    """
    Initiates an M-Pesa STK Push.
    Expects JSON: { "phone_number": "0712345678", "amount": 10, "account_ref": "INV-1001" }
    """
    data = request.get_json() or {}
    phone_number = data.get("phone_number")
    amount = data.get("amount")
    account_ref = data.get("account_ref")

    if not all([phone_number, amount, account_ref]):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    logger.info(f"Initiating M-Pesa STK Push for {phone_number} - KES {amount}")
    response = MobileMoneyService.initiate_mpesa_stk_push(phone_number, amount, account_ref)
    return jsonify(response)

@app.route("/api/v1/payments/airtel-money", methods=["POST"])
def initiate_airtel_money():
    """
    Initiates an Airtel Money Payment Request.
    Expects JSON: { "phone_number": "0733123456", "amount": 10, "txn_reference": "TXN-9982" }
    """
    data = request.get_json() or {}
    phone_number = data.get("phone_number")
    amount = data.get("amount")
    txn_reference = data.get("txn_reference")

    if not all([phone_number, amount, txn_reference]):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    logger.info(f"Initiating Airtel Payment for {phone_number} - KES {amount}")
    response = MobileMoneyService.initiate_airtel_payment(phone_number, amount, txn_reference)
    return jsonify(response)

@app.route("/api/v1/payments/callback/mpesa", methods=["POST"])
def mpesa_callback():
    """
    Webhook endpoint hit by Safaricom Daraja after transaction completes.
    """
    callback_data = request.get_json() or {}
    logger.info(f"Received M-Pesa Callback Payload: {callback_data}")

    try:
        stk_callback = callback_data.get("Body", {}).get("stkCallback", {})
        result_code = stk_callback.get("ResultCode")
        result_desc = stk_callback.get("ResultDesc")
        merchant_request_id = stk_callback.get("MerchantRequestID")
        checkout_request_id = stk_callback.get("CheckoutRequestID")

        if result_code == 0:
            # Payment successful
            callback_metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            
            # Extract specific metadata entries safely
            metadata_dict = {item["Name"]: item.get("Value") for item in callback_metadata if "Name" in item}
            
            mpesa_receipt_number = metadata_dict.get("MpesaReceiptNumber")
            amount_paid = metadata_dict.get("Amount")
            phone_number = metadata_dict.get("PhoneNumber")
            transaction_date = metadata_dict.get("TransactionDate")

            logger.info(f"SUCCESS: M-Pesa Payment Received! Receipt: {mpesa_receipt_number}, Amount: {amount_paid}, Phone: {phone_number}")
            # TODO: Update transaction record in database to 'SUCCESSFUL' here
        else:
            # Payment failed or cancelled by user
            logger.warning(f"FAILED: M-Pesa Payment unsuccessful. Code: {result_code}, Desc: {result_desc}")
            # TODO: Update transaction record in database to 'FAILED' here

    except Exception as e:
        logger.error(f"Error parsing M-Pesa callback: {str(e)}", exc_info=True)

    # Safaricom expects a 200 OK standard response acceptance layout
    return jsonify({"ResultCode": 0, "ResultDesc": "Success"})

@app.route("/api/v1/payments/callback/airtel", methods=["POST"])
def airtel_callback():
    """
    Webhook endpoint hit by Airtel Money after transaction processing finishes.
    """
    callback_data = request.get_json() or {}
    logger.info(f"Received Airtel Callback Payload: {callback_data}")

    try:
        transaction_block = callback_data.get("transaction", {})
        txn_id = transaction_block.get("id")
        airtel_money_id = transaction_block.get("message") # Airtel transaction ID
        status_code = transaction_block.get("status")

        if status_code == "TS" or status_code == "200":
            logger.info(f"SUCCESS: Airtel Payment Received! Txn ID: {txn_id}, Reference: {airtel_money_id}")
            # TODO: Update transaction record in database to 'SUCCESSFUL' here
        else:
            logger.warning(f"FAILED: Airtel Payment unsuccessful. Status: {status_code}")
            # TODO: Update transaction record in database to 'FAILED' here

    except Exception as e:
        logger.error(f"Error parsing Airtel callback: {str(e)}", exc_info=True)

    # Return acknowledgement to Airtel
    return jsonify({"status": "SUCCESS", "message": "Callback received successfully"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
