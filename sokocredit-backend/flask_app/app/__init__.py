import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify

from .extensions import cors, db, jwt, migrate, swagger


def create_app(test_config=None):
    if not test_config:
        load_dotenv()
    app = Flask(__name__)
    default_db_url = os.getenv('DATABASE_URL', 'sqlite:///sokocredit.db')
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=default_db_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY', 'development-only-change-me'),
        # File uploads (customer ID/permit documents) - was previously referenced
        # by customers/storage.py but never actually set, so uploads 500'd.
        UPLOAD_FOLDER=os.getenv('UPLOAD_FOLDER', os.path.join(app.instance_path, 'uploads')),
        MPESA_ENV=os.getenv('MPESA_ENV', 'sandbox'),
        MPESA_CONSUMER_KEY=os.getenv('MPESA_CONSUMER_KEY'),
        MPESA_CONSUMER_SECRET=os.getenv('MPESA_CONSUMER_SECRET'),
        MPESA_SHORTCODE=os.getenv('MPESA_SHORTCODE'),
        MPESA_PASSKEY=os.getenv('MPESA_PASSKEY'),
        MPESA_CALLBACK_URL=os.getenv('MPESA_CALLBACK_URL'),
        MPESA_TRANSACTION_TYPE=os.getenv('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline'),
        # Airtel Money (app/airtel.py)
        AIRTEL_BASE_URL=os.getenv('AIRTEL_BASE_URL'),
        AIRTEL_CLIENT_ID=os.getenv('AIRTEL_CLIENT_ID'),
        AIRTEL_CLIENT_SECRET=os.getenv('AIRTEL_CLIENT_SECRET'),
        AIRTEL_COUNTRY=os.getenv('AIRTEL_COUNTRY', 'KE'),
        AIRTEL_CURRENCY=os.getenv('AIRTEL_CURRENCY', 'KES'),
        AIRTEL_CALLBACK_SECRET=os.getenv('AIRTEL_CALLBACK_SECRET'),
        # Stripe (app/stripe_client.py)
        STRIPE_SECRET_KEY=os.getenv('STRIPE_SECRET_KEY'),
        STRIPE_WEBHOOK_SECRET=os.getenv('STRIPE_WEBHOOK_SECRET'),
        # SMS via Africa's Talking, WhatsApp via Meta Cloud API (app/notifications.py)
        AFRICASTALKING_ENV=os.getenv('AFRICASTALKING_ENV', 'sandbox'),
        AFRICASTALKING_USERNAME=os.getenv('AFRICASTALKING_USERNAME'),
        AFRICASTALKING_API_KEY=os.getenv('AFRICASTALKING_API_KEY'),
        AFRICASTALKING_SENDER_ID=os.getenv('AFRICASTALKING_SENDER_ID'),
        WHATSAPP_ACCESS_TOKEN=os.getenv('WHATSAPP_ACCESS_TOKEN'),
        WHATSAPP_PHONE_NUMBER_ID=os.getenv('WHATSAPP_PHONE_NUMBER_ID'),
        WHATSAPP_API_VERSION=os.getenv('WHATSAPP_API_VERSION', 'v20.0'),
        # Credit Reference Bureau (app/crb.py) - requires a signed data-sharing
        # agreement with a licensed bureau; unset until you have one.
        CRB_PROVIDER=os.getenv('CRB_PROVIDER'),
        CRB_API_BASE_URL=os.getenv('CRB_API_BASE_URL'),
        CRB_API_KEY=os.getenv('CRB_API_KEY'),
        # Business registry (app/business_registry.py) - requires an eCitizen/BRS
        # API consumer agreement; unset until you have one.
        BRS_API_BASE_URL=os.getenv('BRS_API_BASE_URL'),
        BRS_API_KEY=os.getenv('BRS_API_KEY'),
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(minutes=30),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=30),
        JWT_BLOCKLIST_ENABLED=True,
        JWT_BLOCKLIST_TOKEN_CHECKS=['access', 'refresh'],
    )
    if test_config:
        app.config.update(test_config)
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': '*'}})
    swagger.init_app(app)

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

    from .analytics_routes import analytics
    from .auth_routes import auth_bp
    from .groups_routes import groups
    from .reminders_routes import reminders
    from .risk_routes import risk
    from .routes import api
    from .user_routes import users_bp
    app.register_blueprint(api)
    from customers import customers_bp
    from customers import models as customer_models
    app.register_blueprint(customers_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(analytics)
    app.register_blueprint(risk)
    app.register_blueprint(reminders)
    app.register_blueprint(groups)

    return app
