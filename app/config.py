from pydantic_settings import BaseSettings
import os
import secrets
from datetime import datetime, timedelta

# Load environment variables from .env file

class Settings(BaseSettings):
    HOST: str = "127.0.0.1"  # Default host
    PORT: int = 8000
    DEBUG: bool = True
    # Database settings
    MONGODB_HOST: str = os.getenv("MONGO_URI")
    #MONGODB_URI: str = "mongodb://root:mongodbmypass%21@localhost:27017/?tls=true&tlsCertificateKeyFile=/etc/ssl/mongodb.pem&tlsCAFile=/etc/ssl/ca.crt"
    DB_NAME: str = os.getenv("DB_NAME", "phone_products")
    
    # Secret key settings
    PRIMARY_SECRET_KEY: str = os.getenv("PRIMARY_SECRET_KEY", "development-key-not-for-production")
    SECONDARY_SECRET_KEY: str = os.getenv("SECONDARY_SECRET_KEY", "")
    KEY_ROTATION_INTERVAL_DAYS: int = int(os.getenv("KEY_ROTATION_INTERVAL_DAYS", "30"))
    LAST_ROTATION_DATE: str = os.getenv("LAST_ROTATION_DATE", datetime.now().isoformat())
    
    # Redis connection settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    
    # Email settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "dealsonline")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "reginald.kyalo@gmail.com")
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
