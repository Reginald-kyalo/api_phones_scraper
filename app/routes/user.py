import re
import logging
from fastapi import APIRouter, HTTPException, Request, Depends, Response
from bson import ObjectId
from pydantic import EmailStr, validator
from datetime import datetime, timedelta
from typing import Dict, Optional
import secrets
import redis
import json
import jwt

from app.models import AuthRequest
from app.database import db, redis_client
from app.auth import REFRESH_COOKIE_NAME, pwd_context, verify_token, create_tokens, set_auth_cookies, clear_auth_cookies
from app.config import settings  # Add this import for Redis settings

# Configure logger for security events
security_logger = logging.getLogger("security")

router = APIRouter()

MAX_LOGIN_ATTEMPTS = 10
LOCKOUT_PERIOD = 1  # minutes

def log_security_event(event_type, details, request=None):
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "event": event_type,
        "details": details,
    }
    
    if request:
        log_data["ip"] = request.client.host
        log_data["user_agent"] = request.headers.get("user-agent", "")
    
    security_logger.info(json.dumps(log_data))
    
    # Write to specialized log file
    with open("security_events.log", "a") as f:
        f.write(json.dumps(log_data) + "\n")

async def validate_email(email: str) -> str:
    """Validate email format and sanitize input"""
    # Basic email format validation
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_pattern, email):
        log_security_event("Invalid email format attempt", {"email": email})
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Check email length to prevent DoS attacks
    if len(email) > 100:
        log_security_event("Excessively long email attempted", {"email_length": len(email)})
        raise HTTPException(status_code=400, detail="Email too long")
        
    return email.lower().strip()  # Normalize email

async def validate_password(password: str) -> str:
    """Basic password sanitization and validation"""
    # Minimum length check - keeping it simple
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    # Prevent extremely long passwords (DoS protection)
    if len(password) > 72:  # bcrypt limit
        raise HTTPException(status_code=400, detail="Password too long")
    
    # Basic sanitization - check for potentially problematic characters
    if '\0' in password:  # Null byte
        log_security_event("Attempt to use null byte in password", {"password": password})
        raise HTTPException(status_code=400, detail="Invalid password format")
    
    # You can add more basic checks here if needed
    
    return password  # Return the password unchanged for bcrypt hashing

async def check_rate_limit(ip: str, email: str = None):
    """Redis-based rate limiting"""
    key = f"login_attempts:{ip}"
    count = redis_client.get(key)
    
    if count and int(count) >= MAX_LOGIN_ATTEMPTS:
        # Check if we're still in lockout period
        ttl = redis_client.ttl(key)
        if ttl > 0:
            minutes_left = int(ttl / 60) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Too many login attempts. Try again in {minutes_left} minutes"
            )
    
    # Increment counter with expiration
    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, LOCKOUT_PERIOD * 60)  # Convert minutes to seconds
    pipe.execute()

async def detect_suspicious_activity(user_id: str, request: Request) -> bool:
    """Detect potentially suspicious login activity"""
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        return False
        
    # Check for unusual IP
    new_ip = request.client.host
    last_ip = user.get("last_ip")
    
    # Check for login from different country/unusual time
    # This would require IP geolocation service in production
    
    if last_ip and new_ip != last_ip:
        # Log potential suspicious activity
        log_security_event("Login from new IP", {"new_ip": new_ip, "email": user["email"]}, request)
        
        # In production, you might send an email notification here
        
    # Update last IP
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"last_ip": new_ip}}
    )
    
    return False

def extract_username_from_email(email: str) -> str:
    """
    Extract a user-friendly display name from email address
    Example: john.doe@example.com -> John Doe
    """
    if not email or '@' not in email:
        return "User"
        
    # Extract part before the @ symbol
    username = email.split('@')[0]
    
    # Replace common separators with spaces
    username = username.replace('.', ' ').replace('-', ' ').replace('_', ' ')
    
    # Capitalize each word for a nice display
    username = ' '.join(word.capitalize() for word in username.split())
    
    return username

@router.post("/api/signup")
async def signup(user_data: AuthRequest, response: Response):
    # Validate and sanitize inputs
    email = await validate_email(user_data.email)
    password = await validate_password(user_data.password)
    
    # Check if user already exists
    existing_user = await db["users"].find_one({"email": email})
    if existing_user:
        log_security_event("Signup attempt for existing email", {"email": email})
        # More specific error message
        raise HTTPException(status_code=400, detail="Email address is already registered")
    
    # Hash password with appropriate cost factor
    hashed_password = pwd_context.hash(password)
    
    # Extract name from email if not provided
    name = user_data.name if hasattr(user_data, 'name') and user_data.name else extract_username_from_email(user_data.email)
    
    # Create user with the extracted name
    new_user = {
        "email": email,
        "password_hash": hashed_password,
        "name": name,  # Use the extracted name
        "favorites": [],
        "created_at": datetime.now(),
        "last_login": None,
        "failed_login_attempts": 0
    }
    
    result = await db["users"].insert_one(new_user)
    user_id = str(result.inserted_id)
    tokens = create_tokens(user_id, email)
    
    # SET COOKIES HERE (you were missing this)
    set_auth_cookies(response, tokens)
    
    log_security_event("New user registered", {"email": email})
    
    # Return same format as login endpoint
    return {
        "email": email,
        "name": name,
        "user_id": user_id
    }

@router.post("/api/login")
async def login(user_data: AuthRequest, request: Request, response: Response):
    client_ip = request.client.host
    
    # Rate limiting check
    await check_rate_limit(client_ip)
    
    # Validate and sanitize inputs
    try:
        email = await validate_email(user_data.email)
    except HTTPException:
        # Increment failed attempt counter using Redis instead of in-memory dict
        redis_client.incr(f"login_attempts:{client_ip}")
        redis_client.expire(f"login_attempts:{client_ip}", LOCKOUT_PERIOD * 60)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Find user - don't leak if email exists or not
    user = await db["users"].find_one({"email": email})
    
    # Use constant-time comparison to prevent timing attacks
    if not user or not pwd_context.verify(user_data.password, user["password_hash"]):
        # Log failed attempt
        log_security_event("Failed login attempt", {"email": email}, request)
        
        # Increment failed attempts in database
        if user:
            await db["users"].update_one(
                {"_id": user["_id"]},
                {"$inc": {"failed_login_attempts": 1}}
            )
        
        # Increment rate limiting counter in Redis
        redis_client.incr(f"login_attempts:{client_ip}")
        redis_client.expire(f"login_attempts:{client_ip}", LOCKOUT_PERIOD * 60)
            
        # Don't reveal which part of credentials is wrong
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Reset failed login attempts on successful login
    await db["users"].update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "failed_login_attempts": 0,
                "last_login": datetime.now()
            }
        }
    )
    
    # Generate tokens
    tokens = create_tokens(str(user["_id"]), email)
    
    # Set auth cookies
    set_auth_cookies(response, tokens)
    
    log_security_event("Successful login", {"email": email}, request)
    
    # Reset rate limiting counter on successful login
    redis_client.delete(f"login_attempts:{client_ip}")
    
    # Detect suspicious activity
    await detect_suspicious_activity(str(user["_id"]), request)
    
    # Extract username if no name exists
    name = user.get("name")
    if not name:
        name = extract_username_from_email(user_data.email)
    
    return {
        "email": user["email"],
        "name": name  # Now returns the extracted name
    }

@router.post("/api/request-password-reset")
async def request_password_reset(email_request: Dict[str, str], request: Request):
    email = await validate_email(email_request.get("email"))
    
    # Generate reset token and store in database with expiration
    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.now() + timedelta(hours=1)
    
    # Always return success even if email doesn't exist (security)
    await db["password_resets"].insert_one({
        "email": email,
        "token": reset_token,
        "expires_at": expiry,
        "used": False
    })
    
    # In production, send actual email
    log_security_event("Password reset requested", {"email": email}, request)
    
    return {"message": "If your email is registered, you will receive reset instructions"}

@router.post("/api/logout")
async def logout(
    request: Request,
    response: Response,
    token_data: dict = Depends(verify_token)
):
    # Revoke the token
    jti = token_data.get("jti")
    if jti:
        # Add token to blacklist with the same expiry as the token
        exp_time = datetime.fromtimestamp(token_data["exp"]) - datetime.now()
        redis_client.setex(f"revoked_token:{jti}", int(exp_time.total_seconds()), 1)
    
    # Clear cookies
    clear_auth_cookies(response)
    
    return {"message": "Logged out successfully"}

@router.post("/api/refresh")
async def refresh_token(
    request: Request,
    response: Response
):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
        
    try:
        # Verify the refresh token
        for secret_key in settings.VALID_SECRET_KEYS:
            try:
                payload = jwt.decode(
                    refresh_token, 
                    secret_key, 
                    algorithms=["HS256"]
                )
                
                # Check token type
                if payload.get("type") != "refresh":
                    raise HTTPException(status_code=401, detail="Invalid token type")
                    
                # Generate new tokens
                tokens = create_tokens(payload["sub"], payload.get("email", ""))
                
                # Set new cookies
                set_auth_cookies(response, tokens)
                
                # Invalidate old refresh token
                jti = payload.get("jti")
                if jti:
                    exp_time = datetime.fromtimestamp(payload["exp"]) - datetime.now()
                    redis_client.setex(f"revoked_token:{jti}", int(exp_time.total_seconds()), 1)
                    
                return {"message": "Token refreshed successfully"}
            except jwt.PyJWTError:
                continue
                
        # If we get here, token couldn't be verified with any key
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token refresh failed: {str(e)}")

@router.get("/api/verify-session")
async def verify_session(payload = Depends(verify_token)):
    """Check if user's session is valid and return basic user info"""
    # Get user from database
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Extract name if it doesn't exist
    name = user.get("name")
    if not name:
        name = extract_username_from_email(user.get("email", ""))
    
    return {
        "authenticated": True,
        "username": name,  # Now returns the extracted name
        "email": user.get("email", ""),
        "user_id": payload["sub"]
    }