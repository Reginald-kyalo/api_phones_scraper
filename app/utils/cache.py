import json
import asyncio
from typing import Dict, Any, Optional
from app.database import redis_client, get_brands_models_collection, get_products_collection, PRODUCT_CATEGORIES
import logging

logger = logging.getLogger(__name__)

CACHE_KEY = "brands_models_cache"
CACHE_EXPIRY = 3600 * 24  # 24 hours

# Individual cache keys for each product category
CATEGORY_CACHE_KEYS = {
    "phones": "phones_brands_models_cache",
    "cosmetics": "cosmetics_brands_models_cache", 
    "laptops": "laptops_brands_models_cache",
    "shoes": "shoes_brands_models_cache",
    "sound_systems": "sound_systems_brands_models_cache"
}

async def get_brands_models_cache() -> Dict[str, Any]:
    """Get brands models cache from Redis, with fallback to DB - LEGACY for phones only."""
    return await get_category_brands_models_cache("phones")

async def get_category_brands_models_cache(category: str) -> Dict[str, Any]:
    """Get brands models cache for a specific category from Redis, with fallback to DB."""
    cache_key = CATEGORY_CACHE_KEYS.get(category, f"{category}_brands_models_cache")
    
    try:
        # Try Redis first
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit from Redis for {category}")
            return json.loads(cached_data)
        else:
            logger.info(f"Cache miss for {category} - building from database")
    except Exception as e:
        logger.warning(f"Redis cache miss for {category}: {e}")
    
    # Fallback to DB and cache result
    cache_data = await _build_cache_from_db(category)
    
    try:
        await redis_client.setex(cache_key, CACHE_EXPIRY, json.dumps(cache_data))
        logger.info(f"Cached {len(cache_data)} brands for {category} to Redis with {CACHE_EXPIRY}s expiry")
    except Exception as e:
        logger.warning(f"Failed to cache {category} to Redis: {e}")
    
    return cache_data

async def get_all_categories_cache() -> Dict[str, Dict[str, Any]]:
    """Get brands models cache for all product categories."""
    logger.info(f"Loading cache for all categories: {list(PRODUCT_CATEGORIES.keys())}")
    all_categories_cache = {}
    
    for category in PRODUCT_CATEGORIES.keys():
        logger.info(f"Processing cache for category: {category}")
        category_cache = await get_category_brands_models_cache(category)
        all_categories_cache[category] = category_cache
        
        # Log summary for each category
        brand_count = len(category_cache)
        total_models = sum(len(brand_data.get("models", [])) for brand_data in category_cache.values())
        logger.info(f"Category {category}: {brand_count} brands, {total_models} total models")
    
    logger.info(f"Completed loading cache for {len(all_categories_cache)} categories")
    return all_categories_cache

async def _build_cache_from_db(category: str = "phones") -> Dict[str, Any]:
    """Build cache from database for a specific product category."""
    brands_models_collection = await get_brands_models_collection(category)
    products_collection = await get_products_collection(category)
    
    if brands_models_collection is None or products_collection is None:
        logger.warning(f"Could not get collections for category: {category}")
        return {}
    
    docs = await brands_models_collection.find().to_list(length=None)
    cache = {}
    
    logger.info(f"Building {category} cache from {len(docs)} brand documents")
    
    # Log sample brand names from database for debugging
    if docs:
        sample_brands = [doc.get("brand", "Unknown") for doc in docs[:5]]
        logger.info(f"Sample brands from {category} database: {sample_brands}")
    else:
        logger.warning(f"No brand documents found in {category} database")
    
    async def check_model_exists(brand: str, model_data) -> Optional[dict]:
        # Handle different model data structures
        model_name = ""
        model_image = ""
        
        if isinstance(model_data, str):
            # Simple string model name
            model_name = model_data
        elif isinstance(model_data, dict):
            # Dictionary with model details
            model_name = model_data.get("model", model_data.get("name", ""))
            model_image = model_data.get("model_image", model_data.get("image", ""))
            
            # Handle additional fields for future use (submodels, type, variants)
            # These are preserved in the structure but not used in current logic
            extra_fields = {}
            for field in ["submodels", "type", "variants", "specifications", "features"]:
                if field in model_data:
                    extra_fields[field] = model_data[field]
        else:
            logger.warning(f"Unexpected model data type in {category}: {type(model_data)} - {model_data}")
            return None
            
        if not model_name:
            logger.warning(f"Empty model name in {category} for brand {brand}")
            return None
            
        # Check if product exists in the category's product collection
        try:
            product_exists = await products_collection.find_one({
                "brand": brand.lower(),
                "model": {"$regex": f"^{model_name}$", "$options": "i"}
            })
            if product_exists:
                result = {"model": model_name, "model_image": model_image}
                # Add extra fields if they exist (for future extensibility)
                if 'extra_fields' in locals() and extra_fields:
                    result["extra_fields"] = extra_fields
                return result
        except Exception as e:
            logger.warning(f"Error checking model existence for {brand}/{model_name} in {category}: {e}")
            
        return None

    brands_with_no_models = []
    for doc in docs:
        # Skip documents that don't have the expected structure
        if "brand" not in doc:
            logger.warning(f"Skipping document without 'brand' field in {category}: {doc.get('_id')}")
            continue
            
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
            brands_with_no_models.append(f"{brand} (no matching {category})")
    
    logger.info(f"Built {category} cache with {len(cache)} brands")
    
    # Log sample populated brands for debugging
    if cache:
        sample_populated_brands = list(cache.keys())[:5]
        logger.info(f"Sample populated brands in {category} cache: {sample_populated_brands}")
        
        # Log model counts for sample brands
        for brand in sample_populated_brands:
            model_count = len(cache[brand].get("models", []))
            logger.info(f"  - {brand}: {model_count} models")
    else:
        logger.warning(f"No brands populated in {category} cache!")
    
    if brands_with_no_models:
        logger.debug(f"{category.capitalize()} brands with no products yet: {brands_with_no_models}")
    
    return cache

async def invalidate_brands_models_cache():
    """Invalidate the cache - LEGACY for phones only."""
    await invalidate_category_cache("phones")

async def invalidate_category_cache(category: str):
    """Invalidate the cache for a specific category."""
    cache_key = CATEGORY_CACHE_KEYS.get(category, f"{category}_brands_models_cache")
    try:
        await redis_client.delete(cache_key)
        logger.info(f"{category.capitalize()} brands models cache invalidated")
    except Exception as e:
        logger.error(f"Failed to invalidate {category} cache: {e}")

async def invalidate_all_categories_cache():
    """Invalidate cache for all product categories."""
    for category in PRODUCT_CATEGORIES.keys():
        await invalidate_category_cache(category)

async def refresh_brands_models_cache():
    """Force refresh the cache - LEGACY for phones only."""
    return await refresh_category_cache("phones")

async def refresh_category_cache(category: str):
    """Force refresh the cache for a specific category."""
    await invalidate_category_cache(category)
    return await get_category_brands_models_cache(category)

async def refresh_all_categories_cache():
    """Force refresh cache for all product categories."""
    await invalidate_all_categories_cache()
    return await get_all_categories_cache()

async def get_cache_info():
    """Get cache information for debugging - LEGACY for phones only."""
    return await get_category_cache_info("phones")

async def get_category_cache_info(category: str):
    """Get cache information for a specific category for debugging."""
    cache_key = CATEGORY_CACHE_KEYS.get(category, f"{category}_brands_models_cache")
    try:
        exists = await redis_client.exists(cache_key)
        if exists:
            ttl = await redis_client.ttl(cache_key)
            cached_data = await redis_client.get(cache_key)
            cache_size = len(json.loads(cached_data)) if cached_data else 0
            return {
                "category": category,
                "cached": True,
                "ttl_seconds": ttl,
                "brands_count": cache_size,
                "expires_in_minutes": round(ttl / 60, 1) if ttl > 0 else "No expiry"
            }
        else:
            return {"category": category, "cached": False}
    except Exception as e:
        logger.error(f"Error getting {category} cache info: {e}")
        return {"category": category, "error": str(e)}

async def get_all_categories_cache_info():
    """Get cache information for all categories for debugging."""
    all_info = {}
    for category in PRODUCT_CATEGORIES.keys():
        all_info[category] = await get_category_cache_info(category)
    return all_info