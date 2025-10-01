from fastapi import APIRouter, Request, Query
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
import json
import asyncio
import logging

from app.database import redis_client, get_products_collection, PRODUCT_CATEGORIES
from app.utils.search import search_brands_and_models, normalize_text
from app.utils.cache import get_brands_models_cache, get_all_categories_cache, get_category_brands_models_cache

router = APIRouter()
logger = logging.getLogger(__name__)

def get_templates():
    return Jinja2Templates(directory="app/templates")

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

@router.get("/category/{category}")
async def category_page(
    request: Request,
    category: str,
    query: str = Query(None),
    brand: str = Query(None),
    model: str = Query(None)
):
    """Generic category page for non-phones categories."""
    # Get all categories cache
    all_categories_cache = await get_all_categories_cache()
    
    # Validate category
    if category not in PRODUCT_CATEGORIES:
        category = None
    
    # Get cache for selected category
    brands_models_cache = all_categories_cache.get(category, {})
    
    logger.info(f"Selected category: {category}")
    logger.info(f"Available brands for {category}: {list(brands_models_cache.keys())}")
    logger.info(f"Cache size for {category}: {len(brands_models_cache)} brands/models.")

    comparison_data = []
    search_results = None

    # Handle search query parameter
    if query and not brand and not model:
        search_results = search_brands_and_models(query, brands_models_cache)
        logger.info(f"Processed Search results for '{query}': {search_results}")
        
        # If we have exact brand matches or high-confidence matches
        brand_matches = search_results["brands"]
        if brand_matches and brand_matches[0]["score"] >= 0.8:
            brand = brand_matches[0]["brand"]
        
        # If we have exact model matches (with brand)
        model_matches = search_results["models"]
        if model_matches and model_matches[0]["score"] >= 0.9:
            brand = model_matches[0]["brand"]
            model = model_matches[0]["model"]

    # Handle different query parameters for fetching comparison data
    if brand == "all":
        tasks = [
            get_comparison_data(b, m["model"], category)
            for b, data in brands_models_cache.items()
            for m in data["models"]
        ]
        results = await asyncio.gather(*tasks)
        comparison_data = [r for r in results if r]
    elif brand and model:
        result = await get_comparison_data(brand.lower(), model, category)
        if result:
            comparison_data.append(result)
    elif brand:
        brand_data = brands_models_cache.get(brand.lower())
        if brand_data:
            tasks = [get_comparison_data(brand.lower(), m["model"], category) for m in brand_data["models"]]
            results = await asyncio.gather(*tasks)
            comparison_data = [r for r in results if r]
    elif search_results:
        # No definitive match but we have search results, return top results
        top_brand_results = [match["brand"] for match in search_results["brands"][:3]]
        top_model_results = search_results["models"][:2]
        
        # Fetch data for top brand results
        brand_tasks = []
        for top_brand in top_brand_results:
            brand_data = brands_models_cache.get(top_brand.lower())
            if brand_data:
                for m in brand_data["models"][:2]:  # Just get first 2 models per brand
                    brand_tasks.append(get_comparison_data(top_brand.lower(), m["model"], category))
        
        # Fetch data for top model results
        model_tasks = [
            get_comparison_data(model_result["brand"], model_result["model"], category)
            for model_result in top_model_results
        ]

        # Combine results and get unique items
        all_tasks = brand_tasks + model_tasks
        if all_tasks:
            results = await asyncio.gather(*all_tasks)
            comparison_data = [r for r in results if r]
    else:
        # Default to showing a sampling of data for the category
        sample_tasks = []
        for brand, brand_data in list(brands_models_cache.items())[:10]:  # Limit to first 10 brands
            for model in brand_data["models"][:2]:  # Limit to first 2 models per brand
                sample_tasks.append(get_comparison_data(brand, model["model"], category))
        
        if sample_tasks:
            results = await asyncio.gather(*sample_tasks)
            comparison_data = [r for r in results if r]

    templates = get_templates()
    return templates.TemplateResponse("base.html", {
        "request": request,
        "comparison_data": comparison_data,
        "categories": list(PRODUCT_CATEGORIES.keys()),
        "selected_category": category,
        "brands": list(brands_models_cache.keys()),
        "models_by_brand": brands_models_cache,
        "all_categories_cache": all_categories_cache,
        "query": query,
        "selected_brand": brand,
        "selected_model": model,
        "search_results": search_results,
        "show_selector": True,  # Show category-brand selector on category pages
    })

async def get_comparison_data(brand: str, model: str, category: str = "phones"):
    # Get the specific category cache
    category_cache = await get_category_brands_models_cache(category)
    brand_data = category_cache.get(brand.lower())
    if not brand_data:
        return None
    
    # Get the appropriate products collection
    products_collection = await get_products_collection(category)
    if products_collection is None:
        return None
        
    cursor = products_collection.find({
        "brand": brand,
        "model": {"$regex": f"^{model}$", "$options": "i"}
    })
    products = await cursor.to_list(length=None)
    if not products:
        return None
    products.sort(key=lambda x: x.get("latest_price", {}).get("amount", 0))
    cached_cheapest = products[0]
    price_comparison = [{
        "store": p.get("site_fetched").split(".")[0],
        "price": p.get("latest_price", {}).get("amount", 0),
        "product_url": p.get("product_url")
    } for p in products]
    model_image = next((m["model_image"] for m in brand_data["models"] if m["model"].lower() == model.lower()), "")
    if not model_image:
        model_image = cached_cheapest.get("product_image", "")
        if not model_image:
            # Provide a default placeholder image
            model_image = "https://via.placeholder.com/300x300/f0f0f0/666666?text=No+Image"
    result = {
        "category": category,
        "brand": brand,
        "model": model,
        "model_image": model_image,

        "cheapest_price": cached_cheapest.get("latest_price", {}).get("amount", 0),
        "product_id": cached_cheapest.get("product_id"),
        "price_comparison": price_comparison
    }
    
    logger.info(f"Returning {category} product data: product_id={result.get('product_id')}")
    return result