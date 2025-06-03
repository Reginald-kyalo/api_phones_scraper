from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime
import uuid
import logging

from app.models import PriceAlertCreate
from app.database import db
from app.auth import verify_token
from app.utils.cache import get_brands_models_cache

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/api/price-alerts")
async def create_price_alert(alert: PriceAlertCreate, payload: dict = Depends(verify_token)):
    user_id = payload.get("sub")
    if not user_id:
        logger.error("User ID not found in payload")
        raise HTTPException(status_code=401, detail="Unauthorized: User ID not found in token payload")
    user_email = payload.get("email")
    if not user_email:
        logger.error("User email not found in payload")
        raise HTTPException(status_code=401, detail="Unauthorized: User email not found in token payload")
    
    product_id = alert.product_id
    product = await db["phones"].find_one({"product_id": product_id})
    if not product:
        logger.error(f"Product not found for ID {product_id}: {alert.product_id}")
        raise HTTPException(status_code=400, detail="Product not found, incorrect or missing product ID")
    
    brand = product.get("brand")
    model = product.get("model")
    
    # Check if alert already exists
    existing_alert = await db["price_alerts"].find_one({
        "user_id": ObjectId(user_id),
        "product.brand": brand,
        "product.model": model,
        "target_price": alert.target_price
    })
    if existing_alert:
        logger.warning(f"Price alert already exists for user {user_email} on product {product_id}")
        raise HTTPException(status_code=400, detail="Price alert already exists for this product")
    
    # Get cache from Redis
    brands_models_cache = await get_brands_models_cache()
    
    if not brands_models_cache:
        logger.error("Brands and models cache is empty")
        raise HTTPException(status_code=500, detail="Brands and models cache is not available")
    
    brand_data = brands_models_cache.get(brand.lower())
    if not brand_data:
        logger.error(f"Brand data not found for '{brand}'. Available brands: {list(brands_models_cache.keys())}")
        raise HTTPException(status_code=400, detail=f"Brand data not found for '{brand}'. Available brands: {list(brands_models_cache.keys())}")
    
    # Generate unique alert ID
    timestamp = datetime.now().strftime("%Y%m%d")
    alert_id = f"ALT-{timestamp}-{uuid.uuid4().hex[:8].upper()}"
    
    # Get model image safely
    model_image = ""
    if brand_data and "models" in brand_data:
        model_image = next((m["model_image"] for m in brand_data["models"] if m["model"].lower() == model.lower()), "")
    
    if not model_image:
        logger.warning(f"Model image not found for {brand} {model}")
    
    alert_data = {
        "alert_id": alert_id,
        "user_id": ObjectId(user_id),
        "email": alert.alternate_email or user_email,
        "product": {
            "product_id": str(product["product_id"]),
            "brand": brand,
            "model": model,
            "model_image": model_image,
        },
        "original_price": product.get("latest_price", {}).get("amount", 0),
        "current_price": product.get("latest_price", {}).get("amount", 0),
        "target_price": alert.target_price,
        "triggered": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    result = await db["price_alerts"].insert_one(alert_data)
    
    # Log information
    logger.info(f"Product data: {product}")
    logger.info(f"Alert data: {alert_data}")
    logger.info(f"Price alert {alert_id} created for user {user_email} on product {alert.product_id} with target price {alert.target_price}")
    
    return {
        "id": str(result.inserted_id),
        "alert_id": alert_id,
        "message": "Price alert created successfully"
    }

@router.get("/api/price-alerts")
async def get_price_alerts(
    filter: str = Query("all"),
    sort: str = Query("date-desc"),
    page: int = Query(1),
    page_size: int = Query(10),
    payload: dict = Depends(verify_token)
):
    user_id = payload.get("sub")
    logger.info(f"Fetching price alerts for user {user_id} with filter: {filter}, sort: {sort}, page: {page}, page_size: {page_size}")

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
    
    # Log alerts for debugging
    if not alerts:
        logger.info(f"No price alerts found for user {user_id} with filter '{filter}'")

    # Simply format alerts without updating prices
    formatted_alerts = []
    for alert in alerts:
        formatted_alerts.append({
            "alert_id": alert["alert_id"],
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
    user_id = payload.get("sub")
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
    user_id = payload.get("sub")
    result = await db["price_alerts"].delete_one({
        "alert_id": alert_id,
        "user_id": ObjectId(user_id)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Alert not found or unauthorized")
    return {"message": "Price alert deleted successfully"}

@router.put("/api/price-alerts/{alert_id}")
async def update_price_alert(alert_id: str, alert: PriceAlertCreate, payload: dict = Depends(verify_token)):
    user_email = payload.get("email")
    existing_alert = await db["price_alerts"].find_one({
        "alert_id": ObjectId(alert_id)
    })
    if not existing_alert:
        raise HTTPException(status_code=400, detail="Alert not found")
    update_data = {
        "target_price": alert.target_price,
        "updated_at": datetime.now()
    }
    if alert.alternate_email:
        update_data["email"] = alert.alternate_email
    elif alert.alternate_email is None:
        update_data["email"] = user_email
    update_data["triggered"] = existing_alert["current_price"] <= alert.target_price
    result = await db["price_alerts"].update_one(
        {"alert_id": alert_id},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update price alert")
    return {"message": "Price alert updated successfully"}
