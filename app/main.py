import json
from redis.asyncio import Redis
from fastapi import FastAPI, Request, Query, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from passlib.context import CryptContext
import jwt
import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId
from typing import Optional, Dict, Any, List

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

# Favorites endpoints
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer()

# POST endpoint to add a product to favorites (stores product id only)
@app.post("/api/favorites")
async def add_favorite(item: dict, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("user_id")
    product_id = item.get("product_id")

    if not product_id:
        raise HTTPException(status_code=400, detail="Product ID required")

    # Optionally verify that the product exists
    product = await db["products"].find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    result = await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$addToSet": {"favorites": ObjectId(product_id)}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Item might already be in favorites")

    return {"message": "Item added to favorites"}

# GET endpoint to fetch all favorites for the logged-in user
@app.get("/api/favorites")
async def get_favorites(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    favorites_ids = user.get("favorites", [])
    favorites_list = []
    
    if favorites_ids:
        for fav_id in favorites_ids:
            # Use a Redis key based on product id
            key = f"product:{str(fav_id)}"
            cached_product = await redis_client.get(key)
            if cached_product:
                product = json.loads(cached_product)
            else:
                product = await db["products"].find_one({"_id": fav_id})
                if product:
                    product["_id"] = str(product["_id"])
                    product["brand_id"] = str(product["brand_id"])
                    # Cache the product details in Redis for future requests
                    await redis_client.set(key, json.dumps(product, default=str))
            if product:
                favorites_list.append(product)
    return favorites_list


# DELETE endpoint to remove a product from favorites
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
        {"$pull": {"favorites": ObjectId(product_id)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Favorite not found")
    return {"message": "Favorite removed"}
