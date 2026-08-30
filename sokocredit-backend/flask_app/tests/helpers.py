"""Shared test helpers. The first /api/auth/register call bootstraps an admin
account (see app/auth_routes.py), so tests that hit protected endpoints use
this helper to get a valid bearer token instead of duplicating the
register-then-extract-token boilerplate everywhere.
"""


def auth_headers(client, email='admin@sokocredit.test'):
    response = client.post('/api/auth/register', json={
        'email': email, 'password': 'SuperSecret1', 'fullName': 'Test Admin',
    })
    token = response.get_json()['accessToken']
    return {'Authorization': f'Bearer {token}'}
