from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import server_api
from redis.asyncio import Redis
from app.config import settings
from dotenv import load_dotenv
import os

load_dotenv()

redis_url = os.getenv("REDIS_URL")
mongo_uri = os.getenv("MONGO_URI")
# MongoDB client and database
client: AsyncIOMotorClient = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=5000)
db: AsyncIOMotorDatabase = client[settings.DB_NAME]
phones_db: AsyncIOMotorDatabase = client["phones_db"]
cosmetics_db: AsyncIOMotorDatabase = client["cosmetics_db"]
laptops_db: AsyncIOMotorDatabase = client["laptops_db"]
shoes_db: AsyncIOMotorDatabase = client["shoes_db"]
sound_systems_db: AsyncIOMotorDatabase = client["sound_systems_db"]

# Product categories mapping
PRODUCT_CATEGORIES = {
    "phones": {"db": phones_db, "collection": "phones"},
    "cosmetics": {"db": cosmetics_db, "collection": "cosmetics"},
    "laptops": {"db": laptops_db, "collection": "laptops"},
    "shoes": {"db": shoes_db, "collection": "shoes"},
    "sound_systems": {"db": sound_systems_db, "collection": "sound_systems"}
}

# Redis client
redis_client: Redis = Redis.from_url(
    redis_url,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5
)
#redis_client = Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, decode_responses=True)

async def get_brands_models_collection(category: str):
    """Get the brands_models collection for a specific product category."""
    # For all categories, use the pattern: {category}_brands_models
    category_db = PRODUCT_CATEGORIES.get(category, {}).get("db")
    if category_db is not None:
        return category_db[f"{category}_brands_models"]
    return None

async def get_products_collection(category: str):
    """Get the products collection for a specific product category."""
    category_info = PRODUCT_CATEGORIES.get(category)
    if category_info is not None:
        return category_info["db"][category_info["collection"]]
    return None

async def init_db():
    try:
        # Test MongoDB connection
        await client.admin.command('ping')
        print("MongoDB connection successful")
        
        # Test connections to all product category databases
        for category, info in PRODUCT_CATEGORIES.items():
            try:
                await info["db"].command('ping')
                print(f"{category.capitalize()} database connection successful")
                
                # Check document counts for debugging
                brands_models_collection = info["db"][f"{category}_brands_models"]
                products_collection = info["db"][info["collection"]]
                
                brands_count = await brands_models_collection.count_documents({})
                products_count = await products_collection.count_documents({})
                
                print(f"  - {category}_brands_models collection: {brands_count} documents")
                print(f"  - {category} products collection: {products_count} documents")
                
            except Exception as e:
                print(f"{category.capitalize()} database connection failed: {e}")
                
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
