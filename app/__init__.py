from flask import Flask, jsonify

from extensions import db
from .config import config
from models.loan import Loan
from models.payment import Payment
from routes.payments import payments_bp


def create_app(config_name: str | None = None):
    app = Flask(__name__)
    app.config.from_object(config[config_name or "default"])

    db.init_app(app)

    @app.get("/")
    def index():
        return {"status": "ok", "service": "sokocredit"}

    @app.errorhandler(400)
    def handle_bad_request(error):
        return jsonify({"success": False, "error": "Bad request"}), 400

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({"success": False, "error": "Resource not found"}), 404

    @app.errorhandler(500)
    def handle_server_error(error):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    app.register_blueprint(payments_bp)

    with app.app_context():
        db.create_all()

    return app
