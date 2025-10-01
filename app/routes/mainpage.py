from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
import asyncio
import logging
import random

from app.database import get_products_collection, PRODUCT_CATEGORIES
from app.utils.cache import get_all_categories_cache, get_category_brands_models_cache

router = APIRouter()
logger = logging.getLogger(__name__)

def get_templates():
    return Jinja2Templates(directory="app/templates")

# Creative section titles for different categories
CATEGORY_SECTIONS = {
    "phones": [
        "New in Phones",
        "Trending Smartphones", 
        "Best Phone Deals",
        "Popular Models"
    ],
    "cosmetics": [
        "Popular in Cosmetics",
        "Beauty Essentials",
        "Trending Beauty",
        "Must-Have Cosmetics"
    ],
    "laptops": [
        "Latest Laptops",
        "Top Performance",
        "Best Laptop Deals",
        "Gaming & Work"
    ],
    "shoes": [
        "Trending Footwear",
        "Popular Shoes",
        "Style & Comfort",
        "Best Shoe Deals"
    ],
    "sound_systems": [
        "Audio Excellence", 
        "Premium Sound",
        "Top Audio Gear",
        "Sound Systems"
    ]
}

async def get_category_sample_data(category: str, limit: int = 6):
    """Get sample products from a specific category."""
    try:
        # Get category cache
        category_cache = await get_category_brands_models_cache(category)
        if not category_cache:
            return []
        
        # Get products collection for this category
        products_collection = await get_products_collection(category)
        if products_collection is None:
            return []
        
        sample_products = []
        brands_processed = 0
        max_brands = 4  # Limit to 4 brands for variety
        
        # Randomly select brands to get variety
        available_brands = list(category_cache.keys())
        selected_brands = random.sample(available_brands, min(max_brands, len(available_brands)))
        
        for brand in selected_brands:
            if len(sample_products) >= limit:
                break
                
            brand_data = category_cache[brand]
            # Get a random selection of models from this brand
            models_to_try = random.sample(brand_data["models"], min(2, len(brand_data["models"])))
            
            for model_info in models_to_try:
                if len(sample_products) >= limit:
                    break
                    
                # Get product data
                product_data = await get_comparison_data(brand, model_info["model"], category)
                if product_data:
                    sample_products.append(product_data)
        
        return sample_products
        
    except Exception as e:
        logger.error(f"Error getting sample data for {category}: {str(e)}")
        return []

async def get_comparison_data(brand: str, model: str, category: str):
    """Get comparison data for a specific product."""
    try:
        # Get the specific category cache
        category_cache = await get_category_brands_models_cache(category)
        brand_data = category_cache.get(brand.lower())
        if not brand_data:
            return None
        
        # Get the appropriate products collection
        products_collection = await get_products_collection(category)
        if products_collection is None:
            return None
            
        cursor = products_collection.find({
            "brand": brand,
            "model": {"$regex": f"^{model}$", "$options": "i"}
        })
        products = await cursor.to_list(length=None)
        if not products:
            return None
            
        products.sort(key=lambda x: x.get("latest_price", {}).get("amount", 0))
        cached_cheapest = products[0]
        
        price_comparison = [{
            "store": p.get("site_fetched").split(".")[0],
            "price": p.get("latest_price", {}).get("amount", 0),
            "product_url": p.get("product_url")
        } for p in products]
        
        # Get model image
        model_image = next((m["model_image"] for m in brand_data["models"] if m["model"].lower() == model.lower()), "")
        if not model_image:
            model_image = cached_cheapest.get("product_image", "")
            if not model_image:
                model_image = "https://via.placeholder.com/300x300/f0f0f0/666666?text=No+Image"
        
        result = {
            "category": category,
            "brand": brand,
            "model": model,
            "model_image": model_image,
            "cheapest_price": cached_cheapest.get("latest_price", {}).get("amount", 0),
            "product_id": cached_cheapest.get("product_id"),
            "price_comparison": price_comparison
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting comparison data for {brand} {model} in {category}: {str(e)}")
        return None

@router.get("/")
async def mainpage(request: Request):
    """Main landing page with products from all categories."""
    try:
        # Get all categories cache
        all_categories_cache = await get_all_categories_cache()
        
        # Prepare sections data
        sections_data = []
        
        # Create tasks for all categories
        tasks = []
        for category in PRODUCT_CATEGORIES.keys():
            if category in all_categories_cache and all_categories_cache[category]:
                tasks.append(get_category_sample_data(category, limit=8))
            else:
                # Create a simple async function that returns empty list
                async def empty_result():
                    return []
                tasks.append(empty_result())
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, category in enumerate(PRODUCT_CATEGORIES.keys()):
            result = results[i]
            if isinstance(result, Exception):
                logger.error(f"Error getting data for {category}: {str(result)}")
                continue
                
            if result:  # Only add sections with data
                section_title = random.choice(CATEGORY_SECTIONS[category])
                sections_data.append({
                    "category": category,
                    "title": section_title,
                    "products": result
                })
        
        # Sort sections to ensure phones is first if available
        sections_data.sort(key=lambda x: 0 if x["category"] == "phones" else 1)
        
        templates = get_templates()
        return templates.TemplateResponse("mainpage.html", {
            "request": request,
            "sections_data": sections_data,
            "categories": list(PRODUCT_CATEGORIES.keys()),
            "all_categories_cache": all_categories_cache,
        })
        
    except Exception as e:
        logger.error(f"Error in mainpage route: {str(e)}")
        # Fallback to basic template
        templates = get_templates()
        return templates.TemplateResponse("mainpage.html", {
            "request": request,
            "sections_data": [],
            "categories": list(PRODUCT_CATEGORIES.keys()),
            "all_categories_cache": {},
            "show_selector": True,  # Show category-brand selector on main page
            "selected_category": None,  # No specific category selected on main page
        })
