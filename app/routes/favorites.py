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
    existing_fav = await db["users"].find_one({
        "_id": ObjectId(user_id),
        "favorites._id": product_data.get("_id")
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
