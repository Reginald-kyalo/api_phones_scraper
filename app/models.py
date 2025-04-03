from pydantic import BaseModel
from typing import Optional

class AuthRequest(BaseModel):
    email: str
    password: str

class PriceAlertCreate(BaseModel):
    product_id: str
    target_price: float
    alternate_email: Optional[str] = None
