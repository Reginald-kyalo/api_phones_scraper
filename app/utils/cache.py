import json
import asyncio
from typing import Dict, Any, Optional
from app.database import db, redis_client
import logging

logger = logging.getLogger(__name__)

CACHE_KEY = "brands_models_cache"
CACHE_EXPIRY = 3600 * 24  # 24 hours

async def get_brands_models_cache() -> Dict[str, Any]:
    """Get brands models cache from Redis, with fallback to DB."""
    try:
        # Try Redis first
        cached_data = await redis_client.get(CACHE_KEY)
        if cached_data:
            logger.debug("Cache hit from Redis")
            return json.loads(cached_data)
        else:
            logger.info("Cache miss - building from database")
    except Exception as e:
        logger.warning(f"Redis cache miss: {e}")
    
    # Fallback to DB and cache result
    cache_data = await _build_cache_from_db()
    
    try:
        await redis_client.setex(CACHE_KEY, CACHE_EXPIRY, json.dumps(cache_data))
        logger.info(f"Cached {len(cache_data)} brands to Redis with {CACHE_EXPIRY}s expiry")
    except Exception as e:
        logger.warning(f"Failed to cache to Redis: {e}")
    
    return cache_data

async def _build_cache_from_db() -> Dict[str, Any]:
    """Build cache from database."""
    docs = await db["brands_models"].find().to_list(length=None)
    cache = {}
    
    logger.info(f"Building cache from {len(docs)} brand documents")
    
    async def check_model_exists(brand: str, model_data: dict) -> Optional[dict]:
        model_name = model_data["model"]
        product_exists = await db["phones"].find_one({
            "brand": brand.lower(),
            "model": model_name
        })
        if product_exists:
            return {"model": model_name, "model_image": model_data.get("model_image", "")}
        return None

    brands_with_no_models = []
    for doc in docs:
        brand = doc["brand"]
        models = doc.get("models", [])
        
        if not models:
            brands_with_no_models.append(f"{brand} (no models in DB)")
            continue
            
        tasks = [check_model_exists(brand, model) for model in models]
        results = await asyncio.gather(*tasks)
        valid_models = [r for r in results if r is not None]
        
        if valid_models:
            cache[brand.lower()] = {"models": valid_models}
        else:
            brands_with_no_models.append(f"{brand} (no matching phones)")
    
    logger.info(f"Built cache with {len(cache)} brands")
    if brands_with_no_models:
        logger.debug(f"Brands with no products yet: {brands_with_no_models}")
    
    return cache

async def invalidate_brands_models_cache():
    """Invalidate the cache."""
    try:
        await redis_client.delete(CACHE_KEY)
        logger.info("Brands models cache invalidated")
    except Exception as e:
        logger.error(f"Failed to invalidate cache: {e}")

async def refresh_brands_models_cache():
    """Force refresh the cache."""
    await invalidate_brands_models_cache()
    return await get_brands_models_cache()

async def get_cache_info():
    """Get cache information for debugging."""
    try:
        exists = await redis_client.exists(CACHE_KEY)
        if exists:
            ttl = await redis_client.ttl(CACHE_KEY)
            cached_data = await redis_client.get(CACHE_KEY)
            cache_size = len(json.loads(cached_data)) if cached_data else 0
            return {
                "cached": True,
                "ttl_seconds": ttl,
                "brands_count": cache_size,
                "expires_in_minutes": round(ttl / 60, 1) if ttl > 0 else "No expiry"
            }
        else:
            return {"cached": False}
    except Exception as e:
        logger.error(f"Error getting cache info: {e}")
        return {"error": str(e)}