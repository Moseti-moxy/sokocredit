import os

from dotenv import load_dotenv
from flask import Flask

from .extensions import cors, db, jwt, migrate


def create_app(test_config=None):
    if not test_config:
        load_dotenv()
    app = Flask(__name__)
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=os.getenv('DATABASE_URL', 'postgresql+psycopg2://sokocredit_user:change-this-password@localhost:5432/sokocredit'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY', 'development-only-change-me'),
        MPESA_ENV=os.getenv('MPESA_ENV', 'sandbox'),
        MPESA_CONSUMER_KEY=os.getenv('MPESA_CONSUMER_KEY'),
        MPESA_CONSUMER_SECRET=os.getenv('MPESA_CONSUMER_SECRET'),
        MPESA_SHORTCODE=os.getenv('MPESA_SHORTCODE'),
        MPESA_PASSKEY=os.getenv('MPESA_PASSKEY'),
        MPESA_CALLBACK_URL=os.getenv('MPESA_CALLBACK_URL'),
        MPESA_TRANSACTION_TYPE=os.getenv('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline'),
    )
    if test_config:
        app.config.update(test_config)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': '*'}})

    from . import models  # Register SQLAlchemy models before Flask-Migrate discovers them.
    from .routes import api
    app.register_blueprint(api)
    return app
