from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
import logging

from app.database import db
from app.auth import verify_token

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/api/favorites")
async def add_favorite(item: dict, payload: dict = Depends(verify_token)):
    user_id = payload.get("sub")
    product_data = item.get("product")
    if not product_data:
        raise HTTPException(status_code=400, detail="Product data required")
    # Normalize product identifier: accept either incoming `_id` or `product_id`
    pid = product_data.get("_id") or product_data.get("product_id")
    if not pid:
        # If we don't have a stable id from the client, reject — we need it to deduplicate
        raise HTTPException(status_code=400, detail="Product identifier required for favorites")

    # Ensure the stored favorite has a stable `_id` field (use product_id if that's what client sent)
    if "_id" not in product_data:
        product_data["_id"] = pid

    # Look for an existing favorite by either `_id` or `product_id` to handle previous variants
    existing_fav = await db["users"].find_one({
        "_id": ObjectId(user_id),
        "$or": [
            {"favorites._id": pid},
            {"favorites.product_id": pid}
        ]
    })

    if existing_fav:
        raise HTTPException(status_code=400, detail="Item might already be in favorites")

    result = await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$push": {"favorites": product_data}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to add favorite")
    return {"message": "Item added to favorites"}

@router.get("/api/favorites")
async def get_favorites(payload: dict = Depends(verify_token)):
    user_id = payload.get("sub")
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # For simplicity, return stored favorites directly
    return user.get("favorites", [])

@router.delete("/api/favorites/{product_id}")
async def delete_favorite(product_id: str, payload: dict = Depends(verify_token)):
    user_id = payload.get("sub")
    result = await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"favorites": {"_id": product_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Favorite not found")
    return {"message": "Favorite removed"}
