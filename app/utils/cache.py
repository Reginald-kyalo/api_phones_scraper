import json
from app.database import db, redis_client

def serialize_brands_models_cache(cache: dict) -> dict:
    serialized = {}
    for brand, data in cache.items():
        serialized[brand.lower()] = {
            "brand_id": str(data["brand_id"]),
            "models": data.get("models", [])
        }
    return serialized

async def update_aggregated_products_cache():
    pipeline = [
        {"$group": {
            "_id": {"brand_id": "$brand_id", "model": "$model"},
            "cheapest_price": {"$min": "$latest_price.amount"},
            "cheapest_product": {"$first": "$$ROOT"}
        }}
    ]
    aggregated_results = await db["products"].aggregate(pipeline).to_list(length=None)
    for result in aggregated_results:
        key = f"aggregate:{result['_id']['brand_id']}_{result['_id']['model'].lower()}"
        redis_value = json.dumps(result["cheapest_product"], default=str)
        await redis_client.set(key, redis_value)