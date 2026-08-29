import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db


def register_customer(client, **overrides):
    payload = {
        'fullName': 'Agnes Muthoni', 'phoneNumber': '0712345678', 'nationalId': '29481029',
        'password': '1234',
    }
    payload.update(overrides)
    return client.post('/api/customer-auth/register', json=payload)


def test_customer_can_register_and_login():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()

    response = register_customer(client)
    assert response.status_code == 201
    body = response.get_json()
    assert 'accessToken' in body
    assert body['customer']['fullName'] == 'Agnes Muthoni'

    login = client.post('/api/customer-auth/login', json={'identifier': '29481029', 'password': '1234'})
    assert login.status_code == 200
    assert 'accessToken' in login.get_json()

    wrong_pin = client.post('/api/customer-auth/login', json={'identifier': '29481029', 'password': 'wrong'})
    assert wrong_pin.status_code == 401


def test_duplicate_registration_is_rejected():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    register_customer(client)
    dup = register_customer(client, fullName='Someone Else')
    assert dup.status_code == 409


def test_staff_created_customer_without_pin_cannot_login():
    """A customer created by staff via /api/customers has no pin_hash until
    they self-register or an agent sets one - login must refuse, not crash."""
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    from tests.helpers import auth_headers
    staff_headers = auth_headers(client)
    client.post('/api/customers', json={
        'fullName': 'Staff Created', 'phoneNumber': '0700999888', 'nationalId': '11119999',
        'businessName': 'Biz', 'market': 'Market', 'stallNumber': 'S-1', 'dailyTurnover': 1000,
    }, headers=staff_headers)

    login = client.post('/api/customer-auth/login', json={'identifier': '11119999', 'password': '1234'})
    assert login.status_code == 403
    assert 'not been set up' in login.get_json()['error']


def test_customer_token_cannot_access_staff_endpoints():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    token = register_customer(client).get_json()['accessToken']
    customer_headers = {'Authorization': f'Bearer {token}'}

    forbidden = client.get('/api/customers', headers=customer_headers)
    assert forbidden.status_code == 403

    forbidden_loans = client.get('/api/loans', headers=customer_headers)
    assert forbidden_loans.status_code == 403


def test_staff_token_cannot_access_customer_portal():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    from tests.helpers import auth_headers
    staff_headers = auth_headers(client)

    forbidden = client.get('/api/customer/loans', headers=staff_headers)
    assert forbidden.status_code == 403


def test_customer_can_apply_for_and_view_only_their_own_loan():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()

    token_a = register_customer(client, nationalId='11111111', phoneNumber='0711111111').get_json()['accessToken']
    token_b = register_customer(client, fullName='Second Customer', nationalId='22222222', phoneNumber='0722222222').get_json()['accessToken']
    headers_a = {'Authorization': f'Bearer {token_a}'}
    headers_b = {'Authorization': f'Bearer {token_b}'}

    application = client.post('/api/customer/loans', json={
        'amount': 5000, 'interestRate': 10, 'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
        'purpose': 'Buy stock',
    }, headers=headers_a)
    assert application.status_code == 201
    loan_id = application.get_json()['loan']['id']

    own_view = client.get(f'/api/customer/loans/{loan_id}', headers=headers_a)
    assert own_view.status_code == 200

    other_view = client.get(f'/api/customer/loans/{loan_id}', headers=headers_b)
    assert other_view.status_code == 404

    own_list = client.get('/api/customer/loans', headers=headers_a).get_json()['loans']
    assert len(own_list) == 1
    other_list = client.get('/api/customer/loans', headers=headers_b).get_json()['loans']
    assert len(other_list) == 0


def test_customer_can_pay_own_loan_but_not_someone_elses():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    from tests.helpers import auth_headers
    staff_headers = auth_headers(client)

    token = register_customer(client, nationalId='33333333', phoneNumber='0733333333').get_json()['accessToken']
    me = client.get('/api/customer-auth/me', headers={'Authorization': f'Bearer {token}'}).get_json()['customer']

    # Staff approves and disburses a loan for this customer directly.
    loan = client.post('/api/loans', json={
        'customerId': me['id'], 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=staff_headers).get_json()['loan']
    client.post(f"/api/loans/{loan['id']}/approve", json={}, headers=staff_headers)
    client.post(f"/api/loans/{loan['id']}/disburse", json={}, headers=staff_headers)

    # Someone else's token can't even see this loan, let alone pay it.
    other_token = register_customer(client, fullName='Other', nationalId='44444444', phoneNumber='0744444444').get_json()['accessToken']
    blocked = client.post(f"/api/customer/loans/{loan['id']}/mpesa/stk-push", json={'amount': 50, 'phoneNumber': '0700000000'}, headers={'Authorization': f'Bearer {other_token}'})
    assert blocked.status_code == 404

    # The real owner gets a real (if unconfigured-in-tests) attempt, not a 404.
    owner_attempt = client.post(f"/api/customer/loans/{loan['id']}/mpesa/stk-push", json={'amount': 50, 'phoneNumber': '0700000000'}, headers={'Authorization': f'Bearer {token}'})
    assert owner_attempt.status_code == 503  # M-PESA not configured in tests, but ownership check passed


def test_change_own_pin():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    token = register_customer(client).get_json()['accessToken']
    headers = {'Authorization': f'Bearer {token}'}

    wrong_current = client.patch('/api/customer-auth/me/pin', json={'currentPin': 'wrong', 'newPin': '9999'}, headers=headers)
    assert wrong_current.status_code == 401

    changed = client.patch('/api/customer-auth/me/pin', json={'currentPin': '1234', 'newPin': '9999'}, headers=headers)
    assert changed.status_code == 200

    old_pin_login = client.post('/api/customer-auth/login', json={'identifier': '29481029', 'password': '1234'})
    assert old_pin_login.status_code == 401
    new_pin_login = client.post('/api/customer-auth/login', json={'identifier': '29481029', 'password': '9999'})
    assert new_pin_login.status_code == 200
