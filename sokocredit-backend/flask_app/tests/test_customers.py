import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from tests.helpers import auth_headers


def test_customers_are_persisted_and_listed():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()

    client = app.test_client()
    headers = auth_headers(client)
    response = client.post('/api/customers', json={
        'name': 'Agnes Muthoni', 'phone': '0712 345 678', 'nationalId': '29481029',
        'business': 'Vegetables & Fruits', 'market': 'Wakulima Market', 'stall': 'Shed B-42',
        'dailyTurnover': 12000, 'dailyProfit': 3200,
    }, headers=headers)

    assert response.status_code == 201
    customer = response.get_json()['customer']
    assert customer['phone'] == '254712345678'
    assert client.get('/api/customers', headers=headers).get_json()['customers'][0]['id'] == customer['id']
    assert client.post('/api/customers', json={
        'name': 'Duplicate', 'phone': '0712 345 678', 'nationalId': '99999999',
        'business': 'Retail', 'market': 'Wakulima Market', 'stall': 'Shed B-43', 'dailyTurnover': 1,
    }, headers=headers).status_code == 409


def test_customer_endpoints_require_authentication():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()

    client = app.test_client()
    assert client.get('/api/customers').status_code == 401
    assert client.post('/api/customers', json={'name': 'X'}).status_code == 401


def test_search_matches_name_and_exact_phone():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    headers = auth_headers(client)
    client.post('/api/customers', json={
        'name': 'Beatrice Wanjiku', 'phone': '0722111222', 'nationalId': '11112222',
        'business': 'Fresh Fish', 'market': 'Gikomba', 'stall': 'A-1', 'dailyTurnover': 3000,
    }, headers=headers)

    by_name = client.get('/api/customers?search=Beatrice', headers=headers).get_json()['customers']
    assert len(by_name) == 1

    by_phone = client.get('/api/customers?search=0722111222', headers=headers).get_json()['customers']
    assert len(by_phone) == 1
