"""
Category routes - Handles API endpoints for category navigation
"""
from fastapi import APIRouter, HTTPException
from app.database import getprice_db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/api/categories")
async def get_categories():
    """
    Get all categories with their subcategories structure from MongoDB
    Returns hierarchical category data for navigation
    """
    try:
        categories_collection = getprice_db["categories"]
        
        # Fetch all categories from MongoDB
        categories = await categories_collection.find(
            {},
            {
                "_id": 0,
                "name": 1,
                "category_id": 1,
                "icon_url": 1,
                "see_all_slug": 1,
                "subcategories": 1
            }
        ).sort("name", 1).to_list(length=None)
        
        logger.info(f"Retrieved {len(categories)} categories from database")
        
        return {
            "success": True,
            "categories": categories,
            "count": len(categories)
        }
        
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")


@router.get("/api/categories/{category_slug}")
async def get_category_details(category_slug: str):
    """
    Get detailed information about a specific category including all subcategories
    """
    try:
        categories_collection = getprice_db["categories"]
        
        # Find category by slug
        category = await categories_collection.find_one(
            {"see_all_slug": category_slug},
            {"_id": 0}
        )
        
        if not category:
            raise HTTPException(status_code=404, detail=f"Category '{category_slug}' not found")
        
        logger.info(f"Retrieved category: {category.get('name')}")
        
        return {
            "success": True,
            "category": category
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching category {category_slug}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching category: {str(e)}")
