from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os

from app.core.config import settings
from app.database.base import Base
from app.database.session import engine, SessionLocal
from app.database.seeder import seed_database
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware

# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.patients import router as patients_router
from app.api.v1.doctors import router as doctors_router
from app.api.v1.admin import router as admin_router
from app.api.v1.qr import router as qr_router
from app.api.v1.access import router as access_router
from app.api.v1.ai import router as ai_router
from app.api.v1.fhir import router as fhir_router
from app.api.v1.metrics import router as metrics_router

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and database is seeded with demo accounts
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Zero-Trust AI-Powered Emergency Medical History Access System (EMQ-HS)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# 1. Custom Security Middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimiterMiddleware)

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Mount API Routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(patients_router, prefix=f"{settings.API_V1_STR}/patients", tags=["Patient Portal"])
app.include_router(doctors_router, prefix=f"{settings.API_V1_STR}/doctors", tags=["Doctor Portal"])
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["System Administration"])
app.include_router(qr_router, prefix=f"{settings.API_V1_STR}/qr", tags=["QR Management & Resolution"])
app.include_router(access_router, prefix=f"{settings.API_V1_STR}/access", tags=["Access Control & Break-Glass"])
app.include_router(ai_router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI Clinical Summarizer"])
app.include_router(fhir_router, prefix=f"{settings.API_V1_STR}/fhir", tags=["FHIR Interoperability"])
app.include_router(metrics_router, prefix="/metrics", tags=["Telemetry & Observability"])

# 4. Static UI Mounting for Friction-Free Local Execution
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "security_mode": "ZERO_TRUST_RBAC"
    }

@app.get("/app", tags=["Frontend"])
@app.get("/", tags=["Frontend"])
def serve_frontend():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": "Welcome to Secure Emergency Medical Access System API",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics"
    }
