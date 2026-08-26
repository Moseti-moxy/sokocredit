import os


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///sokocredit.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    AFRICAS_TALKING_USERNAME = os.getenv("AFRICAS_TALKING_USERNAME", "sandbox")
    AFRICAS_TALKING_API_KEY = os.getenv("AFRICAS_TALKING_API_KEY", "")
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


class ProductionConfig(BaseConfig):
    DEBUG = False


config = {
    "default": BaseConfig,
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
