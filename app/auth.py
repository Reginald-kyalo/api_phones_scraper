from fastapi import HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
import jwt
from app.config import settings
from datetime import datetime, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)  # Make Bearer auth optional to support both methods
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Cookie settings
COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"
SECURE_COOKIES = True  # Set to False in development, True in production

def set_auth_cookies(response: Response, tokens: dict):
    """Set authentication cookies with proper security flags"""
    response.set_cookie(
        key=COOKIE_NAME,
        value=tokens["access_token"],
        httponly=True,              # Prevents JavaScript access
        secure=SECURE_COOKIES,      # Requires HTTPS in production
        samesite="lax",             # Prevents CSRF in modern browsers
        max_age=3600,               # 1 hour
        path="/"
    )
    
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=tokens["refresh_token"],
        httponly=True,
        secure=SECURE_COOKIES,
        samesite="lax",
        max_age=7*24*3600,          # 7 days
        path="/api/refresh"         # Restrict to refresh endpoint only
    )

def clear_auth_cookies(response: Response):
    """Clear authentication cookies"""
    response.delete_cookie(key=COOKIE_NAME, path="/")
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/refresh")

async def get_token_from_cookie_or_bearer(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract the token from either cookie or bearer auth"""
    # First check for bearer token
    if credentials and credentials.credentials:
        return credentials.credentials
    
    # Then check for cookie
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    return token

def verify_token(request: Request, token: str = Depends(get_token_from_cookie_or_bearer)):
    """Verify the token from either cookie or bearer"""
    # First decode without verification to extract jti for revocation check
    try:
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        token_id = unverified_payload.get("jti")
        
        # Check if token has been revoked
        if token_id and is_token_revoked(token_id):
            raise HTTPException(status_code=401, detail="Token has been revoked")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token format")
    valid_keys = settings.VALID_SECRET_KEYS
    # Try all valid keys for verification
    for secret_key in valid_keys:
        try:
            payload = jwt.decode(
                token, 
                secret_key, 
                algorithms=["HS256"],
                options={"verify_signature": True, "require_exp": True}
            )
            return payload
        except jwt.PyJWTError:
            continue  # Try next key
    
    # If we get here, token couldn't be verified with any key
    raise HTTPException(status_code=401, detail="Invalid token")

def is_token_revoked(token_id: str) -> bool:
    """Check if a token has been revoked"""
    from app.routes.user import redis_client
    return bool(redis_client.exists(f"revoked_token:{token_id}"))

def create_tokens(user_id: str, email: str) -> dict:
    """Create both access and refresh tokens"""
    # Access token - short lived (1 hour)
    access_payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=1),
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),
        "type": "access"
    }
    
    # Refresh token - longer lived (7 days)
    refresh_payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),
        "type": "refresh"
    }
    
    access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm="HS256")
    refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm="HS256")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }