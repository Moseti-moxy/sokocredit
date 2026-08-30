import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from tests.helpers import auth_headers


def _make_app():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    return app


def _make_loan(client, headers):
    application = client.post('/api/loans', json={
        'customerId': 'customer-1', 'amount': 100, 'interestRate': 10,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=headers).get_json()['loan']
    return application['id']


def _make_customer(client, headers):
    return client.post('/api/customers', json={
        'fullName': 'Jane Wanjiku', 'phoneNumber': '0700111222', 'nationalId': '55556666',
        'businessName': 'Test Biz', 'market': 'Test Market', 'stallNumber': 'Z-1', 'dailyTurnover': 1000,
    }, headers=headers).get_json()['customer']['id']


def test_add_and_list_inventory_items_include_computed_fields():
    app = _make_app()
    client = app.test_client()
    headers = auth_headers(client)
    loan_id = _make_loan(client, headers)
    client.post(f'/api/loans/{loan_id}/approve', json={}, headers=headers)
    client.post(f'/api/loans/{loan_id}/disburse', json={}, headers=headers)

    created = client.post(f'/api/loans/{loan_id}/inventory-items', json={
        'itemName': '20kg sack of maize flour', 'quantity': 5, 'unitCost': 500,
    }, headers=headers)
    assert created.status_code == 201
    item = created.get_json()['item']
    assert item['soldUnits'] == 0.0
    assert item['financedAmount'] == 100.0
    assert item['totalCost'] == 2500.0
    assert item['repaymentStatus'] == 'On Track'
    assert item['daysLeft'] is not None

    listed = client.get(f'/api/loans/{loan_id}/inventory-items', headers=headers)
    assert listed.status_code == 200
    assert len(listed.get_json()['items']) == 1


def test_update_inventory_item_sold_units_validates_bounds():
    app = _make_app()
    client = app.test_client()
    headers = auth_headers(client)
    loan_id = _make_loan(client, headers)
    item_id = client.post(f'/api/loans/{loan_id}/inventory-items', json={
        'itemName': 'Sacks', 'quantity': 5, 'unitCost': 500,
    }, headers=headers).get_json()['item']['id']

    ok = client.patch(f'/api/loans/{loan_id}/inventory-items/{item_id}', json={'soldUnits': 3}, headers=headers)
    assert ok.status_code == 200
    assert ok.get_json()['item']['soldUnits'] == 3.0

    too_many = client.patch(f'/api/loans/{loan_id}/inventory-items/{item_id}', json={'soldUnits': 6}, headers=headers)
    assert too_many.status_code == 400

    missing = client.patch(f'/api/loans/{loan_id}/inventory-items/does-not-exist', json={'soldUnits': 1}, headers=headers)
    assert missing.status_code == 404


def test_whatsapp_send_without_config_returns_503_and_logs_history():
    app = _make_app()
    client = app.test_client()
    headers = auth_headers(client)
    customer_id = _make_customer(client, headers)

    response = client.post('/api/whatsapp/send', json={
        'customerId': customer_id, 'message': 'Hello from SokoCredit',
    }, headers=headers)
    assert response.status_code == 503

    history = client.get(f'/api/whatsapp/history/{customer_id}', headers=headers)
    assert history.status_code == 200
    messages = history.get_json()['messages']
    assert len(messages) == 1
    assert messages[0]['status'] == 'FAILED'


def test_credit_score_includes_outstanding_balance():
    app = _make_app()
    client = app.test_client()
    headers = auth_headers(client)
    customer_id = _make_customer(client, headers)

    no_history = client.get(f'/api/customers/{customer_id}/credit-score', headers=headers)
    assert no_history.get_json()['outstandingBalance'] == 0

    application = client.post('/api/loans', json={
        'customerId': customer_id, 'amount': 100, 'interestRate': 10,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=headers).get_json()['loan']
    loan_id = application['id']
    client.post(f'/api/loans/{loan_id}/approve', json={}, headers=headers)
    client.post(f'/api/loans/{loan_id}/disburse', json={}, headers=headers)
    client.post(f'/api/loans/{loan_id}/repayments', json={'amount': 40}, headers=headers)

    with_history = client.get(f'/api/customers/{customer_id}/credit-score', headers=headers)
    assert with_history.get_json()['outstandingBalance'] == 70.0


def test_whatsapp_send_requires_existing_customer():
    app = _make_app()
    client = app.test_client()
    headers = auth_headers(client)

    response = client.post('/api/whatsapp/send', json={
        'customerId': 'does-not-exist', 'message': 'Hi',
    }, headers=headers)
    assert response.status_code == 404
