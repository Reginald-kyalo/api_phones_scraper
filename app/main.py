from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.database import init_db, close_db
from app.routes import home, user, favorites, price_alerts
from app.utils.cache import update_aggregated_products_cache
from app.security.key_rotation import rotate_keys
from app.tasks.price_monitor import monitor_price_alerts

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = AsyncIOScheduler()

async def lifespan(app: FastAPI):
    # Check if key rotation is needed
    if settings.rotation_needed:
        try:
            rotate_keys()
            logger.info("Secret keys rotated on startup")
        except Exception as e:
            logger.error(f"Failed to rotate keys: {e}")
    
    # Startup: Initialize caches and databases
    await init_db()    
    # Setup APScheduler for price monitoring
    try:
        # Add job to run every hour (adjust the interval as needed)
        scheduler.add_job(
            monitor_price_alerts,
            trigger=IntervalTrigger(hours=1),
            id="price_monitoring_hourly",
            replace_existing=True
        )
        
        # Add a daily full refresh at midnight
        scheduler.add_job(
            monitor_price_alerts,
            trigger=CronTrigger(hour=0, minute=0),
            id="price_monitoring_daily",
            replace_existing=True
        )
        
        # Start the scheduler
        #scheduler.start()
        #logger.info("APScheduler started with price monitoring jobs")
    except Exception as e:
        logger.error(f"Failed to start APScheduler: {e}")
    
    logger.info("Startup complete")
    
    yield  # Application runs here
    
    # Shutdown: Close database connections and stop scheduler
    try:
        scheduler.shutdown()
        logger.info("APScheduler shutdown complete")
    except Exception as e:
        logger.error(f"Error shutting down APScheduler: {e}")
    
    await close_db()
    logger.info("Shutdown complete")

app = FastAPI(title="Phone Price Comparison API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:8000",
        "https://127.0.0.1:8000",
        ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

@app.middleware("http")
async def set_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response

# Register routes
app.include_router(home.router)
app.include_router(user.router)
app.include_router(favorites.router)
app.include_router(price_alerts.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)