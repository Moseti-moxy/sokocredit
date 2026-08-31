"""Shared test helpers. The first /api/auth/register call bootstraps an admin
account (see app/auth_routes.py) - the endpoint then closes itself, so any
further staff accounts a test needs must go through the admin-only
POST /api/users endpoint instead, same as in production.
"""


def auth_headers(client, email='admin@sokocredit.test'):
    response = client.post('/api/auth/register', json={
        'email': email, 'password': 'SuperSecret1', 'fullName': 'Test Admin',
    })
    token = response.get_json()['accessToken']
    return {'Authorization': f'Bearer {token}'}


def staff_headers(client, admin_headers, email, role='agent'):
    """Creates an additional staff account (admin-only endpoint) and logs in as them."""
    client.post('/api/users', json={
        'email': email, 'password': 'SuperSecret1', 'fullName': 'Test Staff', 'role': role,
    }, headers=admin_headers)
    response = client.post('/api/auth/login', json={'email': email, 'password': 'SuperSecret1'})
    token = response.get_json()['accessToken']
    return {'Authorization': f'Bearer {token}'}
