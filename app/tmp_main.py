import asyncio
import json
import jwt
import logging
from redis.asyncio import Redis
from fastapi import FastAPI, Request, Query, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId
from typing import Optional, Dict, Any, List
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime

security = HTTPBearer()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SECRET_KEY = "your_secret_key"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthRequest(BaseModel):
    email: str
    password: str

# Create the MongoDB client
client = AsyncIOMotorClient("mongodb://localhost:27017", serverSelectionTimeoutMS=5000)
db: AsyncIOMotorDatabase = client["phone_products"]

# Redis client (update host/port as necessary)
redis_client = Redis(host="localhost", port=6379, decode_responses=True)

# Native cache for brands and models (useful for UI purposes)
brands_models_cache: Dict[str, Dict[str, Any]] = {}
serialized_brands_models_cache: Dict[str, Dict[str, Any]] = {}

def serialize_brands_models_cache(cache: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    serialized = {}
    for brand, data in cache.items():
        serialized[brand.lower()] = {
            "brand_id": str(data["brand_id"]) if isinstance(data.get("brand_id"), ObjectId) else data.get("brand_id"),
            "models": data.get("models", [])
        }
    return serialized

@asynccontextmanager
async def lifespan(app: FastAPI):
    global brands_models_cache, serialized_brands_models_cache
    docs = await db["brands_models"].find().to_list(length=None)
    brands_models_cache = {}

    async def check_model(brand_id, model):
        model_name = model["model"]
        product_exists = await db["products"].find_one({
            "brand_id": brand_id,
            "model": model_name
        })
        if product_exists:
            return {"model": model_name, "model_image": model.get("model_image", "")}
        return None

    for doc in docs:
        brand_id = doc["_id"]
        brand_name = doc["brand"]
        models = doc.get("models", [])
        tasks = [check_model(brand_id, model) for model in models]
        results = await asyncio.gather(*tasks)
        valid_models = [r for r in results if r is not None]
        if valid_models:
            brands_models_cache[brand_name.lower()] = {
                "brand_id": brand_id,
                "models": valid_models
            }

    logger.info("✅ Cached brands and models with products.")
    serialized_brands_models_cache = serialize_brands_models_cache(brands_models_cache)
    logger.info("✅ Serialized brands and models cache.")

    # Optionally, initialize Redis cache here (e.g., precompute aggregates)
    await update_aggregated_products_cache()

    yield

app = FastAPI(title="Phone Price Comparison API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Global Redis key prefix for aggregated products
REDIS_AGG_PREFIX = "aggregate"

async def update_aggregated_products_cache():
    pipeline = [
        {"$group": {
            "_id": {
                "brand_id": "$brand_id",
                "model": "$model"
            },
            "cheapest_price": {"$min": "$latest_price.amount"},
            "cheapest_product": {"$first": "$$ROOT"}
        }},
    ]
    aggregated_results = await db["products"].aggregate(pipeline).to_list(length=None)
    for result in aggregated_results:
        key = f"{REDIS_AGG_PREFIX}:{result['_id']['brand_id']}_{result['_id']['model'].lower()}"
        redis_value = json.dumps(result["cheapest_product"], default=str)
        await redis_client.set(key, redis_value)
    logger.info("✅ Updated aggregated products cache in Redis.")

async def get_cached_cheapest_product(brand_id: str, model: str) -> Optional[dict]:
    key = f"{REDIS_AGG_PREFIX}:{brand_id}_{model.lower()}"
    cached_value = await redis_client.get(key)
    if cached_value:
        return json.loads(cached_value)
    return None

async def get_comparison_data(brand: str, model: str) -> Optional[dict]:
    brand_data = brands_models_cache.get(brand)
    if not brand_data:
        return None

    cached_cheapest = await get_cached_cheapest_product(str(brand_data["brand_id"]), model)
    if cached_cheapest is None:
        products_cursor = db["products"].find({
            "brand_id": brand_data["brand_id"],
            "model": {"$regex": f"^{model}$", "$options": "i"}
        })
        products = await products_cursor.to_list(length=None)
        if not products:
            return None
        products.sort(key=lambda x: x.get("latest_price", {}).get("amount", 0))
        cached_cheapest = products[0]
        
    products_cursor = db["products"].find({
        "brand_id": brand_data["brand_id"],
        "model": {"$regex": f"^{model}$", "$options": "i"}
    })
    products = await products_cursor.to_list(length=None)
    products.sort(key=lambda x: x.get("latest_price", {}).get("amount", 0))
    price_comparison = [{
        "store": p.get("site_fetched").split(".")[0],
        "price": p.get("latest_price", {}).get("amount", 0),
        "product_url": p.get("product_url")
    } for p in products]

    return {
        "brand": brand,
        "model": model,
        "model_image": next((m["model_image"] for m in brand_data["models"] if m["model"].lower() == model.lower()), ""),
        "cheapest_price": cached_cheapest.get("latest_price", {}).get("amount", 0),
        "_id": str(cached_cheapest.get("_id")),
        "price_comparison": price_comparison
    }

@app.get("/")
async def home(
    request: Request,
    query: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    model: Optional[str] = Query(None)
):
    comparison_data = []

    if brand == "all":
        tasks = [
            get_comparison_data(brand, model_entry["model"])
            for brand, data_obj in brands_models_cache.items()
            for model_entry in data_obj["models"]
        ]
        results = await asyncio.gather(*tasks)
        comparison_data = [r for r in results if r]
    elif brand and model:
        result = await get_comparison_data(brand.lower(), model)
        if result:
            comparison_data.append(result)
    elif brand:
        brand_data = brands_models_cache.get(brand.lower())
        if brand_data:
            tasks = [get_comparison_data(brand.lower(), model_entry["model"]) for model_entry in brand_data["models"]]
            results = await asyncio.gather(*tasks)
            comparison_data = [r for r in results if r]
    else:
        tasks = [
            get_comparison_data(brand, model_entry["model"])
            for brand, data_obj in brands_models_cache.items()
            for model_entry in data_obj["models"]
        ]
        results = await asyncio.gather(*tasks)
        comparison_data = [r for r in results if r]
        logger.info("No brand or model specified, fetching all products.")

    return templates.TemplateResponse("base.html", {
        "request": request,
        "comparison_data": comparison_data,
        "brands": list(brands_models_cache.keys()),
        "models_by_brand": serialized_brands_models_cache,
        "query": query,
        "selected_brand": brand,
        "selected_model": model
    })

@app.post("/api/signup")
async def signup(auth: AuthRequest):
    existing_user = await db["users"].find_one({"email": auth.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists.")

    hashed_password = pwd_context.hash(auth.password)
    user_data = {
        "email": auth.email,
        "password_hash": hashed_password,
        "favorites": []  # Initialize empty favorites list
    }

    result = await db["users"].insert_one(user_data)
    user_id = str(result.inserted_id)
    token = jwt.encode({"user_id": user_id, "email": auth.email}, SECRET_KEY, algorithm="HS256")

    return {"token": token, "user_id": user_id}

@app.post("/api/signin")
async def signin(auth: AuthRequest):
    user = await db["users"].find_one({"email": auth.email})
    if not user or not pwd_context.verify(auth.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials or user does not exist.")

    token = jwt.encode({"user_id": str(user["_id"]), "email": user["email"]}, SECRET_KEY, algorithm="HS256")
    return {"token": token, "user_id": str(user["_id"])}

# -----------------------------
# Favorites endpoints (updated)
# -----------------------------

# POST endpoint to add a product to favorites (stores full product details)
@app.post("/api/favorites")
async def add_favorite(item: dict, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    # Expect the full product data from the client under the "product" key
    product_data = item.get("product")
    if not product_data:
        raise HTTPException(status_code=400, detail="Product data required")
    
    # Check if a favorite with the same _id already exists in the user's favorites
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

# GET endpoint to fetch all favorites for the logged-in user
@app.get("/api/favorites")
async def get_favorites(credentials: HTTPAuthorizationCredentials = Depends(security)):
    logger.info("Received request for favorites")  # Debugging log
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        logger.error("Invalid token received")
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    logger.info(f"User ID extracted: {user_id}")

    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        logger.warning(f"User not found: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")
    
    stored_favorites = user.get("favorites", [])
    logger.info(f"Stored favorites count: {len(stored_favorites)}")

    # Fetch latest product info
    tasks = [get_comparison_data(fav["brand"].lower(), fav["model"].lower()) for fav in stored_favorites]
    updated_results = await asyncio.gather(*tasks)

    updated_favorites = [r for r in updated_results if r]
    logger.info(f"Updated favorites count: {len(updated_favorites)}")

    return updated_favorites

# DELETE endpoint to remove a product from favorites by matching its _id (as a string)
@app.delete("/api/favorites/{product_id}")
async def delete_favorite(product_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    result = await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"favorites": {"_id": product_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Favorite not found")
    return {"message": "Favorite removed"}

# Define a Pydantic model for price alerts
class PriceAlertCreate(BaseModel):
    product_id: str
    target_price: float
    alternate_email: Optional[str] = None

# Create a price alert
@app.post("/api/price-alerts")
async def create_price_alert(alert: PriceAlertCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    user_email = payload.get("email")
    
    # Get product details to store with the alert
    product_id_obj = ObjectId(alert.product_id) if len(alert.product_id) == 24 else alert.product_id
    product = await db["products"].find_one({"_id": product_id_obj})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Create price alert record
    alert_data = {
        "user_id": ObjectId(user_id),
        "email": alert.alternate_email or user_email,
        "product_id": product_id_obj,
        "product": {
            "id": str(product["_id"]),
            "name": product["model"],
            "brand": product.get("brand", "Unknown"),
            "image": product.get("model_image", "")
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

# Get user's price alerts
@app.get("/api/price-alerts")
async def get_price_alerts(
    filter: str = Query("all"),
    sort: str = Query("date-desc"),
    page: int = Query(1),
    page_size: int = Query(10),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    
    # Build query based on filter
    query = {"user_id": ObjectId(user_id)}
    if filter == "triggered":
        query["triggered"] = True
    elif filter == "active":
        query["triggered"] = False
    
    # Build sort options
    sort_options = {}
    if sort == "date-desc":
        sort_options["created_at"] = -1
    elif sort == "date-asc":
        sort_options["created_at"] = 1
    elif sort == "price-desc":
        sort_options["target_price"] = -1
    elif sort == "price-asc":
        sort_options["target_price"] = 1
    
    # Get total count for pagination
    total_count = await db["price_alerts"].count_documents(query)
    total_pages = (total_count + page_size - 1) // page_size
    
    # Get paginated results
    skip = (page - 1) * page_size
    cursor = db["price_alerts"].find(query).sort(sort_options).skip(skip).limit(page_size)
    alerts = await cursor.to_list(length=page_size)
    
    # Format alerts for response
    formatted_alerts = []
    for alert in alerts:
        # Update current price if needed from the products collection
        product = await db["products"].find_one({"_id": alert["product_id"]})
        current_price = product.get("latest_price", {}).get("amount", alert["current_price"]) if product else alert["current_price"]
        
        # Update alert if price changed
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

# Get alert counts for badge
@app.get("/api/price-alerts/count")
async def get_price_alerts_count(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    
    # Get counts
    total_count = await db["price_alerts"].count_documents({"user_id": ObjectId(user_id)})
    triggered_count = await db["price_alerts"].count_documents({
        "user_id": ObjectId(user_id),
        "triggered": True
    })
    
    return {
        "totalCount": total_count,
        "triggeredCount": triggered_count
    }

# Delete a price alert
@app.delete("/api/price-alerts/{alert_id}")
async def delete_price_alert(
    alert_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    
    result = await db["price_alerts"].delete_one({
        "_id": ObjectId(alert_id),
        "user_id": ObjectId(user_id)
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found or you don't have permission to delete it")
    
    return {"message": "Price alert deleted successfully"}

# Update a price alert
@app.put("/api/price-alerts/{alert_id}")
async def update_price_alert(
    alert_id: str,
    alert: PriceAlertCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    user_email = payload.get("email")
    
    # Check if alert exists and belongs to this user
    existing_alert = await db["price_alerts"].find_one({
        "_id": ObjectId(alert_id),
        "user_id": ObjectId(user_id)
    })
    
    if not existing_alert:
        raise HTTPException(status_code=404, detail="Alert not found or you don't have permission to update it")
    
    # Update alert data
    update_data = {
        "target_price": alert.target_price,
        "updated_at": datetime.utcnow()
    }
    
    # Update email if provided
    if alert.alternate_email:
        update_data["email"] = alert.alternate_email
    elif "alternate_email" in alert.dict() and alert.alternate_email is None:
        update_data["email"] = user_email
    
    # Check if it's triggered with the new target price
    update_data["triggered"] = existing_alert["current_price"] <= alert.target_price
    
    result = await db["price_alerts"].update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update price alert")
    
    return {"message": "Price alert updated successfully"}
