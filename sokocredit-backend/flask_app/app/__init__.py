import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify

from .extensions import cors, db, jwt, limiter, migrate, swagger


def create_app(test_config=None):
    if not test_config:
        load_dotenv()
    app = Flask(__name__)
    default_db_url = os.getenv('DATABASE_URL', 'sqlite:///sokocredit.db')
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=default_db_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY', 'development-only-change-me'),
        # Comma-separated list of allowed frontend origins. Defaults to the
        # local Vite dev server so local dev keeps working out of the box;
        # set this explicitly to your deployed frontend origin(s) in
        # production instead of leaving CORS open to '*'.
        CORS_ORIGINS=[
            origin.strip()
            for origin in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
            if origin.strip()
        ],
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
        # Disabled under TESTING: the limiter's in-memory storage is a
        # process-wide singleton shared across every create_app() call in a
        # test run, so back-to-back tests hitting /login or /register would
        # otherwise trip each other's rate limit.
        RATELIMIT_ENABLED=not test_config,
    )
    if test_config:
        app.config.update(test_config)
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': app.config['CORS_ORIGINS']}})
    swagger.init_app(app)
    # In-memory storage is per-process; fine for a single dev/test process but
    # only rate-limits per gunicorn worker in production (2 workers per
    # render.yaml). Good enough as a first line of defense - swap for a
    # shared Redis storage_uri if that granularity becomes a problem.
    limiter.init_app(app)

    from .security import SecurityConfigurationError

    @app.errorhandler(SecurityConfigurationError)
    def security_configuration_error(_error):
        # Never expose key names or stack traces to clients. A missing key is a
        # deployment/readiness problem, not a bad customer submission.
        return jsonify(error='The customer data service is temporarily unavailable. Please contact support.'), 503

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
    from .customer_auth_routes import customer_auth
    from .geofence_routes import geofence
    from .customer_portal_routes import customer_portal
    from .groups_routes import groups
    from .notification_routes import notifications_bp
    from .reminders_routes import reminders
    from .risk_routes import risk
    from .routes import api
    from .user_routes import users_bp
    from .whatsapp_routes import whatsapp
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
    app.register_blueprint(customer_auth)
    app.register_blueprint(geofence)
    app.register_blueprint(customer_portal)
    app.register_blueprint(whatsapp)
    app.register_blueprint(notifications_bp)

    from cli import send_overdue_reminders
    app.cli.add_command(send_overdue_reminders)

    return app
