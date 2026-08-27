import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify

from .extensions import cors, db, jwt, migrate


def create_app(test_config=None):
    if not test_config:
        load_dotenv()
    app = Flask(__name__)
    default_db_url = os.getenv('DATABASE_URL', 'sqlite:///sokocredit.db')
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=default_db_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY', 'development-only-change-me'),
        MPESA_ENV=os.getenv('MPESA_ENV', 'sandbox'),
        MPESA_CONSUMER_KEY=os.getenv('MPESA_CONSUMER_KEY'),
        MPESA_CONSUMER_SECRET=os.getenv('MPESA_CONSUMER_SECRET'),
        MPESA_SHORTCODE=os.getenv('MPESA_SHORTCODE'),
        MPESA_PASSKEY=os.getenv('MPESA_PASSKEY'),
        MPESA_CALLBACK_URL=os.getenv('MPESA_CALLBACK_URL'),
        MPESA_TRANSACTION_TYPE=os.getenv('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline'),
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(minutes=30),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=30),
        JWT_BLOCKLIST_ENABLED=True,
        JWT_BLOCKLIST_TOKEN_CHECKS=['access', 'refresh'],
    )
    if test_config:
        app.config.update(test_config)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': '*'}})

    from . import models  # Register SQLAlchemy models before Flask-Migrate discovers them.
    from .models import TokenBlocklist

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        return db.session.query(TokenBlocklist.id).filter_by(jti=jwt_payload['jti']).first() is not None

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify(error='Token has expired.'), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return jsonify(error='Invalid token.'), 422

    @jwt.unauthorized_loader
    def missing_token_callback(reason):
        return jsonify(error='Missing authorization token.'), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify(error='Token has been revoked.'), 401

    from .auth_routes import auth_bp
    from .routes import api
    from .user_routes import users_bp
    app.register_blueprint(api)
    from customers import customers_bp
    from customers import models as customer_models
    app.register_blueprint(customers_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)

    with app.app_context():
        db.create_all()

    return app
