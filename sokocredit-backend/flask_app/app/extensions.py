from flasgger import Swagger
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
limiter = Limiter(key_func=get_remote_address)
swagger = Swagger(
    config={**Swagger.DEFAULT_CONFIG, 'specs_route': '/apidocs/'},
    template={
        'info': {'title': 'SokoCredit API', 'version': '1.0.0'},
        'securityDefinitions': {
            'Bearer': {
                'type': 'apiKey',
                'name': 'Authorization',
                'in': 'header',
                'description': "JWT access token, prefixed with 'Bearer '. Get one from /api/auth/login or /api/auth/register.",
            },
        },
    },
)
