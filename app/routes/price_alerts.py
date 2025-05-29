from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime

from app.models import PriceAlertCreate
from app.database import db
from app.auth import verify_token
from app.routes.home import brands_models_cache
import logging
logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/api/price-alerts")
async def create_price_alert(alert: PriceAlertCreate, payload: dict = Depends(verify_token)):
    user_id = payload.get("user_id")
    user_email = payload.get("email")
    product_id_obj = ObjectId(alert.product_id) if len(alert.product_id) == 24 else alert.product_id
    product = await db["phones"].find_one({"product_id": product_id_obj})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    brand = product.get("brand")
    product_info = brands_models_cache.get(brand.lower())
    alert_data = {
        "user_id": ObjectId(user_id),
        "email": alert.alternate_email or user_email,
        "product_id": product_id_obj,
        "product": {
            "id": str(product["_id"]),
            "name": product["model"],
            "brand": product_info["brand"],
            "model": product_info["model"],
            "image": product_info["model_image"],
        },
        "original_price": product.get("latest_price", {}).get("amount", 0),
        "current_price": product.get("latest_price", {}).get("amount", 0),
        "target_price": alert.target_price,
        "triggered": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    result = await db["price_alerts"].insert_one(alert_data)
    return {"id": str(result.inserted_id), "message": "Price alert created successfully"}
    logger.info(f"Price alert created for user {user_id} on product {alert.product_id} with target price {alert.target_price}")

@router.get("/api/price-alerts")
async def get_price_alerts(
    filter: str = Query("all"),
    sort: str = Query("date-desc"),
    page: int = Query(1),
    page_size: int = Query(10),
    payload: dict = Depends(verify_token)
):
    logger.info(f"Fetching price alerts with filter: {filter}, sort: {sort}, page: {page}, page_size: {page_size}")
    user_id = payload.get("sub")
    query = {"user_id": ObjectId(user_id)}
    if filter == "triggered":
        query["triggered"] = True
    elif filter == "active":
        query["triggered"] = False

    sort_options = {}
    if sort == "date-desc":
        sort_options["created_at"] = -1
    elif sort == "date-asc":
        sort_options["created_at"] = 1
    elif sort == "price-desc":
        sort_options["target_price"] = -1
    elif sort == "price-asc":
        sort_options["target_price"] = 1

    total_count = await db["price_alerts"].count_documents(query)
    total_pages = (total_count + page_size - 1) // page_size
    skip = (page - 1) * page_size
    cursor = db["price_alerts"].find(query).sort(sort_options).skip(skip).limit(page_size)
    alerts = await cursor.to_list(length=page_size)

    # Simply format alerts without updating prices
    formatted_alerts = []
    for alert in alerts:
        formatted_alerts.append({
            "id": str(alert["_id"]),
            "product": alert["product"],
            "originalPrice": alert["original_price"],
            "currentPrice": alert["current_price"],
            "targetPrice": alert["target_price"],
            "triggered": alert["triggered"],
            "createdAt": alert["created_at"].isoformat(),
            "email": alert["email"]
        })
    
    logger.info(f"Fetched {len(formatted_alerts)} price alerts for user {user_id}")
    return {
        "alerts": formatted_alerts,
        "currentPage": page,
        "totalPages": total_pages,
        "totalCount": total_count
    }

@router.get("/api/price-alerts/count")
async def get_price_alerts_count(payload: dict = Depends(verify_token)):
    user_id = payload.get("user_id")
    total_count = await db["price_alerts"].count_documents({"user_id": ObjectId(user_id)})
    triggered_count = await db["price_alerts"].count_documents({
        "user_id": ObjectId(user_id),
        "triggered": True
    })
    return {
        "totalCount": total_count,
        "triggeredCount": triggered_count
    }

@router.delete("/api/price-alerts/{alert_id}")
async def delete_price_alert(alert_id: str, payload: dict = Depends(verify_token)):
    user_id = payload.get("user_id")
    result = await db["price_alerts"].delete_one({
        "_id": ObjectId(alert_id),
        "user_id": ObjectId(user_id)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found or unauthorized")
    return {"message": "Price alert deleted successfully"}

@router.put("/api/price-alerts/{alert_id}")
async def update_price_alert(alert_id: str, alert: PriceAlertCreate, payload: dict = Depends(verify_token)):
    user_id = payload.get("user_id")
    user_email = payload.get("email")
    existing_alert = await db["price_alerts"].find_one({
        "_id": ObjectId(alert_id),
        "user_id": ObjectId(user_id)
    })
    if not existing_alert:
        raise HTTPException(status_code=404, detail="Alert not found or unauthorized")
    update_data = {
        "target_price": alert.target_price,
        "updated_at": datetime.utcnow()
    }
    if alert.alternate_email:
        update_data["email"] = alert.alternate_email
    elif alert.alternate_email is None:
        update_data["email"] = user_email
    update_data["triggered"] = existing_alert["current_price"] <= alert.target_price
    result = await db["price_alerts"].update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update price alert")
    return {"message": "Price alert updated successfully"}
