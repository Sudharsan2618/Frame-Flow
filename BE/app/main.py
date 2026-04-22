"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.config import settings
from app.api.v1.router import router as v1_router
from app.db.mongodb import connect_mongodb, close_mongodb, ensure_indexes

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.utils.limiter import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    import os
    port = os.getenv("PORT", "8080")
    print(f"[START] {settings.APP_NAME} API starting...")
    print(f"[INFO]  Listening on port: {port}")
    print(f"[DOCS]  http://localhost:{port}/docs")

    # MongoDB connect + indexes
    try:
        await connect_mongodb()
        await ensure_indexes()
    except Exception as e:
        print(f"[ERROR] Database startup failed: {e}")
        print("        App will continue to start but DB features may fail.")

    yield

    # Shutdown
    try:
        await close_mongodb()
    except Exception as e:
        print(f"[ERROR] Database shutdown error: {e}")
    print(f"[STOP]  {settings.APP_NAME} API shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="LMS + Recruitment Platform API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://recruit-smoky.vercel.app",
    ] if settings.DEBUG else [settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# GZip compression — reduces JSON payload size by 50-80% over cross-region links
app.add_middleware(GZipMiddleware, minimum_size=500)

# Mount API routes
app.include_router(v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}

