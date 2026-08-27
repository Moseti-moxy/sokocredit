## M-PESA STK Push repayments

The Flask API initiates an STK Push for an active loan and only creates a repayment after Safaricom sends a successful callback. This keeps pending, failed, and completed payment attempts auditable and makes repeated callbacks safe.

1. Copy `flask_app/.env.example` to `flask_app/.env` and supply the Daraja values for your own sandbox or production app. Do not put live credentials in an example file or commit them.
2. Set `MPESA_CALLBACK_URL` to the exact public HTTPS endpoint that can receive `POST /api/mpesa/stk-callback`. Register/update that callback URL in Daraja when required.
3. Select `CustomerPayBillOnline` for a PayBill shortcode, or `CustomerBuyGoodsOnline` for a Till shortcode.
4. Apply the database migration before starting the API:

   ```bash
   cd flask_app
   ../.venv/bin/flask --app run.py db upgrade
   ```

Initiate a repayment with:

```http
POST /api/loans/{loanId}/mpesa/stk-push
Content-Type: application/json

{"amount": 100, "phoneNumber": "0712345678"}
```

The endpoint returns `202` with a `checkoutRequestId`; it is not proof of payment. A successful M-PESA callback records the repayment using the receipt number exactly once.
