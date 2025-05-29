from pydantic_settings import BaseSettings
from datetime import datetime

class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Database settings
    MONGO_URI: str = "mongodb://root:mongodbmypass!@localhost:27017/?tls=true&tlsCertificateKeyFile=/etc/ssl/mongodb.pem&tlsCAFile=/etc/ssl/ca.crt"
    DB_NAME: str = "phone_products"
    
    # Secret key settings
    PRIMARY_SECRET_KEY: str = "development-key-not-for-production"
    SECONDARY_SECRET_KEY: str = ""
    KEY_ROTATION_INTERVAL_DAYS: int = 30
    LAST_ROTATION_DATE: str = datetime.now().isoformat()
    
    # Redis connection settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    
    # Email settings
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = "dealsonline"
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    EMAIL_FROM: str = "reginald.kyalo@gmail.com"
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

    # Helper property to access the current active key
    @property
    def SECRET_KEY(self) -> str:
        return self.PRIMARY_SECRET_KEY
    
    # List of valid keys (for token verification)
    @property
    def VALID_SECRET_KEYS(self) -> list:
        keys = [self.PRIMARY_SECRET_KEY]
        if self.SECONDARY_SECRET_KEY:
            keys.append(self.SECONDARY_SECRET_KEY)
        return keys
    
    # Check if key rotation is needed
    @property
    def rotation_needed(self) -> bool:
        try:
            last_rotation = datetime.fromisoformat(self.LAST_ROTATION_DATE)
            days_since_rotation = (datetime.now() - last_rotation).days
            return days_since_rotation >= self.KEY_ROTATION_INTERVAL_DAYS
        except (ValueError, TypeError):
            return True  # If date parsing fails, trigger rotation

settings = Settings()
