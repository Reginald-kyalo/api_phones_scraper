from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "your_secret_key"
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "phone_products"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True

settings = Settings()
