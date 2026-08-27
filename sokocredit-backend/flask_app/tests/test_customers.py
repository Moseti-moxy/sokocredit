import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db


def test_customers_are_persisted_and_listed():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()

    client = app.test_client()
    response = client.post('/api/customers', json={
        'name': 'Agnes Muthoni', 'phone': '0712 345 678', 'nationalId': '29481029',
        'business': 'Vegetables & Fruits', 'market': 'Wakulima Market', 'stall': 'Shed B-42',
        'dailyTurnover': 12000, 'dailyProfit': 3200,
    })

    assert response.status_code == 201
    customer = response.get_json()['customer']
    assert customer['phone'] == '254712345678'
    assert client.get('/api/customers').get_json()['customers'][0]['id'] == customer['id']
    assert client.post('/api/customers', json={
        'name': 'Duplicate', 'phone': '0712 345 678', 'nationalId': '99999999',
        'business': 'Retail', 'market': 'Wakulima Market', 'stall': 'Shed B-43', 'dailyTurnover': 1,
    }).status_code == 409
