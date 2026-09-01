import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from tests.helpers import auth_headers


def test_customer_creation_reports_missing_encryption_configuration(monkeypatch):
    monkeypatch.delenv('FIELD_ENCRYPTION_KEY', raising=False)
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()

    client = app.test_client()
    headers = auth_headers(client)
    response = client.post('/api/customers', json={
        'fullName': 'Amina Wanjiku', 'phoneNumber': '0712345678', 'nationalId': '29481029',
        'businessName': 'Fresh Produce', 'market': 'Wakulima', 'stallNumber': 'B-12', 'dailyTurnover': 1200,
    }, headers=headers)

    assert response.status_code == 503
    assert response.get_json()['error'] == 'The customer data service is temporarily unavailable. Please contact support.'
