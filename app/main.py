import logging
from fastapi import FastAPI, Request, Query, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Phone Deals API", version="1.0.0")

# Enable CORS if needed (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and set up templates directory
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# MongoDB Connection (adjust URI for production)
client = AsyncIOMotorClient("mongodb://localhost:27017", serverSelectionTimeoutMS=5000)
db = client["phone_db"]

# Helper: Extract the latest price from a product document
def extract_latest_price(product: dict) -> int:
    prices = product.get("price", [])
    if prices:
        last_entry = prices[-1]
        amounts = last_entry.get("amount", [])
        if amounts:
            return amounts[-1].get("amount", 0)
    return 0

# Process documents for a brand
def process_brand_documents(documents, sort: str, min_price, max_price):
    brand_dict = {}
    for doc in documents:
        model_name = doc.get("model", "Unknown Model").lower()
        products = doc.get("products", [])
        valid_products = []
        for product in products:
            latest_price = extract_latest_price(product)
            product["latest_price"] = latest_price
            try:
                if min_price is not None and latest_price < int(min_price):
                    continue
                if max_price is not None and latest_price > int(max_price):
                    continue
            except ValueError:
                pass
            valid_products.append(product)
        if sort == "asc":
            valid_products.sort(key=lambda x: x.get("latest_price", 0))
        elif sort == "desc":
            valid_products.sort(key=lambda x: x.get("latest_price", 0), reverse=True)
        if valid_products:
            brand_dict[model_name] = valid_products
    return brand_dict

# Retrieve phone data based on search criteria
async def get_phone_data(query: str = None, model: str = None, sort: str = None,
                           min_price: str = None, max_price: str = None):
    phone_data = {}
    collections = await db.list_collection_names()
    phone_brands = [brand.lower() for brand in collections]
    if query:
        brand = query.lower()
        if brand in phone_brands:
            documents = await db[brand].find().to_list(100)
            brand_data = process_brand_documents(documents, sort, min_price, max_price)
            if model:
                model = model.lower()
                phone_data[brand] = { model: brand_data.get(model, []) }
            else:
                phone_data[brand] = brand_data
    else:
        for brand in phone_brands:
            documents = await db[brand].find().to_list(100)
            phone_data[brand] = process_brand_documents(documents, sort, min_price, max_price)
    return phone_data

# Home endpoint with Jinja rendering
@app.get("/")
async def home(
    request: Request,
    query: str = Query(None),
    model: str = Query(None),
    sort: str = Query(None),
    min_price: str = Query(None),
    max_price: str = Query(None),
    price: str = Query(None)  # Specific price filter if needed
):
    phones = await get_phone_data(query, model, sort, min_price, max_price)
    collections = await db.list_collection_names()

    # Build a dictionary mapping each brand to its distinct models
    models_by_brand = {}
    for brand in collections:
        docs = await db[brand].find().to_list(100)
        models = {doc.get("model") for doc in docs if doc.get("model")}
        models_by_brand[brand.lower()] = list(models)

    # Best deals configuration can be loaded from a dedicated collection or config
    best_deals = {}  # Example: {"apple": {"iphone 8": [product1, product2]}}

    return templates.TemplateResponse("index.html", {
        "request": request,
        "phones": phones,
        "brands": collections,
        "models_by_brand": models_by_brand,
        "best_deals": best_deals,
        "query": query,
        "model": model,
        "sort": sort,
        "min_price": min_price,
        "max_price": max_price,
        "price": price
    })
