from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import engine
from app.database.base import Base
import app.models  # Ensures all ORM models are registered before metadata.create_all

from app.routers import (
    vehicle_router,
    trip_router,
    maintenance_router,
    analytics_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler. Automatically creates database tables on startup.
    """
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Clean, Layered REST API Backend for Fleet Management Dashboard",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Enable CORS for React + TypeScript frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers under /api/v1
app.include_router(vehicle_router.router, prefix=settings.API_V1_STR)
app.include_router(trip_router.router, prefix=settings.API_V1_STR)
app.include_router(maintenance_router.router, prefix=settings.API_V1_STR)
app.include_router(analytics_router.router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Fleet Management API backend is running",
        "docs": "/docs",
        "version": settings.VERSION
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
