import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify

from .extensions import cors, db, jwt, migrate
from werkzeug.exceptions import HTTPException
from flask import jsonify


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

    # local customer blueprint (may be added by local changes)
    try:
        from customers import customers_bp  # type: ignore
        from customers import models as customer_models  # type: ignore
        app.register_blueprint(customers_bp)
    except Exception:
        # not all branches include customers blueprint; continue gracefully
        app.logger.debug('No customers blueprint available.')

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)

    # register CLI commands
    try:
        from . import cli as _cli
        app.cli.add_command(_cli.send_overdue_reminders)
    except Exception:
        app.logger.debug('No CLI commands to register.')

    # Centralized JSON error handlers
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        response = e.get_response()
        return jsonify(error=e.description), e.code

    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.exception('Unhandled exception: %s', e)
        return jsonify(error='Internal server error'), 500

    # In development or when explicitly requested, create DB tables
    # Use config ENV for Flask 3 compatibility instead of removed `app.env` attribute.
    if app.config.get('FLASK_CREATE_ALL', False) or app.config.get('ENV') == 'development' or os.getenv('FLASK_ENV') == 'development':
        with app.app_context():
            db.create_all()

    return app
