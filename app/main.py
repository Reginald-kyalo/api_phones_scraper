from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
import logging

from app.config import settings
from app.database import init_db, close_db
from app.routes import home, user, favorites, price_alerts
from app.utils.cache import update_aggregated_products_cache

logger = logging.getLogger(__name__)

async def lifespan(app: FastAPI):
    # Startup: Initialize caches and databases
    await init_db()
    await update_aggregated_products_cache()
    logger.info("Startup complete")
    yield
    # Shutdown: Close database connections
    await close_db()
    logger.info("Shutdown complete")

app = FastAPI(title="Phone Price Comparison API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Register routes
app.include_router(home.router)
app.include_router(user.router)
app.include_router(favorites.router)
app.include_router(price_alerts.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)