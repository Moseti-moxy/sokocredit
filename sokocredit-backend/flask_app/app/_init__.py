import os
from dotenv import load_dotenv
from flask import Flask
from .extensions import cors, db, jwt, migrate

def create_app(test_config=None):
    load_dotenv()
    app = Flask(__name__)
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=os.getenv('DATABASE_URL', 'postgresql+psycopg2://sokocredit_user:change-this-password@localhost:5432/sokocredit'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY', 'development-only-change-me'),
    )
    if test_config:
        app.config.update(test_config)
        
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # ----------------------------------------------------
    # REGISTER BLUEPRINTS
    # ----------------------------------------------------
    # 1. Existing Loan & Core Routes
    from app.routes import api as api_blueprint
    app.register_blueprint(api_blueprint, url_prefix='/api')

    # 2. Person 4 Payment & Analytics Routes
    from app.routes.payments import payments_bp
    app.register_blueprint(payments_bp, url_prefix='/api')

    return app