from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime

from app.models import PriceAlertCreate
from app.database import db
from app.auth import verify_token
from app.routes.home import get_brand_from_cache


router = APIRouter()

@router.post("/api/price-alerts")
async def create_price_alert(alert: PriceAlertCreate, payload: dict = Depends(verify_token)):
    user_id = payload.get("user_id")
    user_email = payload.get("email")
    product_id_obj = ObjectId(alert.product_id) if len(alert.product_id) == 24 else alert.product_id
    product = await db["products"].find_one({"_id": product_id_obj})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product_info = get_brand_from_cache(product.get("brand_id"), product)
    alert_data = {
        "user_id": ObjectId(user_id),
        "email": alert.alternate_email or user_email,
        "product_id": product_id_obj,
        "product": {
            "id": str(product["_id"]),
            "name": product["model"],
            "brand": product_info["brand"],
            "image": product_info["model_image"],
        },
        "original_price": product.get("latest_price", {}).get("amount", 0),
        "current_price": product.get("latest_price", {}).get("amount", 0),
        "target_price": alert.target_price,
        "triggered": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db["price_alerts"].insert_one(alert_data)
    return {"id": str(result.inserted_id), "message": "Price alert created successfully"}

@router.get("/api/price-alerts")
async def get_price_alerts(
    filter: str = Query("all"),
    sort: str = Query("date-desc"),
    page: int = Query(1),
    page_size: int = Query(10),
    payload: dict = Depends(verify_token)
):
    user_id = payload.get("user_id")
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

    formatted_alerts = []
    for alert in alerts:
        product = await db["products"].find_one({"_id": alert["product_id"]})
        current_price = product.get("latest_price", {}).get("amount", alert["current_price"]) if product else alert["current_price"]
        if current_price != alert["current_price"]:
            triggered = current_price <= alert["target_price"]
            await db["price_alerts"].update_one(
                {"_id": alert["_id"]},
                {"$set": {"current_price": current_price, "triggered": triggered, "updated_at": datetime.utcnow()}}
            )
            alert["current_price"] = current_price
            alert["triggered"] = triggered
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
