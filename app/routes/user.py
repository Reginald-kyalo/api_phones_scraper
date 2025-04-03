from fastapi import APIRouter, HTTPException
from bson import ObjectId

from app.models import AuthRequest
from app.database import db
from app.auth import create_token, pwd_context

router = APIRouter()

@router.post("/api/signup")
async def signup(auth: AuthRequest):
    existing_user = await db["users"].find_one({"email": auth.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists.")
    hashed_password = pwd_context.hash(auth.password)
    user_data = {
        "email": auth.email,
        "password_hash": hashed_password,
        "favorites": []
    }
    result = await db["users"].insert_one(user_data)
    user_id = str(result.inserted_id)
    token = create_token(user_id, auth.email)
    return {"token": token, "user_id": user_id}

@router.post("/api/signin")
async def signin(auth: AuthRequest):
    user = await db["users"].find_one({"email": auth.email})
    if not user or not pwd_context.verify(auth.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials or user does not exist.")
    token = create_token(str(user["_id"]), user["email"])
    return {"token": token, "user_id": str(user["_id"])}
