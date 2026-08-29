import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app.geo import haversine_km, optimize_route
from app.i18n import t
from tests.helpers import auth_headers


def test_i18n_returns_swahili_and_english():
    assert 'Mteja' in t('customer_not_found', 'sw')
    assert 'Customer' in t('customer_not_found', 'en')


def test_route_optimization_orders_by_nearest_neighbour():
    start = {'latitude': -1.2833, 'longitude': 36.8167}  # Nairobi CBD
    stops = [
        {'id': 'far', 'latitude': -1.5, 'longitude': 37.0},
        {'id': 'near', 'latitude': -1.29, 'longitude': 36.82},
    ]
    ordered, total_km = optimize_route(start, stops)
    assert ordered[0]['id'] == 'near'
    assert ordered[1]['id'] == 'far'
    assert total_km > 0


def test_audit_log_written_on_customer_create():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    headers = auth_headers(client)
    client.post('/api/customers', json={
        'fullName': 'Audit Test', 'phoneNumber': '0700111222', 'nationalId': '55556666',
        'businessName': 'Test Biz', 'market': 'Test Market', 'stallNumber': 'Z-1', 'dailyTurnover': 1000,
    }, headers=headers)
    with app.app_context():
        from app.models import AuditLog
        actions = [a.action for a in AuditLog.query.all()]
        assert 'CREATE_CUSTOMER' in actions


def test_dashboard_reports_portfolio_metrics():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    headers = auth_headers(client)
    client.post('/api/loans', json={
        'customerId': 'dash-customer', 'amount': 500, 'interestRate': 5,
        'duration': 1, 'durationUnit': 'months', 'repaymentFrequency': 'monthly',
    }, headers=headers)
    dashboard = client.get('/api/analytics/dashboard', headers=headers)
    assert dashboard.status_code == 200
    data = dashboard.get_json()
    assert data['totalLoans'] == 1
    assert data['pendingApplications'] == 1


def test_risk_scan_creates_alert_for_overdue_loan():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    headers = auth_headers(client)
    loan = client.post('/api/loans', json={
        'customerId': 'risk-customer', 'amount': 100, 'interestRate': 0,
        'duration': 1, 'durationUnit': 'days', 'repaymentFrequency': 'daily',
    }, headers=headers).get_json()['loan']
    client.post(f"/api/loans/{loan['id']}/approve", json={}, headers=headers)
    from datetime import datetime, timedelta
    backdated = (datetime.now().astimezone() - timedelta(days=10)).isoformat()
    client.post(f"/api/loans/{loan['id']}/disburse", json={'disbursedAt': backdated}, headers=headers)

    scan = client.post('/api/risk/scan', json={}, headers=headers)
    assert scan.status_code == 200
    assert scan.get_json()['created'] >= 1

    alerts = client.get('/api/risk/alerts', headers=headers).get_json()['alerts']
    assert any(a['loanId'] == loan['id'] for a in alerts)


def test_group_lending_add_and_remove_member():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://'})
    with app.app_context():
        db.create_all()
    client = app.test_client()
    headers = auth_headers(client)
    customer = client.post('/api/customers', json={
        'fullName': 'Group Member', 'phoneNumber': '0700333444', 'nationalId': '77778888',
        'businessName': 'Group Biz', 'market': 'Group Market', 'stallNumber': 'G-1', 'dailyTurnover': 2000,
    }, headers=headers).get_json()['customer']
    group = client.post('/api/groups', json={'name': 'Test Chama'}, headers=headers).get_json()['group']

    added = client.post(f"/api/groups/{group['id']}/members/{customer['id']}", headers=headers)
    assert added.status_code == 200
    assert added.get_json()['group']['memberCount'] == 1

    removed = client.delete(f"/api/groups/{group['id']}/members/{customer['id']}", headers=headers)
    assert removed.status_code == 200
    assert removed.get_json()['group']['memberCount'] == 0
