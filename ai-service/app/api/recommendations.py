"""
FastAPI Router for Phase 12: AI Recommendations & Decision Support Engine.
Exposes endpoints for Recommendations, Risk Assessment, Operational Alerts, Executive Insights, and Trends.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query

from app.services.recommendation_service import (
    compute_all_recommendations,
    get_recommendations_list,
    get_insights_list,
    get_alerts_list,
    get_risk_assessment,
    get_trend_analysis
)
from app.services.recommendation_storage import (
    load_recommendations_history,
    clear_recommendations_history
)

router = APIRouter(prefix="/recommendations", tags=["AI Recommendations & Decision Support"])


@router.get("", summary="Get all recommendations and decision support data")
async def api_get_recommendations(
    category: Optional[str] = Query(default=None, description="Filter by category (Production, Validation, Data Quality, Compliance, Operational)"),
    priority: Optional[str] = Query(default=None, description="Filter by priority (Critical, High, Medium, Low)"),
    subsidiary: Optional[str] = Query(default=None, description="Filter by affected subsidiary")
):
    """
    Returns complete recommendations payload including risk assessment, executive insights,
    operational alerts, and trend trajectories.
    """
    try:
        cat = category if isinstance(category, str) and category else None
        prio = priority if isinstance(priority, str) and priority else None
        sub = subsidiary if isinstance(subsidiary, str) and subsidiary else None

        full_data = compute_all_recommendations(force=False)
        if cat or prio or sub:
            filtered_recs = get_recommendations_list(category=cat, priority=prio, subsidiary=sub)
            return {
                **full_data,
                "recommendations": filtered_recs,
                "filteredCount": len(filtered_recs)
            }
        return full_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load recommendations: {str(e)}")


@router.get("/insights", summary="Get executive factual insights")
async def api_get_insights():
    """Retrieve concise, deterministic executive insights for Ministry leadership."""
    try:
        insights = get_insights_list()
        return {
            "status": "success",
            "count": len(insights),
            "insights": insights
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load executive insights: {str(e)}")


@router.get("/alerts", summary="Get operational & compliance alerts")
async def api_get_alerts(
    severity: Optional[str] = Query(default=None, description="Filter by severity (Red, Orange, Yellow)")
):
    """Retrieve prioritized operational risk alerts with action recommendations."""
    try:
        sev = severity if isinstance(severity, str) and severity else None
        alerts = get_alerts_list(severity=sev)
        return {
            "status": "success",
            "count": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load alerts: {str(e)}")


@router.get("/risk", summary="Get operational risk assessment")
async def api_get_risk():
    """Retrieve deterministic 0-100 Operational Risk Score and categorical breakdown."""
    try:
        risk = get_risk_assessment()
        return {
            "status": "success",
            "risk": risk
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load risk assessment: {str(e)}")


@router.get("/trends", summary="Get historical trend trajectories")
async def api_get_trends():
    """Retrieve progression trends across production, validation, ingestion, and reports."""
    try:
        trends = get_trend_analysis()
        return {
            "status": "success",
            "trends": trends
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load trend analysis: {str(e)}")


@router.post("/recompute", summary="Recompute recommendations from single sources of truth")
async def api_recompute_recommendations():
    """Forces re-evaluation of all decision support engines against current storage."""
    try:
        updated = compute_all_recommendations(force=True)
        return {
            "status": "success",
            "message": "Recommendations, risk scores, and alerts successfully recomputed.",
            "data": updated
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to recompute recommendations: {str(e)}")


@router.get("/history", summary="Get historical recommendation snapshots")
async def api_get_recommendations_history():
    """Retrieve historical risk and recommendation snapshots."""
    try:
        history = load_recommendations_history()
        return {
            "status": "success",
            "count": len(history),
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load recommendations history: {str(e)}")


@router.delete("/history", summary="Clear recommendations history")
async def api_clear_recommendations_history():
    """Clear historical snapshots."""
    try:
        success = clear_recommendations_history()
        return {
            "status": "success",
            "message": "Recommendations history cleared.",
            "cleared": success
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear recommendations history: {str(e)}")
