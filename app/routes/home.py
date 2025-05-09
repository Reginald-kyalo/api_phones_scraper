import asyncio
import json
from fastapi import APIRouter, Request, Query
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
import Levenshtein  # Make sure to install this: pip install python-Levenshtein

from app.database import db, redis_client
from app.utils.search import search_brands_and_models, normalize_text
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory cache (for UI purposes)
brands_models_cache = {}

def get_templates():
    from fastapi.templating import Jinja2Templates
    return Jinja2Templates(directory="app/templates")

async def initialize_cache():
    global brands_models_cache
    docs = await db["brands_models"].find().to_list(length=None)
    brands_models_cache = {}

    async def check_model_name_image(brand, models):
        model_name = models["model"]
        product_exists = await db["phones"].find_one({
            "brand": brand.lower(),
            "model": model_name
        })
        if product_exists:
            return {"model": model_name, "model_image": models.get("model_image", "")}
        return None

    for doc in docs:
        brand = doc["brand"]
        models = doc.get("models", [])
        tasks = [check_model_name_image(brand, model) for model in models]
        results = await asyncio.gather(*tasks)
        valid_models = [r for r in results if r is not None]
        if valid_models:
            brands_models_cache[brand.lower()] = {
                "models": valid_models
            }
    logger.info("Cached brands/models.")

# Add these functions near your other cache functions
async def get_cached_search(query: str):
    """Get cached search results."""
    key = f"search:{normalize_text(query)}"
    cached_value = await redis_client.get(key)
    if cached_value:
        return json.loads(cached_value)
    return None

async def cache_search_results(query: str, results: dict, expire_seconds: int = 3600):
    """Cache search results with expiration."""
    key = f"search:{normalize_text(query)}"
    await redis_client.setex(key, expire_seconds, json.dumps(results))

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
    search_results = None

    # Handle search query parameter
    if query and not brand and not model:
        # Try getting from cache first
        search_results = await get_cached_search(query)
        
        # If not in cache, perform the search and cache it
        if not search_results:
            search_results = search_brands_and_models(query, brands_models_cache)
            await cache_search_results(query, search_results)
        
        # If we have exact brand matches or high-confidence matches
        brand_matches = search_results["brands"]
        if brand_matches and brand_matches[0]["score"] >= 0.8:
            # Use the highest-scoring brand
            brand = brand_matches[0]["brand"]
        
        # If we have exact model matches (with brand)
        model_matches = search_results["models"]
        if model_matches and model_matches[0]["score"] >= 0.9:
            # Use the highest-scoring model and its brand
            brand = model_matches[0]["brand"]
            model = model_matches[0]["model"]

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
    elif search_results:
        # No definitive match but we have search results, return top results
        top_brand_results = [match["brand"] for match in search_results["brands"][:3]]
        top_model_results = search_results["models"][:5]
        
        # Fetch data for top brand results
        brand_tasks = []
        for top_brand in top_brand_results:
            brand_data = brands_models_cache.get(top_brand.lower())
            if brand_data:
                for m in brand_data["models"][:2]:  # Just get first 2 models per brand
                    brand_tasks.append(get_comparison_data(top_brand.lower(), m["model"]))
        
        # Fetch data for top model results
        model_tasks = [
            get_comparison_data(model_result["brand"], model_result["model"])
            for model_result in top_model_results
        ]

        # Combine results and get unique items
        all_tasks = brand_tasks + model_tasks
        if all_tasks:
            results = await asyncio.gather(*all_tasks)
            comparison_data = [r for r in results if r]
    else:
        # Default to showing a sampling of data
        sample_tasks = []
        for brand, brand_data in list(brands_models_cache.items())[:3]:
            for model in brand_data["models"][:2]:
                sample_tasks.append(get_comparison_data(brand, model["model"]))
        
        results = await asyncio.gather(*sample_tasks)
        comparison_data = [r for r in results if r]

    templates = get_templates()
    return templates.TemplateResponse("base.html", {
        "request": request,
        "comparison_data": comparison_data,
        "brands": list(brands_models_cache.keys()),
        "models_by_brand": brands_models_cache,
        "query": query,
        "selected_brand": brand,
        "selected_model": model,
        "search_results": search_results
    })

async def get_cached_cheapest_product(brand: str, model: str):
    key = f"aggregate:{brand}_{model.lower()}"
    cached_value = await redis_client.get(key)
    if cached_value:
        return json.loads(cached_value)
    return None

async def get_comparison_data(brand: str, model: str):
    brand_data = brands_models_cache.get(brand.lower())
    if not brand_data:
        return None
    cached_cheapest = await get_cached_cheapest_product(brand, model)
    if cached_cheapest is None:
        cursor = db["phones"].find({
            "brand": brand,
            "model": {"$regex": f"^{model}$", "$options": "i"}
        })
        phones = await cursor.to_list(length=None)
        if not phones:
            return None
        phones.sort(key=lambda x: x.get("latest_price", {}).get("amount", 0))
        cached_cheapest = phones[0]
    cursor = db["phones"].find({
        "brand": brand,
        "model": {"$regex": f"^{model}$", "$options": "i"}
    })
    phones = await cursor.to_list(length=None)
    phones.sort(key=lambda x: x.get("latest_price", {}).get("amount", 0))
    price_comparison = [{
        "store": p.get("site_fetched").split(".")[0],
        "price": p.get("latest_price", {}).get("amount", 0),
        "product_url": p.get("product_url")
    } for p in phones]
    return {
        "brand": brand,
        "model": model,
        "model_image": next((m["model_image"] for m in brand_data["models"] if m["model"].lower() == model.lower()), ""),
        "cheapest_price": cached_cheapest.get("latest_price", {}).get("amount", 0),
        "_id": str(cached_cheapest.get("_id")),
        "price_comparison": price_comparison
    }
