import asyncio
import json
from fastapi import APIRouter, Request, Query
from fastapi.templating import Jinja2Templates

from app.database import db, redis_client
from app.utils.cache import serialize_brands_models_cache
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory cache (for UI purposes)
brands_models_cache = {}
serialized_brands_models_cache = {}

def get_templates():
    from fastapi.templating import Jinja2Templates
    return Jinja2Templates(directory="app/templates")

async def initialize_cache():
    global brands_models_cache, serialized_brands_models_cache
    docs = await db["brands_models"].find().to_list(length=None)
    brands_models_cache = {}

    async def check_model(brand_id, model):
        model_name = model["model"]
        product_exists = await db["products"].find_one({
            "brand_id": brand_id,
            "model": model_name
        })
        if product_exists:
            return {"model": model_name, "model_image": model.get("model_image", "")}
        return None

    for doc in docs:
        brand_id = doc["_id"]
        brand_name = doc["brand"]
        models = doc.get("models", [])
        tasks = [check_model(brand_id, model) for model in models]
        results = await asyncio.gather(*tasks)
        valid_models = [r for r in results if r is not None]
        if valid_models:
            brands_models_cache[brand_name.lower()] = {
                "brand_id": brand_id,
                "models": valid_models
            }
    serialized_brands_models_cache = serialize_brands_models_cache(brands_models_cache)
    logger.info("Cached and serialized brands/models.")

@router.get("/")
async def home(
    request: Request,
    query: str = Query(None),
    brand: str = Query(None),
    model: str = Query(None)
):
    if not brands_models_cache:
        await initialize_cache()

    comparison_data = []

    # Handle different query parameters for fetching comparison data
    if brand == "all":
        tasks = [
            get_comparison_data(b, m["model"])
            for b, data in brands_models_cache.items()
            for m in data["models"]
        ]
        results = await asyncio.gather(*tasks)
        comparison_data = [r for r in results if r]
    elif brand and model:
        result = await get_comparison_data(brand.lower(), model)
        if result:
            comparison_data.append(result)
    elif brand:
        brand_data = brands_models_cache.get(brand.lower())
        if brand_data:
            tasks = [get_comparison_data(brand.lower(), m["model"]) for m in brand_data["models"]]
            results = await asyncio.gather(*tasks)
            comparison_data = [r for r in results if r]
    else:
        tasks = [
            get_comparison_data(b, m["model"])
            for b, data in brands_models_cache.items()
            for m in data["models"]
        ]
        results = await asyncio.gather(*tasks)
        comparison_data = [r for r in results if r]

    templates = get_templates()
    return templates.TemplateResponse("base.html", {
        "request": request,
        "comparison_data": comparison_data,
        "brands": list(brands_models_cache.keys()),
        "models_by_brand": serialized_brands_models_cache,
        "query": query,
        "selected_brand": brand,
        "selected_model": model
    })

async def get_cached_cheapest_product(brand_id: str, model: str):
    key = f"aggregate:{brand_id}_{model.lower()}"
    cached_value = await redis_client.get(key)
    if cached_value:
        return json.loads(cached_value)
    return None

async def get_comparison_data(brand: str, model: str):
    brand_data = brands_models_cache.get(brand)
    if not brand_data:
        return None
    cached_cheapest = await get_cached_cheapest_product(str(brand_data["brand_id"]), model)
    if cached_cheapest is None:
        cursor = db["products"].find({
            "brand_id": brand_data["brand_id"],
            "model": {"$regex": f"^{model}$", "$options": "i"}
        })
        products = await cursor.to_list(length=None)
        if not products:
            return None
        products.sort(key=lambda x: x.get("latest_price", {}).get("amount", 0))
        cached_cheapest = products[0]
    cursor = db["products"].find({
        "brand_id": brand_data["brand_id"],
        "model": {"$regex": f"^{model}$", "$options": "i"}
    })
    products = await cursor.to_list(length=None)
    products.sort(key=lambda x: x.get("latest_price", {}).get("amount", 0))
    price_comparison = [{
        "store": p.get("site_fetched").split(".")[0],
        "price": p.get("latest_price", {}).get("amount", 0),
        "product_url": p.get("product_url")
    } for p in products]
    return {
        "brand": brand,
        "model": model,
        "model_image": next((m["model_image"] for m in brand_data["models"] if m["model"].lower() == model.lower()), ""),
        "cheapest_price": cached_cheapest.get("latest_price", {}).get("amount", 0),
        "_id": str(cached_cheapest.get("_id")),
        "price_comparison": price_comparison
    }

def get_brand_from_cache(brands_models_cache, product_id=None, brand_id=None):
    """
    Get brand name from the brands_models_cache by either product_id or brand_id
    
    Returns the brand name with proper capitalization, or "Unknown" if not found
    """
    # If we have a brand_id, find the brand directly
    if brand_id:
        for brand_name, brand_data in brands_models_cache.items():
            if brand_data["brand_id"] == brand_id:
                # Return with proper capitalization (e.g., "samsung" -> "Samsung")
                return brand_name.capitalize()
    
    # If we have a product_id, find which brand contains this model
    if product_id:
        for brand_name, brand_data in brands_models_cache.items():
            # Check if this model_id exists in any brand's models
            if any(model.get("id") == product_id or str(model.get("_id")) == product_id 
                  for model in brand_data["models"]):
                return brand_name.capitalize()
    
    return "Unknown"