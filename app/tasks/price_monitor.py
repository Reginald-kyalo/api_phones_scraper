import asyncio
import logging
from datetime import datetime
from bson import ObjectId

from app.database import db
from app.utils.send_email import send_email  # Adjust based on your actual email utility
from app.utils.cache import get_brands_models_cache
logger = logging.getLogger(__name__)

async def determine_least_product_price(brand, model):
    """Check current price of a product and return the lowest price found."""
    try:
        cursor = db["phones"].find({"brand": brand.lower(), "model": model})
        products = await cursor.to_list(length=None)
        if not products:
            logger.warning(f"No products found for {brand} {model}")
            return None
            
        brands_models_cache = await get_brands_models_cache()
        if not brands_models_cache:
            logger.error("Brands and models cache is empty, cannot determine product price.")
            return None
            
        brand_data = brands_models_cache.get(brand.lower())
        if not brand_data:
            logger.error(f"Brand data not found for '{brand}'. Available brands: {list(brands_models_cache.keys())}")
            return None
        
        # Find the product with the lowest price
        lowest_price_product = None
        lowest_price = float('inf')
        
        for product in products:
            latest_price = product.get("latest_price", {})
            if latest_price:
                price_amount = latest_price.get("amount", 0)
                if price_amount > 0 and price_amount < lowest_price:
                    lowest_price = price_amount
                    lowest_price_product = product
        
        if lowest_price_product:
            return {
                "product_id": str(lowest_price_product["_id"]),
                "brand": lowest_price_product["brand"],
                "model": lowest_price_product["model"],
                "model_image": next((m["model_image"] for m in brand_data["models"] if m["model"].lower() == model.lower()), ""),
                "price": lowest_price,
                "price_date": lowest_price_product.get("latest_price", {}).get("date", None)
            }
        return None
        
    except Exception as e:
        logger.error(f"Error checking price for product {brand} {model}: {str(e)}")
        return None

async def process_price_alert(alert):
    """Process a single price alert."""
    try:
        brand = alert["product"]["brand"]
        model = alert["product"]["model"]
        price_info = await determine_least_product_price(brand, model)
        
        if not price_info:
            return False
        
        current_price = price_info["price"]
        was_triggered = alert["triggered"]
        
        # Only update if price has changed
        if current_price != alert.get("current_price", 0):
            now_triggered = current_price <= alert["target_price"]
            newly_triggered = now_triggered and not was_triggered
            
            # Fixed: Use proper field names for update
            update_filter = {"alert_id": alert.get("alert_id")}
            
            await db["price_alerts"].update_one(
                update_filter,
                {"$set": {
                    "current_price": current_price,
                    "triggered": now_triggered,
                    "updated_at": datetime.now()
                }}
            )
            
            # Send notification if newly_triggered
            if newly_triggered:
                user = await db["users"].find_one({"_id": alert["user_id"]})
                if user:
                    # Create pretty HTML email with product image
                    html_body = f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Price Drop Alert</title>
                        <style>
                            body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
                            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }}
                            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }}
                            .header h1 {{ margin: 0; font-size: 28px; font-weight: bold; }}
                            .content {{ padding: 30px 20px; }}
                            .product-card {{ border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; background-color: #fafafa; margin: 20px 0; }}
                            .product-image {{ text-align: center; margin-bottom: 20px; }}
                            .product-image img {{ max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }}
                            .product-title {{ font-size: 24px; font-weight: bold; color: #333; text-align: center; margin-bottom: 15px; }}
                            .price-info {{ text-align: center; margin: 20px 0; }}
                            .current-price {{ font-size: 32px; font-weight: bold; color: #27ae60; margin: 10px 0; }}
                            .target-price {{ font-size: 16px; color: #666; }}
                            .savings {{ background-color: #e8f5e8; color: #27ae60; padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; margin: 15px 0; }}
                            .cta-button {{ text-align: center; margin: 30px 0; }}
                            .cta-button a {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; transition: transform 0.2s; }}
                            .cta-button a:hover {{ transform: translateY(-2px); }}
                            .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }}
                            .alert-icon {{ font-size: 48px; margin-bottom: 10px; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <div class="alert-icon">🔔</div>
                                <h1>Price Drop Alert!</h1>
                                <p>Your target price has been reached</p>
                            </div>
                            
                            <div class="content">
                                <div class="product-card">
                                    {f'<div class="product-image"><img src="{price_info["model_image"]}" alt="{brand} {model}" onerror="this.style.display=\'none\'"></div>' if price_info.get("model_image") else ''}
                                    
                                    <div class="product-title">{brand.title()} {model.title()}</div>
                                    
                                    <div class="price-info">
                                        <div class="current-price">KSH {current_price:,.0f}</div>
                                        <div class="target-price">Target Price: KSH {alert['target_price']:,.0f}</div>
                                    </div>
                                    
                                    <div class="savings">
                                        💰 You're saving KSH {(alert['target_price'] - current_price):,.0f}!
                                    </div>
                                </div>
                                
                                <p style="text-align: center; color: #666; font-size: 16px;">
                                    Great news! The price for <strong>{brand.title()} {model.title()}</strong> 
                                    has dropped to <strong>KSH {current_price:,.0f}</strong>, which is 
                                    below your target price of <strong>KSH {alert['target_price']:,.0f}</strong>.
                                </p>
                                
                                <div class="cta-button">
                                    <a href="https://dealsonline.ninja/?brand={brand}&model={model}" target="_blank">
                                        🛒 View Deal Now
                                    </a>
                                </div>
                                
                                <p style="text-align: center; color: #999; font-size: 14px;">
                                    Price updated on: {price_info.get('price_date', datetime.now().strftime('%Y-%m-%d %H:%M'))}
                                </p>
                            </div>
                            
                            <div class="footer">
                                <p>This alert was sent because you requested price monitoring for {brand.title()} {model.title()}.</p>
                                <p>© 2025 Phone Deals Price Monitor | <a href="https://dealsonline.ninja" style="color: #667eea;">Visit our website</a></p>
                            </div>
                        </div>
                    </body>
                    </html>
                    """
                    
                    await send_email(
                        to_email="reginald.kyalo@gmail.com",
                        subject=f"🔔 Price Drop Alert: {brand.title()} {model.title()} - Now KSH {current_price:,.0f}!",
                        body=f"Good news! The price for {brand.title()} {model.title()} has dropped to KSH {current_price:,.0f}, which is below your target price of KSH {alert['target_price']:,.0f}. View details at: https://dealsonline.ninja/?brand={brand}&model={model}",
                        html_body=html_body
                    )
                    logger.info(f"Price alert notification sent to {alert['email']} for {brand} {model}")
            
            logger.debug(f"Updated price alert {alert['_id']} with new price {current_price}")
            return True
            
        return True
    except Exception as e:
        logger.error(f"Error processing price alert {alert.get('alert_id')}: {str(e)}")
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
            if not alert:
                logger.error("Alert missing in cursor")
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
    
if __name__ == "__main__":
    # Run the price monitoring task
    loop = asyncio.get_event_loop()
    loop.run_until_complete(monitor_price_alerts())
    loop.close()