from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.health import router as health_router
from app.api.ingest import router as ingest_router
from app.api.extract import router as extract_router
from app.api.validate import router as validate_router
from app.api.analytics import router as analytics_router
from app.api.reports import router as reports_router
from app.api.intelligence import router as intelligence_router
from app.api.query import router as query_router
from app.api.qa import router as qa_router
from app.api.recommendations import router as recommendations_router
from app.api.admin import router as admin_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="FastAPI Service for SIH26023 AI-Powered Geological, Mining and Reporting Solution"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(health_router)
app.include_router(ingest_router)
app.include_router(extract_router)
app.include_router(validate_router)
app.include_router(analytics_router)
app.include_router(reports_router)
app.include_router(intelligence_router)
app.include_router(query_router)
app.include_router(qa_router)
app.include_router(recommendations_router)
app.include_router(admin_router)



@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs_url": "/docs",
        "health_check": "/health"
    }
