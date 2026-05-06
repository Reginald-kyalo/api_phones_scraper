"""
PriceRunner Category Browser API routes.
Serves category hierarchy and product listings from pricerunner_db.
"""

from fastapi import APIRouter, HTTPException, Query
import logging
import re
import math

from app.database import pricerunner_db, taxonomy_db

router = APIRouter(prefix="/api/pr", tags=["pricerunner"])
logger = logging.getLogger(__name__)

# Collections
category_items = pricerunner_db["category_items"]
listing_items = pricerunner_db["listing_items"]
canonical_categories = taxonomy_db["canonical_categories"]

# Product type display labels
PRODUCT_TYPE_LABELS = {
    "home_interior": "Home & Interior",
    "computing": "Computing",
    "sound_vision": "Sound & Vision",
    "sports_outdoor": "Sports & Outdoor",
    "health_beauty": "Health & Beauty",
    "gaming_entertainment": "Gaming & Entertainment",
    "garden_patio": "Garden & Patio",
    "phones_wearables": "Phones & Wearables",
    "diy": "Do it yourself",
    "clothing_accessories": "Clothing & Accessories",
    "photography": "Photography",
    "motor_transport": "Motor Transport",
    "toys_hobbies": "Toys & Hobbies",
    "kids_family": "Kids & Family",
}

PRODUCT_TYPE_ICONS = {
    "home_interior": "🏠",
    "computing": "💻",
    "sound_vision": "📺",
    "sports_outdoor": "⚽",
    "health_beauty": "💄",
    "gaming_entertainment": "🎮",
    "garden_patio": "🌿",
    "phones_wearables": "📱",
    "diy": "🔧",
    "clothing_accessories": "👕",
    "photography": "📷",
    "motor_transport": "🚗",
    "toys_hobbies": "🧸",
    "kids_family": "👶",
}


async def ensure_indexes():
    """Create indexes for efficient querying (idempotent)."""
    from pymongo.errors import OperationFailure

    async def _safe_index(coll, *args, **kwargs):
        try:
            await coll.create_index(*args, **kwargs)
        except OperationFailure:
            pass  # index already exists with different options

    await _safe_index(listing_items, "product_type")
    await _safe_index(listing_items, "category_url")
    await _safe_index(listing_items, [("product_name", "text"), ("description", "text")])
    await _safe_index(category_items, "product_type")
    await _safe_index(category_items, "category_url")
    await _safe_index(canonical_categories, "product_type")
    await _safe_index(canonical_categories, "slug")


# ---------------------------------------------------------------------------
# GET /api/pr/product-types — 14 product type groups with product counts
# ---------------------------------------------------------------------------

@router.get("/product-types")
async def get_product_types():
    """Return all 14 product type groups with listing counts and a sample image."""
    pipeline = [
        {"$group": {
            "_id": "$product_type",
            "count": {"$sum": 1},
            "sample_image": {"$first": "$main_image"},
        }},
        {"$sort": {"count": -1}},
    ]
    cursor = listing_items.aggregate(pipeline)
    results = []
    async for doc in cursor:
        pt = doc["_id"]
        results.append({
            "id": pt,
            "label": PRODUCT_TYPE_LABELS.get(pt, pt.replace("_", " ").title()),
            "icon": PRODUCT_TYPE_ICONS.get(pt, "📦"),
            "productCount": doc["count"],
            "image": doc.get("sample_image"),
        })
    return {"productTypes": results}


# ---------------------------------------------------------------------------
# GET /api/pr/categories/{product_type}/tree — category tree for sidebar
# ---------------------------------------------------------------------------

def _build_tree(categories: list[dict], non_leaf_images: dict | None = None) -> list[dict]:
    """Build a tree from flat category_path arrays."""
    root: dict = {"children": {}}

    for cat in categories:
        path = cat.get("category_path", [])
        node = root
        for segment in path:
            if segment not in node["children"]:
                node["children"][segment] = {"children": {}, "leaf": None}
            node = node["children"][segment]
        # Attach leaf info
        node["leaf"] = {
            "name": cat["category_name"],
            "slug": _slugify(cat["category_name"]),
            "categoryUrl": cat["category_url"],
            "image": cat.get("image_url"),
        }

    if non_leaf_images is None:
        non_leaf_images = {}

    def serialize(children: dict, depth: int = 0) -> list[dict]:
        items = []
        for name, node in sorted(children.items()):
            item: dict = {"name": name, "slug": _slugify(name)}
            sub = serialize(node["children"], depth + 1)
            if sub:
                item["children"] = sub
            if node["leaf"]:
                item["categoryUrl"] = node["leaf"]["categoryUrl"]
                item["image"] = node["leaf"]["image"]
            # Use non-leaf image for parent nodes that don't have a direct image
            if not item.get("image") and name in non_leaf_images:
                item["image"] = non_leaf_images[name]
            items.append(item)
        return items

    result = serialize(root["children"])

    # If tree has a single root that matches the product type label, unwrap it
    if len(result) == 1 and result[0].get("children"):
        return result[0]["children"]

    return result


def _slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    slug = text.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


@router.get("/categories/{product_type}/tree")
async def get_category_tree(product_type: str):
    """Return the category tree for a product type."""
    if product_type not in PRODUCT_TYPE_LABELS:
        raise HTTPException(status_code=404, detail="Unknown product type")

    cats = []
    cursor = category_items.find(
        {"product_type": product_type, "is_leaf": True},
        {"category_name": 1, "category_path": 1, "category_url": 1, "image_url": 1, "_id": 0},
    )
    async for doc in cursor:
        cats.append(doc)

    # Fetch non-leaf categories for their images
    non_leaf_images: dict[str, str] = {}
    nl_cursor = category_items.find(
        {"product_type": product_type, "is_leaf": False, "image_url": {"$ne": None}},
        {"category_name": 1, "image_url": 1, "_id": 0},
    )
    async for doc in nl_cursor:
        non_leaf_images[doc["category_name"]] = doc["image_url"]

    tree = _build_tree(cats, non_leaf_images)
    return {
        "productType": product_type,
        "label": PRODUCT_TYPE_LABELS[product_type],
        "tree": tree,
    }


# ---------------------------------------------------------------------------
# GET /api/pr/categories/{product_type}/products — paginated product listings
# ---------------------------------------------------------------------------

@router.get("/categories/{product_type}/products")
async def get_products(
    product_type: str,
    category_url: str | None = Query(None, description="Filter by specific category_url"),
    sort: str = Query("price-asc", description="Sort: price-asc, price-desc, name-asc, stores-desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    q: str | None = Query(None, description="Text search within product names"),
    brand: str | None = Query(None, description="Filter by brand (first word of product name)"),
):
    """Return paginated products for a product type, optionally filtered by category."""
    if product_type not in PRODUCT_TYPE_LABELS:
        raise HTTPException(status_code=404, detail="Unknown product type")

    query: dict = {"product_type": product_type}

    if category_url:
        query["category_url"] = category_url

    if q:
        query["product_name"] = {"$regex": re.escape(q), "$options": "i"}

    if brand:
        # Brand is the first word of product_name — match case-insensitively
        query.setdefault("product_name", {})
        if isinstance(query["product_name"], dict):
            query["product_name"]["$regex"] = f"^{re.escape(brand)}\\b"
            query["product_name"]["$options"] = "i"
        else:
            query["product_name"] = {"$regex": f"^{re.escape(brand)}\\b", "$options": "i"}

    # Sort mapping
    sort_map = {
        "price-asc": [("_sort_price", 1)],
        "price-desc": [("_sort_price", -1)],
        "name-asc": [("product_name", 1)],
        "stores-desc": [("num_stores", -1)],
    }

    skip = (page - 1) * limit

    # Use aggregation pipeline for price conversion and filtering
    pipeline: list[dict] = [
        {"$match": query},
        {"$addFields": {
            "_sort_price": {
                "$convert": {"input": "$price", "to": "double", "onError": 0, "onNull": 0}
            }
        }},
    ]

    # Price range filter (after conversion)
    if min_price is not None or max_price is not None:
        price_filter: dict = {}
        if min_price is not None:
            price_filter["$gte"] = min_price
        if max_price is not None:
            price_filter["$lte"] = max_price
        pipeline.append({"$match": {"_sort_price": price_filter}})

    # Count pipeline (before sort/skip/limit)
    count_pipeline = pipeline + [{"$count": "total"}]
    count_cursor = listing_items.aggregate(count_pipeline)
    count_result = await count_cursor.to_list(1)
    total = count_result[0]["total"] if count_result else 0

    # Brands aggregation — top brands for this filter set (before brand filter)
    brand_base_query: dict = {"product_type": product_type}
    if category_url:
        brand_base_query["category_url"] = category_url
    if q:
        brand_base_query["product_name"] = {"$regex": re.escape(q), "$options": "i"}
    brand_pipeline = [
        {"$match": brand_base_query},
        {"$addFields": {
            "_brand": {"$arrayElemAt": [{"$split": ["$product_name", " "]}, 0]}
        }},
        {"$group": {"_id": "$_brand", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 30},
    ]
    brands = []
    async for b in listing_items.aggregate(brand_pipeline):
        if b["_id"]:
            brands.append({"name": b["_id"], "count": b["count"]})

    # Sort
    sort_spec = sort_map.get(sort, sort_map["price-asc"])
    pipeline.append({"$sort": dict(sort_spec)})
    pipeline.append({"$skip": skip})
    pipeline.append({"$limit": limit})
    pipeline.append({"$project": {"_sort_price": 0}})

    cursor = listing_items.aggregate(pipeline)
    products = []
    async for doc in cursor:
        products.append(_format_product(doc))

    return {
        "products": products,
        "total": total,
        "page": page,
        "totalPages": math.ceil(total / limit) if total > 0 else 1,
        "productType": product_type,
        "label": PRODUCT_TYPE_LABELS[product_type],
        "brands": brands,
    }


# ---------------------------------------------------------------------------
# GET /api/pr/product/{product_id} — single product detail
# ---------------------------------------------------------------------------

@router.get("/product/{product_id}")
async def get_product_detail(product_id: str):
    """Return full detail for a single product."""
    doc = await listing_items.find_one({"product_id": product_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    product = _format_product(doc)
    product["categoryPath"] = doc.get("category_path", [])
    product["rating"] = doc.get("rating")
    return product


# ---------------------------------------------------------------------------
# GET /api/pr/product/{product_id}/related — related products (same category)
# ---------------------------------------------------------------------------

@router.get("/product/{product_id}/related")
async def get_related_products(
    product_id: str,
    limit: int = Query(8, ge=1, le=24),
):
    """Return related products from the same category."""
    doc = await listing_items.find_one({"product_id": product_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    query: dict = {
        "category_url": doc.get("category_url"),
        "product_id": {"$ne": product_id},
        "main_image": {"$ne": None},
    }
    cursor = listing_items.find(query).limit(limit)
    products = []
    async for d in cursor:
        products.append(_format_product(d))
    return {"products": products}


# ---------------------------------------------------------------------------
# GET /api/pr/homepage — featured products for the homepage
# ---------------------------------------------------------------------------

@router.get("/homepage")
async def get_homepage_products(
    limit: int = Query(12, ge=1, le=48),
):
    """Return products for the homepage: deals (lowest-priced with images) and trending (most stores)."""
    # Deals: products with images, sorted by lowest price
    deals_pipeline = [
        {"$match": {"main_image": {"$ne": None}}},
        {"$addFields": {
            "_sort_price": {"$convert": {"input": "$price", "to": "double", "onError": 0, "onNull": 0}},
        }},
        {"$match": {"_sort_price": {"$gt": 0}}},
        {"$sort": {"_sort_price": 1}},
        {"$limit": limit},
        {"$project": {"_sort_price": 0}},
    ]
    deals = []
    async for doc in listing_items.aggregate(deals_pipeline):
        deals.append(_format_product(doc))

    # Trending: most stores, with images
    trending_pipeline = [
        {"$match": {"main_image": {"$ne": None}, "num_stores": {"$gt": 1}}},
        {"$sort": {"num_stores": -1}},
        {"$limit": limit},
    ]
    trending = []
    async for doc in listing_items.aggregate(trending_pipeline):
        trending.append(_format_product(doc))

    total = await listing_items.estimated_document_count()

    return {
        "deals": deals,
        "trending": trending,
        "totalProducts": total,
    }


# ---------------------------------------------------------------------------
# GET /api/pr/search — text search across all product types
# ---------------------------------------------------------------------------

@router.get("/search")
async def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
    product_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
):
    """Full-text search across listing items."""
    query: dict = {"product_name": {"$regex": re.escape(q), "$options": "i"}}
    if product_type and product_type in PRODUCT_TYPE_LABELS:
        query["product_type"] = product_type

    total = await listing_items.count_documents(query)
    skip = (page - 1) * limit

    cursor = listing_items.find(query).sort("product_name", 1).skip(skip).limit(limit)
    products = []
    async for doc in cursor:
        products.append(_format_product(doc))

    return {
        "products": products,
        "total": total,
        "page": page,
        "totalPages": math.ceil(total / limit) if total > 0 else 1,
        "query": q,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_product(doc: dict) -> dict:
    """Shape a MongoDB listing_items document for the frontend."""
    price_str = doc.get("price", "0")
    try:
        price_val = float(price_str)
    except (ValueError, TypeError):
        price_val = 0

    return {
        "id": doc.get("product_id", str(doc.get("_id", ""))),
        "name": doc.get("product_name", ""),
        "description": doc.get("description", ""),
        "image": doc.get("main_image"),
        "price": price_val,
        "numStores": doc.get("num_stores", 0),
        "categoryName": doc.get("category_name", ""),
        "categoryUrl": doc.get("category_url", ""),
        "productUrl": doc.get("product_url", ""),
        "productType": doc.get("product_type", ""),
    }
