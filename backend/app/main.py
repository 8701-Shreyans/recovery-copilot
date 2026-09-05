from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .core.config import settings
from .db.database import init_db, SessionLocal
from .db.models import Case
from .services.scheduler import start_scheduler, shutdown_scheduler
from .services.synthetic import generate_synthetic_transactions
from .api.routers import cases, batch, metrics, compliance, audit

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[Recovery Copilot] Initializing database and services...")
    init_db()
    
    # Pre-seed initial dataset if database is fresh
    db = SessionLocal()
    try:
        case_count = db.query(Case).count()
        if case_count == 0:
            print("[Recovery Copilot] Seeding initial baseline synthetic dataset (50 cases)...")
            from .api.routers.batch import run_batch_evaluation
            from .schemas.models import BatchRunRequest
            run_batch_evaluation(request=BatchRunRequest(batch_size=50, scenario_id="baseline"), db=db)
    except Exception as e:
        print(f"[Recovery Copilot] Initial seed note: {e}")
    finally:
        db.close()

    # Start follow-up scheduler
    start_scheduler()

    yield

    # Shutdown
    shutdown_scheduler()

app = FastAPI(
    title="Recovery Copilot Ops API",
    description="AI-powered revenue recovery console backend with predictive diagnosis, guardrail policies, event traces, and model performance metrics.",
    version=settings.VERSION,
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(cases.router, prefix="/api")
app.include_router(batch.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(compliance.router, prefix="/api")
app.include_router(audit.router, prefix="/api")

@app.get("/")
def root_status():
    return {
        "service": "Recovery Copilot Ops API",
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "timestamp": "2026-08-28T09:00:00Z"}
