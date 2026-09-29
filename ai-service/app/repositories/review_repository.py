from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db

class ReviewRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        return self._db if self._db is not None else get_db()

    @property
    def collection(self):
        return self.db["report_reviews"]

    async def get_review(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve manual review and draft edits for a report."""
        return await self.collection.find_one({"reportId": report_id}, {"_id": 0})

    async def save_draft(self, report_id: str, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save draft edits into MongoDB with audit trail."""
        existing = await self.get_review(report_id) or {
            "reportId": report_id,
            "status": "Draft",
            "auditTrail": [],
            "createdAt": datetime.now(timezone.utc).isoformat()
        }

        timestamp = datetime.now(timezone.utc).isoformat()
        changes = []
        if review_data.get("title") is not None and review_data.get("title") != existing.get("title"):
            changes.append(f"Updated title to '{review_data.get('title')}'")
        if review_data.get("executiveSummary") is not None and review_data.get("executiveSummary") != existing.get("executiveSummary"):
            changes.append("Modified executive briefing summary")
        if review_data.get("remarks") is not None and review_data.get("remarks") != existing.get("remarks"):
            changes.append("Updated operational remarks")
        if review_data.get("recommendations") is not None and review_data.get("recommendations") != existing.get("recommendations"):
            changes.append("Refined strategic recommendations")

        audit_trail = list(existing.get("auditTrail") or [])
        if changes:
            audit_trail.append({
                "timestamp": timestamp,
                "action": "DRAFT_SAVED",
                "officer": review_data.get("reviewerName") or "Reviewing Officer",
                "designation": review_data.get("reviewerDesignation") or "Under Secretary, Coal Division",
                "changes": changes
            })

        record = {
            **existing,
            **review_data,
            "status": "Approved (Edited)" if existing.get("status") == "Approved" else "Draft",
            "updatedAt": timestamp,
            "auditTrail": audit_trail
        }
        await self.collection.update_one(
            {"reportId": report_id},
            {"$set": record},
            upsert=True
        )
        return await self.get_review(report_id)

    async def approve_report(self, report_id: str, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """Approve report for publication in MongoDB."""
        existing = await self.get_review(report_id) or {
            "reportId": report_id,
            "auditTrail": [],
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        timestamp = datetime.now(timezone.utc).isoformat()
        audit_trail = list(existing.get("auditTrail") or [])
        audit_trail.append({
            "timestamp": timestamp,
            "action": "REPORT_APPROVED",
            "officer": review_data.get("reviewerName") or "Under Secretary, Ministry of Coal",
            "designation": review_data.get("reviewerDesignation") or "Under Secretary, Coal Division",
            "decision": "Approved for Statutory Publication",
            "comments": review_data.get("reviewerComments") or "Verified against single sources of truth. Cleared for publication."
        })

        record = {
            **existing,
            **review_data,
            "status": "Approved",
            "approvedAt": timestamp,
            "approvedBy": review_data.get("reviewerName") or "Under Secretary, Ministry of Coal",
            "updatedAt": timestamp,
            "auditTrail": audit_trail
        }
        await self.collection.update_one(
            {"reportId": report_id},
            {"$set": record},
            upsert=True
        )
        return await self.get_review(report_id)

    async def reject_report(self, report_id: str, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """Reject report with revision request in MongoDB."""
        existing = await self.get_review(report_id) or {
            "reportId": report_id,
            "auditTrail": [],
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        timestamp = datetime.now(timezone.utc).isoformat()
        audit_trail = list(existing.get("auditTrail") or [])
        audit_trail.append({
            "timestamp": timestamp,
            "action": "REVISION_REQUESTED",
            "officer": review_data.get("reviewerName") or "Under Secretary, Ministry of Coal",
            "designation": review_data.get("reviewerDesignation") or "Under Secretary, Coal Division",
            "decision": "Revision Requested",
            "comments": review_data.get("reviewerComments") or "Discrepancy found. Revision requested prior to publication."
        })

        record = {
            **existing,
            **review_data,
            "status": "Revision Requested",
            "rejectedAt": timestamp,
            "rejectedBy": review_data.get("reviewerName") or "Under Secretary, Ministry of Coal",
            "updatedAt": timestamp,
            "auditTrail": audit_trail
        }
        await self.collection.update_one(
            {"reportId": report_id},
            {"$set": record},
            upsert=True
        )
        return await self.get_review(report_id)


def get_review_repository() -> ReviewRepository:
    return ReviewRepository()
