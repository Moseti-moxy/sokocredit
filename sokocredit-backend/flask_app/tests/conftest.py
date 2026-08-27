import pytest
import os
import sys
import types

# Ensure the repository root is on sys.path so top-level packages (e.g. `tasks`) can be imported
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# If python-dotenv is not installed in the test environment, stub it so
# `from dotenv import load_dotenv` in the app does not fail.
if 'dotenv' not in sys.modules:
    try:
        import dotenv  # noqa: F401
    except Exception:
        sys.modules['dotenv'] = types.SimpleNamespace(load_dotenv=lambda *a, **k: None)

from app import create_app


@pytest.fixture
def app():
    test_config = {
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'FLASK_CREATE_ALL': True,
    }
    app = create_app(test_config)
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def env_admin_phone(monkeypatch):
    # ensure ADMIN_PHONE exists for scheduler tests
    monkeypatch.setenv('ADMIN_PHONE', '+254700000000')
    yield
