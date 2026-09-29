"""
FastAPI Router for Report Reviews, Manual Edits, Approvals, and Audit Trails.
Persists all review decisions and edits directly in MongoDB 'report_reviews' collection,
completely replacing localStorage.
"""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from app.repositories import get_review_repository, ReviewRepository
from app.schemas.requests import ReportReviewDraftSchema, ReportReviewDecisionSchema

router = APIRouter(prefix="/reviews", tags=["Report Reviews & Statutory Audit Trail"])
logger = logging.getLogger("ai_service.reviews_router")


@router.get("/{report_id}", summary="Get review record and manual draft edits from MongoDB")
async def get_report_review_api(
    report_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    repo = ReviewRepository(db)
    review = await repo.get_review(report_id)
    if not review:
        return {
            "success": True,
            "reportId": report_id,
            "status": "Draft",
            "exists": False,
            "review": None
        }
    return {
        "success": True,
        "reportId": report_id,
        "exists": True,
        "review": review
    }


@router.post("/{report_id}/draft", summary="Save draft edits for a report into MongoDB")
async def save_report_draft_api(
    report_id: str,
    payload: ReportReviewDraftSchema,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    repo = ReviewRepository(db)
    record = await repo.save_draft(report_id, payload.model_dump(exclude_unset=True))
    return {
        "success": True,
        "message": "Draft edits saved to MongoDB Atlas successfully.",
        "review": record
    }


@router.post("/{report_id}/approve", summary="Approve report publication in MongoDB")
async def approve_report_api(
    report_id: str,
    payload: ReportReviewDecisionSchema,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    repo = ReviewRepository(db)
    record = await repo.approve_report(report_id, payload.model_dump(exclude_unset=True))
    return {
        "success": True,
        "message": "Report approved for statutory publication in MongoDB.",
        "review": record
    }


@router.post("/{report_id}/reject", summary="Reject report with revision request in MongoDB")
async def reject_report_api(
    report_id: str,
    payload: ReportReviewDecisionSchema,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    repo = ReviewRepository(db)
    record = await repo.reject_report(report_id, payload.model_dump(exclude_unset=True))
    return {
        "success": True,
        "message": "Revision requested and logged in MongoDB.",
        "review": record
    }


@router.get("/{report_id}/audit", summary="Get statutory audit trail for a report from MongoDB")
async def get_report_audit_trail_api(
    report_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    repo = ReviewRepository(db)
    review = await repo.get_review(report_id)
    trail = review.get("auditTrail", []) if review else []
    return {
        "success": True,
        "reportId": report_id,
        "count": len(trail),
        "auditTrail": trail
    }
