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
    cors.init_app(app, resources={r'/api/*': {'origins': '*'}})

    from . import models  # Register SQLAlchemy models before Flask-Migrate discovers them.
    from .routes import api
    app.register_blueprint(api)
    from customers import customers_bp
    from customers import models as customer_models
    app.register_blueprint(customers_bp)
    return app
