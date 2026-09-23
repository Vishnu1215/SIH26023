import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.analytics_engine import generate_dashboard_summary
from app.services.analytics_storage import load_dashboard

router = APIRouter(prefix="/analytics", tags=["Analytics Engine"])
logger = logging.getLogger("ai_service.analytics")


class RecomputeRequest(BaseModel):
    documents: Optional[List[Dict[str, Any]]] = None


class RecomputeResponse(BaseModel):
    status: str
    documentsProcessed: int
    analyticsGenerated: bool
    generationTime: float
    dashboard: Optional[Dict[str, Any]] = None


def _get_or_create_dashboard() -> Dict[str, Any]:
    """Helper to load single source of truth from storage or generate if absent."""
    data = load_dashboard()
    if not data:
        data = generate_dashboard_summary()
    return data


@router.get("/dashboard")
async def get_analytics_dashboard():
    """
    GET /analytics/dashboard
    Returns the complete aggregated analytics dashboard JSON.
    Single source of truth for executive insights and KPI cards.
    """
    try:
        dashboard = _get_or_create_dashboard()
        return dashboard
    except Exception as exc:
        logger.error(f"Error fetching analytics dashboard: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load analytics: {str(exc)}")


@router.get("/subsidiaries")
async def get_subsidiary_analytics():
    """
    GET /analytics/subsidiaries
    Returns subsidiary performance metrics sorted descending by production.
    """
    try:
        dashboard = _get_or_create_dashboard()
        subsidiaries = dashboard.get("subsidiaries", [])
        return {
            "status": "success",
            "count": len(subsidiaries),
            "subsidiaries": subsidiaries
        }
    except Exception as exc:
        logger.error(f"Error fetching subsidiary analytics: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/states")
async def get_state_analytics():
    """
    GET /analytics/states
    Returns state-wise mining distribution and production metrics.
    """
    try:
        dashboard = _get_or_create_dashboard()
        states = dashboard.get("states", [])
        return {
            "status": "success",
            "count": len(states),
            "states": states
        }
    except Exception as exc:
        logger.error(f"Error fetching state analytics: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/financial-years")
async def get_financial_years_analytics():
    """
    GET /analytics/financial-years
    Returns multi-year production and validation quality trends.
    """
    try:
        dashboard = _get_or_create_dashboard()
        financial_years = dashboard.get("financialYears", [])
        return {
            "status": "success",
            "count": len(financial_years),
            "financialYears": financial_years
        }
    except Exception as exc:
        logger.error(f"Error fetching financial year analytics: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/quality")
async def get_quality_analytics():
    """
    GET /analytics/quality
    Returns data quality indicators, missing field metrics, and validation health.
    """
    try:
        dashboard = _get_or_create_dashboard()
        quality = dashboard.get("quality", {})
        return {
            "status": "success",
            "quality": quality
        }
    except Exception as exc:
        logger.error(f"Error fetching quality analytics: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/recompute", response_model=RecomputeResponse)
async def recompute_analytics(payload: Optional[RecomputeRequest] = None):
    """
    POST /analytics/recompute
    Recomputes all 8 analytical modules from stored structured and validation records.
    Persists results directly to storage/analytics/dashboard.json.
    """
    try:
        external_docs = payload.documents if payload else None
        dashboard = generate_dashboard_summary(external_documents=external_docs)
        return RecomputeResponse(
            status="success",
            documentsProcessed=dashboard.get("documentsProcessed", 0),
            analyticsGenerated=True,
            generationTime=dashboard.get("generationTime", 0.0),
            dashboard=dashboard
        )
    except Exception as exc:
        logger.error(f"Error recomputing analytics: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to recompute analytics: {str(exc)}")
