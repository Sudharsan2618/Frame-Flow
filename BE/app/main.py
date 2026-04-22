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
    import asyncio
    import sys
    
    print("[STARTUP] Beginning lifespan initialization...", flush=True)
    port = os.getenv("PORT", "8080")
    print(f"[STARTUP] PORT environment variable: {port}", flush=True)
    print(f"[START] {settings.APP_NAME} API starting...", flush=True)
    print(f"[INFO]  Listening on port: {port}", flush=True)
    print(f"[DOCS]  http://localhost:{port}/docs", flush=True)

    # MongoDB connect + indexes - run in background to not block startup
    async def init_db():
        try:
            print("[STARTUP] Starting MongoDB connection...", flush=True)
            await connect_mongodb()
            print("[STARTUP] MongoDB connected, ensuring indexes...", flush=True)
            await ensure_indexes()
            print("[STARTUP] Database initialization complete", flush=True)
        except Exception as e:
            print(f"[ERROR] Database startup failed: {e}", flush=True)
            print("        App will continue to start but DB features may fail.", flush=True)

    # Start DB initialization in background
    print("[STARTUP] Starting DB initialization in background...", flush=True)
    db_task = asyncio.create_task(init_db())

    print("[STARTUP] Server ready to accept connections", flush=True)
    yield

    # Shutdown
    print("[SHUTDOWN] Beginning shutdown...", flush=True)
    try:
        # Cancel DB task if still running
        if not db_task.done():
            print("[SHUTDOWN] Canceling pending DB task...", flush=True)
            db_task.cancel()
            try:
                await db_task
            except asyncio.CancelledError:
                pass
        print("[SHUTDOWN] Closing MongoDB connection...", flush=True)
        await close_mongodb()
    except Exception as e:
        print(f"[ERROR] Database shutdown error: {e}", flush=True)
    print(f"[STOP]  {settings.APP_NAME} API shutting down...", flush=True)


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

