try:
	from flask_cors import CORS
except Exception:  # pragma: no cover - fallback for test environments without flask_cors
	class CORS:  # minimal no-op replacement
		def __init__(self, *args, **kwargs):
			pass

		def init_app(self, app, **kwargs):
			return None

try:
	from flask_jwt_extended import JWTManager
except Exception:  # pragma: no cover - fallback for test environments
	class JWTManager:
		def __init__(self, *args, **kwargs):
			pass

		def init_app(self, app):
			return None

try:
	from flask_migrate import Migrate
except Exception:  # pragma: no cover - fallback for test environments
	class Migrate:
		def __init__(self, *args, **kwargs):
			pass

		def init_app(self, app, db=None):
			return None

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
