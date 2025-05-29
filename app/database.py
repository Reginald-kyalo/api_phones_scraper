from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from redis.asyncio import Redis
from app.config import settings

# MongoDB client and database
client: AsyncIOMotorClient = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
db: AsyncIOMotorDatabase = client[settings.DB_NAME]

# Redis client
redis_client = Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, decode_responses=True)

async def init_db():
    # Place any initialization code here if needed
    pass

async def close_db():
    client.close()
    await redis_client.close()
