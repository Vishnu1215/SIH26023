"""
Phase 13: System Administration, Audit & Monitoring API Endpoints.

Exposes REST endpoints for administrative health checks, processing statistics,
storage monitoring, runtime latencies, platform configuration, activity feed,
and government compliance audit logs.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status as http_status
from pydantic import BaseModel

from app.services.administration_service import admin_service

router = APIRouter(prefix="/admin", tags=["System Administration & Audit"])


class RefreshRequest(BaseModel):
    user: Optional[str] = "System Administrator"


@router.get("/health", summary="Get real-time system health and subsystem availability")
async def get_system_health():
    """
    Evaluates AI Service status, storage accessibility, pipeline readiness,
    and returns overall health status, score (0-100), and subsystem checks.
    """
    try:
        return admin_service.get_health()
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate system health: {str(e)}"
        )


@router.get("/statistics", summary="Get processing statistics and pipeline metrics")
async def get_processing_statistics():
    """
    Aggregates metrics directly from Single Sources of Truth (dashboard.json,
    report-history.json, qa_history.json, etc.).
    """
    try:
        return admin_service.get_statistics()
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to aggregate processing statistics: {str(e)}"
        )


@router.get("/storage", summary="Get storage metrics, folder sizes, and largest files")
async def get_storage_metrics():
    """
    Scans persisted directories (uploads, reports, structured data, logs, etc.)
    and computes file counts, folder sizes, and identifies the largest files.
    """
    try:
        return admin_service.get_storage()
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve storage metrics: {str(e)}"
        )


@router.get("/runtime", summary="Get runtime latencies and throughput metrics")
async def get_runtime_metrics():
    """
    Returns min, avg, max latencies across all 12 pipeline stages,
    system uptime, and throughput indicators.
    """
    try:
        return admin_service.get_runtime()
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve runtime metrics: {str(e)}"
        )


@router.get("/configuration", summary="Get read-only platform configuration profiles")
async def get_configuration():
    """
    Returns platform versions, engine specifications, environment status,
    storage paths, and air-gapped government compliance settings.
    """
    try:
        return admin_service.get_configuration()
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system configuration: {str(e)}"
        )


@router.get("/activity", summary="Get unified multi-source chronological activity stream")
async def get_activity(
    limit: int = Query(25, ge=1, le=100, description="Maximum number of activities to return")
):
    """
    Returns recent activities across uploads, generated reports, Q&A queries,
    search operations, recommendations, and audit logs.
    """
    try:
        return {"status": "success", "activities": admin_service.get_activity(limit=limit)}
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve activity stream: {str(e)}"
        )


@router.get("/audit", summary="Get government compliance audit events")
async def get_audit_events(
    module: Optional[str] = Query(None, description="Filter by module name (e.g. Reports, Hybrid QA, Administration)"),
    status: Optional[str] = Query(None, description="Filter by status (SUCCESS, WARNING, FAILED)"),
    date: Optional[str] = Query(None, description="Filter by ISO date prefix (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return")
):
    """
    Retrieves filtered immutable audit log entries.
    """
    try:
        events = admin_service.get_audit(module=module, status=status, date=date, limit=limit)
        return {
            "status": "success",
            "totalReturned": len(events),
            "filters": {"module": module, "status": status, "date": date},
            "events": events
        }
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve audit events: {str(e)}"
        )


@router.delete("/audit", summary="Clear and reset audit log history")
async def clear_audit_events():
    """
    Clears historical audit trail and registers a fresh initialization audit entry.
    """
    try:
        success = admin_service.clear_audit()
        if not success:
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clear audit events"
            )
        return {"status": "success", "message": "Audit history purged successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing audit history: {str(e)}"
        )


@router.post("/refresh", summary="Trigger administrative cache and storage refresh")
async def refresh_system(body: Optional[RefreshRequest] = None):
    """
    Forces a fresh scan of file storage, updates subsystem health metrics,
    and logs an administrative audit record.
    """
    try:
        user = body.user if body and body.user else "System Administrator"
        result = admin_service.refresh_system_state(user=user)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Administrative refresh failed: {str(e)}"
        )
