"""
Product API routes — JSON endpoints for the React SPA frontend.
Adapts the existing MongoDB multi-DB product data into the shape
expected by the React Product interface.
"""

from fastapi import APIRouter, HTTPException, Query
import asyncio
import logging
import random

from app.database import (
    PRODUCT_CATEGORIES,
    get_products_collection,
    getprice_db,
)
from app.utils.cache import (
    get_all_categories_cache,
    get_category_brands_models_cache,
)
from app.utils.search import search_brands_and_models, normalize_text
from app.database import redis_client
import json

router = APIRouter(prefix="/api", tags=["products"])
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers — shape transformers
# ---------------------------------------------------------------------------

CATEGORY_EMOJI = {
    "phones": "📱",
    "laptops": "💻",
    "cosmetics": "💄",
    "shoes": "👟",
    "sound_systems": "🔊",
}


def _build_product_response(raw: dict, category: str, brand_cache: dict | None = None) -> dict:
    """
    Transform a raw MongoDB product document into the React `Product` shape.
    The old DB stores one document per *retailer listing*.
    This function is called per-group (brand+model) after aggregation.
    """
    brand = raw.get("brand", "")
    model = raw.get("model", "")

    # Image from cache or document
    model_image = ""
    if brand_cache:
        brand_info = brand_cache.get(brand.lower(), {})
        if brand_info:
            model_image = next(
                (m["model_image"] for m in brand_info.get("models", [])
                 if m["model"].lower() == model.lower()),
                "",
            )
    if not model_image:
        model_image = raw.get("product_image", raw.get("model_image", ""))
    if not model_image:
        model_image = "https://via.placeholder.com/400x400/f0f0f0/666666?text=No+Image"

    return {
        "id": raw.get("product_id", str(raw.get("_id", ""))),
        "name": f"{brand} {model}",
        "category": category,
        "brand": brand,
        "image": model_image,
        "images": [model_image],
        # Prices, rating, etc filled by the aggregation caller
    }


async def _aggregate_product(
    brand: str,
    model: str,
    category: str,
    brand_cache: dict | None = None,
) -> dict | None:
    """
    Build a full React-shaped product from all retailer listings for a brand+model.
    """
    collection = await get_products_collection(category)
    if collection is None:
        return None

    cursor = collection.find({
        "brand": brand,
        "model": {"$regex": f"^{model}$", "$options": "i"},
    })
    docs = await cursor.to_list(length=None)
    if not docs:
        return None

    docs.sort(key=lambda d: d.get("latest_price", {}).get("amount", 0))
    cheapest = docs[0]

    # Build prices array
    prices = []
    for doc in docs:
        store_raw = doc.get("site_fetched", "unknown")
        store_name = store_raw.split(".")[0].replace("_", " ").title()
        store_id = store_raw.split(".")[0].lower().replace(" ", "")
        amount = doc.get("latest_price", {}).get("amount", 0)
        prices.append({
            "retailerId": store_id,
            "retailerName": store_name,
            "price": amount,
            "inStock": amount > 0,
            "url": doc.get("product_url", "#"),
        })

    # Model image
    model_image = ""
    if brand_cache:
        brand_info = brand_cache.get(brand.lower(), {})
        if brand_info:
            model_image = next(
                (m.get("model_image", "") for m in brand_info.get("models", [])
                 if m["model"].lower() == model.lower()),
                "",
            )
    if not model_image:
        model_image = cheapest.get("product_image", "")
    if not model_image:
        model_image = "https://via.placeholder.com/400x400/f0f0f0/666666?text=No+Image"

    lowest = min((p["price"] for p in prices if p["price"] > 0), default=0)
    highest = max((p["price"] for p in prices), default=0)
    discount = int(round((highest - lowest) / highest * 100)) if highest > 0 and lowest < highest else 0

    return {
        "id": cheapest.get("product_id", str(cheapest.get("_id", ""))),
        "name": f"{brand} {model}",
        "category": category,
        "brand": brand,
        "image": model_image,
        "images": [model_image],
        "rating": 0,
        "reviewCount": 0,
        "prices": prices,
        "discount": discount if discount > 0 else None,
        "specifications": {},
        "reviews": [],
        "priceHistory": [],
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/products/featured")
async def get_featured_products(
    limit: int = Query(8, ge=1, le=50),
    sort: str = Query("random"),
):
    """
    Return featured/trending products across all categories.
    Used by the React HomePage component.
    sort: random | price-asc | price-desc | discount | rating
    """
    all_cache = await get_all_categories_cache()
    tasks = []

    for cat, brand_map in all_cache.items():
        if not brand_map:
            continue
        brands = list(brand_map.keys())
        selected = random.sample(brands, min(2, len(brands)))
        for b in selected:
            models = brand_map[b].get("models", [])
            if models:
                m = random.choice(models)
                tasks.append(_aggregate_product(b, m["model"], cat, brand_map))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    products = [r for r in results if isinstance(r, dict)]

    if sort == "price-asc":
        products.sort(key=lambda p: min((pr["price"] for pr in p["prices"] if pr["price"] > 0), default=0))
    elif sort == "price-desc":
        products.sort(key=lambda p: min((pr["price"] for pr in p["prices"] if pr["price"] > 0), default=0), reverse=True)
    elif sort == "discount":
        products.sort(key=lambda p: p.get("discount") or 0, reverse=True)
    elif sort == "rating":
        products.sort(key=lambda p: p.get("rating") or 0, reverse=True)
    else:
        random.shuffle(products)

    return {"products": products[:limit]}


@router.get("/products/deals")
async def get_daily_deals(limit: int = Query(6, ge=1, le=50)):
    """
    Return products with the largest price spreads (biggest savings).
    Used by the React HomePage 'Daily Deals' section.
    """
    all_cache = await get_all_categories_cache()
    tasks = []

    for cat, brand_map in all_cache.items():
        if not brand_map:
            continue
        brands = list(brand_map.keys())
        selected = random.sample(brands, min(3, len(brands)))
        for b in selected:
            models = brand_map[b].get("models", [])
            picked = random.sample(models, min(2, len(models)))
            for m in picked:
                tasks.append(_aggregate_product(b, m["model"], cat, brand_map))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    products = [r for r in results if isinstance(r, dict) and r.get("discount")]
    products.sort(key=lambda p: p.get("discount", 0), reverse=True)
    return {"products": products[:limit]}


@router.get("/products/search")
async def search_products(
    q: str = Query(..., min_length=1, max_length=200),
    category: str = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Search products across categories using the existing fuzzy search engine.
    Used by the React SearchResultsPage.
    """
    # Check Redis cache first
    cache_key = f"api_search:{normalize_text(q)}:{category or 'all'}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    categories_to_search = [category] if category and category in PRODUCT_CATEGORIES else list(PRODUCT_CATEGORIES.keys())
    all_products = []

    for cat in categories_to_search:
        brand_cache = await get_category_brands_models_cache(cat)
        if not brand_cache:
            continue

        search_results = search_brands_and_models(q, brand_cache)

        # Collect brand+model pairs to fetch
        pairs = set()

        for bm in search_results.get("brands", [])[:5]:
            b = bm["brand"]
            bd = brand_cache.get(b.lower(), {})
            for m in bd.get("models", [])[:3]:
                pairs.add((b.lower(), m["model"]))

        for mm in search_results.get("models", [])[:5]:
            pairs.add((mm["brand"].lower(), mm["model"]))

        tasks = [_aggregate_product(b, m, cat, brand_cache) for b, m in pairs]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        all_products.extend(r for r in results if isinstance(r, dict))

    all_products = all_products[:limit]
    response = {"products": all_products, "query": q, "count": len(all_products)}

    # Cache for 10 minutes
    try:
        await redis_client.setex(cache_key, 600, json.dumps(response))
    except Exception:
        pass

    return response


@router.get("/products/category/{category_id}")
async def get_category_products(
    category_id: str,
    brand: str = Query(None),
    sort: str = Query("price-asc"),
    limit: int = Query(40, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Get products for a specific category, optionally filtered by brand.
    Used by the React CategoryPage.
    """
    if category_id not in PRODUCT_CATEGORIES:
        raise HTTPException(status_code=404, detail=f"Category '{category_id}' not found")

    brand_cache = await get_category_brands_models_cache(category_id)
    if not brand_cache:
        return {"products": [], "brands": [], "count": 0, "category": category_id}

    # Decide which brands to load
    if brand:
        brands_to_load = {brand.lower(): brand_cache.get(brand.lower(), {})}
    else:
        brands_to_load = brand_cache

    tasks = []
    for b, bd in brands_to_load.items():
        for m in bd.get("models", []):
            tasks.append(_aggregate_product(b, m["model"], category_id, brand_cache))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    products = [r for r in results if isinstance(r, dict)]

    # Sort
    if sort == "price-asc":
        products.sort(key=lambda p: min((pr["price"] for pr in p["prices"] if pr["price"] > 0), default=0))
    elif sort == "price-desc":
        products.sort(key=lambda p: min((pr["price"] for pr in p["prices"] if pr["price"] > 0), default=0), reverse=True)
    elif sort == "discount-desc":
        products.sort(key=lambda p: p.get("discount") or 0, reverse=True)
    elif sort == "name-asc":
        products.sort(key=lambda p: p.get("name", "").lower())

    total = len(products)
    products = products[offset:offset + limit]

    available_brands = sorted(brands_to_load.keys())
    brand_counts = {b: len(bd.get("models", [])) for b, bd in brands_to_load.items()}

    return {
        "products": products,
        "brands": available_brands,
        "brandCounts": brand_counts,
        "count": total,
        "category": category_id,
    }


# ---------------------------------------------------------------------------
# Related products (must be before /products/{product_id} catch-all)
# ---------------------------------------------------------------------------

@router.get("/products/related/{product_id}")
async def get_related_products(product_id: str, limit: int = Query(8, ge=1, le=30)):
    """
    Return related products (same category, same brand preferred, excluding the current product).
    """
    source_doc = None
    source_category = None
    for category, info in PRODUCT_CATEGORIES.items():
        collection = info["db"][info["collection"]]
        doc = await collection.find_one({"product_id": product_id})
        if doc:
            source_doc = doc
            source_category = category
            break

    if not source_doc or not source_category:
        return {"products": []}

    brand = source_doc.get("brand", "").lower()
    model = source_doc.get("model", "")
    brand_cache = await get_category_brands_models_cache(source_category)
    if not brand_cache:
        return {"products": []}

    same_brand_tasks = []
    other_brand_tasks = []

    for b, bd in brand_cache.items():
        for m in bd.get("models", []):
            m_name = m["model"]
            if b == brand and m_name.lower() == model.lower():
                continue
            coro = _aggregate_product(b, m_name, source_category, brand_cache)
            if b == brand:
                same_brand_tasks.append(coro)
            else:
                other_brand_tasks.append(coro)

    # Prefer same-brand results
    same_results = await asyncio.gather(*same_brand_tasks[:limit], return_exceptions=True)
    products = [r for r in same_results if isinstance(r, dict)]

    if len(products) < limit:
        remaining = limit - len(products)
        other_results = await asyncio.gather(*other_brand_tasks[:remaining], return_exceptions=True)
        products.extend(r for r in other_results if isinstance(r, dict))

    return {"products": products[:limit]}


@router.get("/products/{product_id}")
async def get_product_detail(product_id: str):
    """
    Get full product details by product_id.
    Searches across all category databases.
    Used by the React ProductDetailsPage.
    """
    for category, info in PRODUCT_CATEGORIES.items():
        collection = info["db"][info["collection"]]
        doc = await collection.find_one({"product_id": product_id})
        if doc:
            brand = doc.get("brand", "")
            model = doc.get("model", "")
            brand_cache = await get_category_brands_models_cache(category)
            product = await _aggregate_product(brand, model, category, brand_cache)
            if product:
                # Override id with the exact requested id
                product["id"] = product_id
                return product

    raise HTTPException(status_code=404, detail="Product not found")


@router.get("/categories/list")
async def list_categories():
    """
    Return all product categories for the React frontend.
    Combines the DB PRODUCT_CATEGORIES with the getprice_db categories collection.
    """
    # First try the DB categories
    try:
        categories_collection = getprice_db["categories"]
        db_cats = await categories_collection.find(
            {}, {"_id": 0, "name": 1, "category_id": 1, "icon_url": 1, "see_all_slug": 1, "subcategories": 1}
        ).sort("name", 1).to_list(length=None)
    except Exception:
        db_cats = []

    # Fallback / merge with known categories
    result = []
    for cat_id in PRODUCT_CATEGORIES:
        db_match = next((c for c in db_cats if c.get("see_all_slug") == cat_id), None)
        result.append({
            "id": cat_id,
            "name": db_match.get("name", cat_id.replace("_", " ").title()) if db_match else cat_id.replace("_", " ").title(),
            "emoji": CATEGORY_EMOJI.get(cat_id, "📦"),
            "dealCount": 0,
            "subcategories": db_match.get("subcategories", []) if db_match else [],
        })

    return {"categories": result}


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@router.get("/stats")
async def get_stats():
    """
    Return aggregate stats for the React frontend hero section.
    Cached in Redis for 1 hour.
    """
    cache_key = "api_stats"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    product_count = 0
    retailer_set: set[str] = set()

    for category, info in PRODUCT_CATEGORIES.items():
        collection = info["db"][info["collection"]]
        try:
            count = await collection.count_documents({})
            product_count += count
            sites = await collection.distinct("site_fetched")
            retailer_set.update(s.split(".")[0] for s in sites if s)
        except Exception:
            pass

    result = {
        "productCount": product_count,
        "shopCount": len(retailer_set),
        "categoryCount": len(PRODUCT_CATEGORIES),
    }

    try:
        await redis_client.setex(cache_key, 3600, json.dumps(result))
    except Exception:
        pass

    return result
