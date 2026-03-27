"""
Payment Routes - Handle subscription payments and M-Pesa integration
Supports M-Pesa STK Push, card payments, and subscription management
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta
import requests
import base64
from app.auth import get_current_user
from app.database import db
import os

router = APIRouter(tags=["payment"])

# Pricing tiers
PRICING_TIERS = {
    "free": {"alerts": 5, "price": 0, "duration": None},
    "basic": {"alerts": 50, "price": 100, "duration": "monthly"},
    "premium": {"alerts": -1, "price": 200, "duration": "monthly"}  # -1 = unlimited
}

# M-Pesa Configuration
MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "12BXjyNrUlv7b2HMrRmCxtJdfNnW")
MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "YOUR_SECRET")
MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379")
MPESA_PASSKEY = os.getenv("MPESA_PASSKEY", "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919")
MPESA_ENVIRONMENT = os.getenv("MPESA_ENVIRONMENT", "sandbox")  # sandbox or production

# M-Pesa API URLs
MPESA_BASE_URL = "https://sandbox.safaricom.co.ke" if MPESA_ENVIRONMENT == "sandbox" else "https://api.safaricom.co.ke"


class MpesaPaymentRequest(BaseModel):
    phone_number: str = Field(..., description="Phone number in format 254XXXXXXXXX")
    amount: int = Field(..., gt=0, description="Amount to pay in KSh")
    tier: str = Field(..., description="Subscription tier: basic or premium")
    description: str = Field(default="Price Alerts Subscription")


class PaymentStatusQuery(BaseModel):
    checkout_request_id: str


# Helper Functions
def get_mpesa_access_token():
    """Get M-Pesa OAuth access token"""
    auth_url = f"{MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
    
    try:
        response = requests.get(
            auth_url,
            auth=(MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET)
        )
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        print(f"Failed to get M-Pesa access token: {e}")
        raise HTTPException(status_code=500, detail="Payment service unavailable")


def generate_mpesa_password(timestamp: str):
    """Generate M-Pesa password"""
    data_to_encode = f"{MPESA_SHORTCODE}{MPESA_PASSKEY}{timestamp}"
    encoded = base64.b64encode(data_to_encode.encode())
    return encoded.decode('utf-8')


# Routes
@router.post("/api/mpesa/initiate")
async def initiate_mpesa_payment(
    payment: MpesaPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Initiate M-Pesa STK Push payment
    """
    from bson import ObjectId
    user_id = ObjectId(current_user["_id"]) if isinstance(current_user["_id"], str) else current_user["_id"]
    
    # Validate tier
    if payment.tier not in PRICING_TIERS or payment.tier == "free":
        raise HTTPException(status_code=400, detail="Invalid subscription tier")
    
    tier_info = PRICING_TIERS[payment.tier]
    
    # Validate amount matches tier price
    if payment.amount != tier_info["price"]:
        raise HTTPException(status_code=400, detail="Amount doesn't match tier price")
    
    # Generate timestamp
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = generate_mpesa_password(timestamp)
    
    # Get access token
    access_token = get_mpesa_access_token()
    
    # Prepare STK Push request
    stk_push_url = f"{MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "BusinessShortCode": MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": payment.amount,
        "PartyA": int(payment.phone_number),
        "PartyB": MPESA_SHORTCODE,
        "PhoneNumber": int(payment.phone_number),
        "CallBackURL": f"{os.getenv('APP_URL', 'https://yourdomain.com')}/api/payment/mpesa/callback",
        "AccountReference": current_user["email"],
        "TransactionDesc": payment.description
    }
    
    try:
        response = requests.post(stk_push_url, json=payload, headers=headers, timeout=30)
        result = response.json()
        
        if result.get("ResponseCode") == "0":
            # Store payment request in database
            await db.payments.insert_one({
                "user_id": user_id,
                "checkout_request_id": result["CheckoutRequestID"],
                "merchant_request_id": result["MerchantRequestID"],
                "tier": payment.tier,
                "amount": payment.amount,
                "phone_number": payment.phone_number,
                "status": "pending",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            return {
                "ResponseCode": "0",
                "ResponseDescription": "Success. Request accepted for processing",
                "CheckoutRequestID": result["CheckoutRequestID"]
            }
        else:
            return {
                "ResponseCode": result.get("ResponseCode", "1"),
                "ResponseDescription": result.get("ResponseDescription", "Payment request failed"),
                "message": "Payment request failed. Please try again."
            }
            
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Payment request timeout. Please try again.")
    except Exception as e:
        print(f"M-Pesa STK Push error: {e}")
        raise HTTPException(status_code=500, detail="Payment request failed")


@router.post("/api/mpesa/callback")
async def mpesa_callback(callback_data: dict, background_tasks: BackgroundTasks):
    """
    Handle M-Pesa payment callback
    """
    try:
        result_code = callback_data["Body"]["stkCallback"]["ResultCode"]
        checkout_request_id = callback_data["Body"]["stkCallback"]["CheckoutRequestID"]
        
        # Find payment record
        payment = await db.payments.find_one({"checkout_request_id": checkout_request_id})
        
        if not payment:
            return {"ResultCode": 1, "ResultDesc": "Payment record not found"}
        
        if result_code == 0:
            # Payment successful
            callback_metadata = callback_data["Body"]["stkCallback"]["CallbackMetadata"]["Item"]
            mpesa_receipt = next((item["Value"] for item in callback_metadata if item["Name"] == "MpesaReceiptNumber"), None)
            
            # Update payment status
            await db.payments.update_one(
                {"checkout_request_id": checkout_request_id},
                {
                    "$set": {
                        "status": "completed",
                        "mpesa_receipt": mpesa_receipt,
                        "completed_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Activate subscription
            background_tasks.add_task(activate_subscription, payment["user_id"], payment["tier"])
            
        else:
            # Payment failed
            await db.payments.update_one(
                {"checkout_request_id": checkout_request_id},
                {
                    "$set": {
                        "status": "failed",
                        "result_desc": callback_data["Body"]["stkCallback"]["ResultDesc"],
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        
        return {"ResultCode": 0, "ResultDesc": "Success"}
        
    except Exception as e:
        print(f"M-Pesa callback error: {e}")
        return {"ResultCode": 1, "ResultDesc": "Callback processing failed"}


@router.get("/api/mpesa/status/{checkout_request_id}")
async def check_payment_status(
    checkout_request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Check payment status
    """
    from bson import ObjectId
    user_id = ObjectId(current_user["_id"]) if isinstance(current_user["_id"], str) else current_user["_id"]
    
    payment = await db.payments.find_one({
        "checkout_request_id": checkout_request_id,
        "user_id": user_id
    })
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] == "completed":
        # Get subscription details
        subscription = await db.subscriptions.find_one({"user_id": user_id})
        return {
            "status": "completed",
            "subscription": {
                "tier": subscription["tier"],
                "tier_name": subscription["tier_name"],
                "alerts_limit": subscription["alerts_limit"],
                "expires_at": subscription.get("expires_at")
            }
        }
    elif payment["status"] == "failed":
        return {"status": "failed", "reason": payment.get("result_desc", "Payment failed")}
    else:
        return {"status": "pending"}


@router.get("/api/subscription/status")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    """
    Get current subscription status
    """
    from bson import ObjectId
    user_id = ObjectId(current_user["_id"]) if isinstance(current_user["_id"], str) else current_user["_id"]
    
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        # Create free tier subscription
        subscription = {
            "user_id": user_id,
            "tier": "free",
            "tier_name": "Free",
            "alerts_limit": PRICING_TIERS["free"]["alerts"],
            "alerts_used": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.subscriptions.insert_one(subscription)
    
    # Count all alerts for user (no is_active field, alerts are deleted when removed)
    alerts_count = await db.price_alerts.count_documents({
        "user_id": user_id
    })
    
    subscription["alerts_used"] = alerts_count
    
    return subscription


@router.post("/api/subscription/activate-free")
async def activate_free_tier(current_user: dict = Depends(get_current_user)):
    """
    Activate free tier subscription
    """
    from bson import ObjectId
    user_id = ObjectId(current_user["_id"]) if isinstance(current_user["_id"], str) else current_user["_id"]
    
    # Check if subscription exists
    existing = await db.subscriptions.find_one({"user_id": user_id})
    
    if existing:
        return {"message": "Subscription already exists", "subscription": existing}
    
    # Create free subscription
    subscription = {
        "user_id": user_id,
        "tier": "free",
        "tier_name": "Free",
        "alerts_limit": PRICING_TIERS["free"]["alerts"],
        "alerts_used": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await db.subscriptions.insert_one(subscription)
    
    return {"message": "Free tier activated", "subscription": subscription}


@router.get("/api/subscription/can-create-alert")
async def can_create_alert(current_user: dict = Depends(get_current_user)):
    """
    Check if user can create a new price alert
    """
    from bson import ObjectId
    user_id = ObjectId(current_user["_id"]) if isinstance(current_user["_id"], str) else current_user["_id"]
    
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        # No subscription = create free tier subscription
        subscription = {
            "user_id": user_id,
            "tier": "free",
            "tier_name": "Free",
            "alerts_limit": PRICING_TIERS["free"]["alerts"],
            "alerts_used": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.subscriptions.insert_one(subscription)
        alerts_limit = PRICING_TIERS["free"]["alerts"]
    else:
        alerts_limit = subscription["alerts_limit"]
    
    # Count all alerts for user (no is_active field, alerts are deleted when removed)
    alerts_count = await db.price_alerts.count_documents({
        "user_id": user_id
    })
    
    # -1 means unlimited
    can_create = alerts_limit == -1 or alerts_count < alerts_limit
    
    return {
        "can_create": can_create,
        "alerts_used": alerts_count,
        "alerts_limit": alerts_limit,
        "tier": subscription["tier"] if subscription else "free"
    }


# Helper function to activate subscription
async def activate_subscription(user_id, tier):
    """
    Activate paid subscription after successful payment
    """
    tier_info = PRICING_TIERS[tier]
    
    # Calculate expiry date (30 days for monthly)
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    # Update or create subscription
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "tier": tier,
                "tier_name": tier.capitalize(),
                "alerts_limit": tier_info["alerts"],
                "expires_at": expires_at,
                "updated_at": datetime.utcnow()
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow(),
                "alerts_used": 0
            }
        },
        upsert=True
    )
    
    print(f"Subscription activated for user {user_id}: {tier}")
