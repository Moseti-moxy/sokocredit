import os
import base64
from datetime import datetime


class MobileMoneyService:
	"""Wrappers for mobile money providers (Safaricom Daraja / Airtel).

	Methods prefer to perform real network calls when credentials are present.
	When provider credentials are missing or requests/SDKs are not available,
	methods return a {'status':'skipped', 'reason':...} dict so callers can
	handle offline/test environments gracefully.
	"""

	@staticmethod
	def _get_mpesa_token(consumer_key, consumer_secret, token_url=None):
		try:
			import requests
		except Exception:
			return None
		token_url = token_url or os.getenv('MPESA_OAUTH_URL', 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials')
		try:
			r = requests.get(token_url, auth=(consumer_key, consumer_secret), timeout=10)
			if r.status_code == 200:
				return r.json().get('access_token')
		except Exception:
			return None
		return None

	@staticmethod
	def initiate_mpesa_stk_push(phone_number, amount, account_ref, callback_url=None):
		consumer_key = os.getenv('MPESA_CONSUMER_KEY')
		consumer_secret = os.getenv('MPESA_CONSUMER_SECRET')
		shortcode = os.getenv('MPESA_SHORTCODE')
		passkey = os.getenv('MPESA_PASSKEY')
		callback_url = callback_url or os.getenv('MPESA_CALLBACK_URL')

		if not all([consumer_key, consumer_secret, shortcode, passkey, callback_url]):
			return {'status': 'skipped', 'reason': 'mpesa-credentials-missing'}

		token = MobileMoneyService._get_mpesa_token(consumer_key, consumer_secret)
		if not token:
			return {'status': 'error', 'reason': 'token-acquisition-failed'}

		timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
		password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

		payload = {
			"BusinessShortCode": shortcode,
			"Password": password,
			"Timestamp": timestamp,
			"TransactionType": "CustomerPayBillOnline",
			"Amount": int(amount),
			"PartyA": phone_number,
			"PartyB": shortcode,
			"PhoneNumber": phone_number,
			"CallBackURL": callback_url,
			"AccountReference": account_ref,
			"TransactionDesc": f"Payment for {account_ref}",
		}

		stk_url = os.getenv('MPESA_STK_PUSH_URL', 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest')
		try:
			import requests
			headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
			r = requests.post(stk_url, json=payload, headers=headers, timeout=10)
			try:
				return {'status': 'success' if r.status_code in (200, 201) else 'error', 'response': r.json()}
			except Exception:
				return {'status': 'error', 'response_text': r.text}
		except Exception as e:
			return {'status': 'error', 'message': str(e)}

	@staticmethod
	def initiate_airtel_payment(phone_number, amount, txn_reference):
		# If Africa's Talking credentials are present, prefer using its API.
		at_key = os.getenv('AFRICASTALKING_API_KEY')
		at_username = os.getenv('AFRICASTALKING_USERNAME')
		if not (at_key and at_username):
			return {'status': 'skipped', 'reason': 'airtel-config-missing'}

		try:
			import africastalking as at
		except Exception:
			return {'status': 'skipped', 'reason': 'africastalking-sdk-missing'}

		try:
			at.initialize(at_username, at_key)
			# Depending on Airtel integration method you may need a different API.
			sms = at.SMS
			# Use SMS as a placeholder to notify the user with payment instructions
			message = f"Please complete payment of KES {amount} referencing {txn_reference}."
			res = sms.send(message, [phone_number])
			return {'status': 'success', 'result': res}
		except Exception as e:
			return {'status': 'error', 'message': str(e)}

