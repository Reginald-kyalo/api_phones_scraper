import asyncio
import logging
from datetime import datetime
from bson import ObjectId

from app.database import db
from app.utils.email import send_email  # Adjust based on your actual email utility

logger = logging.getLogger(__name__)

async def check_product_price(product_id):
    """Check current price of a product."""
    try:
        product = await db["phones"].find_one({"_id": product_id})
        if not product:
            logger.warning(f"Product {product_id} not found during price check")
            return None
        
        return {
            "product_id": product_id,
            "price": product.get("latest_price", {}).get("amount", 0),
            "price_date": product.get("latest_price", {}).get("date", datetime.now())
        }
    except Exception as e:
        logger.error(f"Error checking price for product {product_id}: {str(e)}")
        return None

async def process_price_alert(alert):
    """Process a single price alert."""
    try:
        product_id = alert["product_id"]
        price_info = await check_product_price(product_id)
        
        if not price_info:
            return False
        
        current_price = price_info["price"]
        was_triggered = alert["triggered"]
        
        # Only update if price has changed
        if current_price != alert["current_price"]:
            now_triggered = current_price <= alert["target_price"]
            newly_triggered = now_triggered and not was_triggered
            
            # Update the alert with new price information
            await db["price_alerts"].update_one(
                {"_id": alert["_id"]},
                {"$set": {
                    "current_price": current_price,
                    "triggered": now_triggered,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Send notification if newly triggered
            if newly_triggered:
                user = await db["users"].find_one({"_id": alert["user_id"]})
                if user:
                    await send_email(
                        to_email=alert["email"],
                        subject=f"Price Drop Alert: {alert['product']['name']}",
                        body=f"Good news! The price for {alert['product']['brand']} {alert['product']['name']} has dropped to {current_price}.",
                        html_body=f"""
                        <h2>Price Alert Triggered!</h2>
                        <p>Good news! The price for <strong>{alert['product']['brand']} {alert['product']['name']}</strong> 
                        has dropped to <strong>${current_price}</strong>, which is below your target price of ${alert['target_price']}.</p>
                        <p><a href="https://yoursite.com/product/{alert['product']['id']}">View product details</a></p>
                        """
                    )
                    logger.info(f"Price alert notification sent to {alert['email']} for {product_id}")
            
            logger.debug(f"Updated price alert {alert['_id']} with new price {current_price}")
            return True
            
        return True
    except Exception as e:
        logger.error(f"Error processing price alert {alert.get('_id', 'unknown')}: {str(e)}")
        return False

async def monitor_price_alerts():
    """Monitor all price alerts for price changes."""
    try:
        # Count alerts before processing for logging
        total_count = await db["price_alerts"].count_documents({})
        logger.info(f"Starting price monitoring for {total_count} alerts")
        
        # Use a batch size to avoid memory issues with large datasets
        batch_size = 100
        processed = 0
        updated = 0
        
        # Process alerts in batches
        cursor = db["price_alerts"].find({})
        batch = []
        
        async for alert in cursor:
            batch.append(alert)
            
            if len(batch) >= batch_size:
                tasks = [process_price_alert(a) for a in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                processed += len(batch)
                updated += sum(1 for r in results if r is True)
                logger.info(f"Processed {processed}/{total_count} price alerts, updated {updated}")
                batch = []
        
        # Process any remaining alerts
        if batch:
            tasks = [process_price_alert(a) for a in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            processed += len(batch)
            updated += sum(1 for r in results if r is True)
        
        logger.info(f"Completed price monitoring. Processed {processed}/{total_count} alerts, updated {updated}")
        return processed
    except Exception as e:
        logger.error(f"Error in price monitoring: {str(e)}")
        return 0