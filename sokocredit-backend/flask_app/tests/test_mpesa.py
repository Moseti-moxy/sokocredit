import base64
import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.mpesa import initiate_stk_push, normalize_phone_number


def mpesa_config():
    return {
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite://',
        'MPESA_ENV': 'sandbox',
        'MPESA_CONSUMER_KEY': 'consumer-key',
        'MPESA_CONSUMER_SECRET': 'consumer-secret',
        'MPESA_SHORTCODE': '174379',
        'MPESA_PASSKEY': 'passkey',
        'MPESA_CALLBACK_URL': 'https://payments.sokocredit.test/api/mpesa/stk-callback',
        'MPESA_TRANSACTION_TYPE': 'CustomerPayBillOnline',
    }


def test_stk_push_uses_daraja_payload_and_accepts_numeric_response_code():
    app = create_app(mpesa_config())
    response = {'ResponseCode': 0, 'CheckoutRequestID': 'checkout-123'}
    with app.app_context(), patch('app.mpesa.access_token', return_value='token'), patch('app.mpesa.request_json', return_value=response) as request_json:
        result = initiate_stk_push(
            amount=100,
            phone_number='254712345678',
            account_reference='loan-123',
            transaction_desc='Loan repayment',
        )

    assert result == response
    url = request_json.call_args.args[0]
    payload = json.loads(request_json.call_args.kwargs['payload'])
    assert url == 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    assert request_json.call_args.kwargs['headers']['Authorization'] == 'Bearer token'
    assert payload['BusinessShortCode'] == '174379'
    assert payload['TransactionType'] == 'CustomerPayBillOnline'
    assert payload['PhoneNumber'] == '254712345678'
    assert payload['AccountReference'] == 'loan-123'
    assert payload['Password'] == base64.b64encode(f"174379passkey{payload['Timestamp']}".encode()).decode()


def test_phone_normalization_accepts_supported_kenyan_formats():
    assert normalize_phone_number('0712 345 678') == '254712345678'
    assert normalize_phone_number('+254 712 345 678') == '254712345678'
