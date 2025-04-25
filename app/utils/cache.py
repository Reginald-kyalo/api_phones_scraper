import json
from app.database import db, redis_client

async def update_aggregated_products_cache():
    pipeline = [
        {"$group": {
            "_id": {"brand": "$brand", "model": "$model"},
            "cheapest_price": {"$min": "$latest_price.amount"},
            "cheapest_product": {"$first": "$$ROOT"}
        }}
    ]
    aggregated_results = await db["phones"].aggregate(pipeline).to_list(length=None)
    for result in aggregated_results:
        key = f"aggregate:{result['_id']['brand']}_{result['_id']['model'].lower()}"
        redis_value = json.dumps(result["cheapest_product"], default=str)
        await redis_client.set(key, redis_value)