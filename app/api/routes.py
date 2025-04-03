from fastapi import APIRouter, HTTPException
from app.scraper.engine import scrape_phones
from app.models.phone import Phone, PhoneList

router = APIRouter(prefix="/api")

@router.get("/phones", response_model=PhoneList)
async def get_phones(brand: str = None):
    """Get phones, optionally filtered by brand"""
    try:
        phones = scrape_phones(brand=brand)
        return {"phones": phones}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))