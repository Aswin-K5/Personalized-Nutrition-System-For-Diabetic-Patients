"""
DiabetesDiet API - Evidence-Based Dietary Recommendations
for Adults with Diabetes & Metabolic Syndrome.

FastAPI + PostgreSQL + Rule Engine + ML Model
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
import time

from app.config import settings
from app.database import engine, Base
from app.routers import auth, patients, dietary, diet_plan, research, goals

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ─── Create all tables ────────────────────────────────────────────────────────
def create_tables():
    """Create all database tables. Use Alembic for migrations in production."""
    # Import all models so SQLAlchemy registers them
    from app.models import (  # noqa: F401
        User, PatientProfile, Food, DietaryRecord, DietaryFoodItem,
        FFQResponse, DietPlan
    )
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created")


# ─── FastAPI Application ──────────────────────────────────────────────────────
app = FastAPI(
    title="🩺 DiabetesDiet API",
    description="""
## Evidence-Based Personalized Dietary Recommendations for Diabetes & Metabolic Syndrome

### Features
- **JWT Authentication** (Register → Login → Bearer Token)
- **Patient Profile** with automated anthropometric calculations (BMI, WHtR, Mifflin-St Jeor)
- **Metabolic Risk Scoring** (0-5 component count, ATP III / IDF criteria)
- **24-Hour Dietary Recall** with automatic nutritional analysis
- **Food Frequency Questionnaire** (structured FFQ)
- **5,432 FNDDS 2021-2023 Foods** (searchable database)
- **Clinical Rule Engine** (lipid, glucose, obesity, inflammation rules)
- **ML Model** (Random Forest + Gradient Boosting) — compared with rule-based
- **Dietary Inflammatory Score** | **Chrononutrition Score** | **Diet Quality Score**
- **Research Dashboard** with CSV export (SPSS/R compatible)

### Quick Start Flow
1. `POST /api/v1/auth/register` — Create account
2. `POST /api/v1/auth/login` — Get JWT token
3. Click **Authorize** button above → Enter token
4. `POST /api/v1/patients/profile` — Enter clinical data
5. `GET /api/v1/dietary/foods/search?q=salmon` — Search foods
6. `POST /api/v1/dietary/recall` — Submit 24-hr recall
7. `POST /api/v1/diet-plan/generate` — Get personalized plan
8. `GET /api/v1/diet-plan/compare` — Rule-based vs ML comparison

### References
- ADA Standards of Medical Care in Diabetes 2024
- ATP III / IDF Metabolic Syndrome Criteria
- FNDDS 2021-2023 Food and Nutrient Database
    """,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Authentication", "description": "Register, login, user management"},
        {"name": "Patient Profile", "description": "Clinical profile, anthropometrics, metabolic risk"},
        {"name": "Dietary Assessment", "description": "24-hr recall, FFQ, food database search"},
        {"name": "Diet Plan & Recommendations", "description": "Rule-based + ML personalized plans"},
        {"name": "Research Dashboard (Investigator)", "description": "Population stats, CSV export, model comparison"},
    ],
    contact={
        "name": "DiabetesDiet Research Team",
        "email": "research@diabetesdiet.app",
    },
    license_info={
        "name": "MIT",
    },
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request Timing Middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response


# ─── Exception Handlers ────────────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " → ".join(str(e) for e in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": errors},
    )


# ─── Startup / Shutdown ───────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    create_tables()

    # Pre-load ML models
    from app.services.ml_model import ml_service
    logger.info(f"🤖 ML Model status: {'loaded' if ml_service._loaded else 'not loaded (run train_model.py)'}")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("👋 Shutting down DiabetesDiet API")


# ─── Include Routers ──────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(patients.router, prefix=API_PREFIX)
app.include_router(dietary.router, prefix=API_PREFIX)
app.include_router(diet_plan.router, prefix=API_PREFIX)
app.include_router(research.router, prefix=API_PREFIX)
app.include_router(goals.router, prefix=API_PREFIX)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"], summary="Health check")
def health_check():
    from app.services.ml_model import ml_service
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ml_models_ready": ml_service._loaded,
    }


@app.get("/", tags=["System"], summary="API root")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "health": "/health",
        "version": settings.APP_VERSION,
    }