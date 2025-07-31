from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import server_api
from redis.asyncio import Redis
from app.config import settings
import os

mongo_uri = os.getenv("MONGO_URI", settings.MONGO_URI)
redis_url = os.getenv("REDIS_URL", settings.REDIS_URL)
# MongoDB client and database
client: AsyncIOMotorClient = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=5000)
db: AsyncIOMotorDatabase = client[settings.DB_NAME]

# Redis client
redis_client: Redis = Redis.from_url(
    redis_url,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5
)
#redis_client = Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, decode_responses=True)

async def init_db():
    try:
        # Test MongoDB connection
        await client.admin.command('ping')
        print("MongoDB connection successful")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
    
    try:
        # Test Redis connection
        await redis_client.ping()
        print("Redis connection successful")
    except Exception as e:
        print(f"Redis connection failed: {e}")

async def close_db():
    client.close()
    await redis_client.close()
