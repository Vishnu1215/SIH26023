import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.database import get_sync_db

logger = logging.getLogger("ai_service.validation_storage")

def save_validation_report(document_id: str, report: Dict[str, Any]) -> str:
    """
    Persist validation report directly into MongoDB collection 'validation_results'.
    Also updates document validation score and status in 'documents' collection.
    """
    try:
        db = get_sync_db()
        clean = dict(report)
        clean.pop("_id", None)
        
        # Get existing history from database
        existing = db["validation_results"].find_one({"documentId": document_id})
        existing_history = []
        if existing:
            existing_history = existing.get("validationHistory", [])
            if not existing_history and "timestamp" in existing:
                existing_history.append({
                    "validatedAt": existing.get("timestamp"),
                    "score": existing.get("score"),
                    "status": existing.get("status"),
                    "errorCount": existing.get("errors", 0),
                    "warningCount": existing.get("warnings", 0)
                })

        now_iso = clean.get("validatedAt") or datetime.now(timezone.utc).isoformat()
        current_snapshot = {
            "validatedAt": now_iso,
            "score": clean.get("validationScore", 100),
            "status": clean.get("validationStatus", "Valid"),
            "errorCount": clean.get("errorCount", 0),
            "warningCount": clean.get("warningCount", 0)
        }
        updated_history = [current_snapshot] + existing_history

        payload = {
            "documentId": document_id,
            "score": clean.get("validationScore", 100),
            "status": clean.get("validationStatus", "Valid"),
            "errors": clean.get("errorCount", 0),
            "warnings": clean.get("warningCount", 0),
            "validationMessages": clean.get("validationMessages", clean.get("messages", [])),
            "executedRules": clean.get("rulesTriggered", []),
            "timestamp": now_iso,
            "validationSummary": clean.get("validationSummary"),
            "validationHistory": updated_history,
            "confidence": clean.get("confidence")
        }

        db["validation_results"].update_one(
            {"documentId": document_id},
            {"$set": payload},
            upsert=True
        )

        # Sync to documents collection
        db["documents"].update_one(
            {"documentId": document_id},
            {"$set": {
                "validationScore": payload["score"],
                "validationStatus": payload["status"]
            }}
        )

        logger.info(f"Validation report saved to MongoDB for document: {document_id}")
        return f"mongodb://coal_portal/validation_results/{document_id}"
    except Exception as exc:
        logger.error(f"Failed to save validation report to MongoDB for {document_id}: {exc}", exc_info=True)
        raise

def load_validation_report(document_id: str) -> Optional[Dict[str, Any]]:
    """Load validation report directly from MongoDB collection 'validation_results'."""
    try:
        db = get_sync_db()
        rec = db["validation_results"].find_one({"documentId": document_id}, {"_id": 0})
        if rec:
            return {
                "documentId": document_id,
                "validationScore": rec.get("score", 100),
                "validationStatus": rec.get("status", "Valid"),
                "errorCount": rec.get("errors", 0),
                "warningCount": rec.get("warnings", 0),
                "validationMessages": rec.get("validationMessages", []),
                "messages": rec.get("validationMessages", []),
                "rulesTriggered": rec.get("executedRules", []),
                "validationSummary": rec.get("validationSummary"),
                "validatedAt": rec.get("timestamp"),
                "validationHistory": rec.get("validationHistory", [])
            }
        return None
    except Exception as exc:
        logger.error(f"Failed to load validation report from MongoDB for {document_id}: {exc}")
        return None

def validation_report_exists(document_id: str) -> bool:
    """Check if validation report exists in MongoDB."""
    try:
        db = get_sync_db()
        return db["validation_results"].count_documents({"documentId": document_id}) > 0
    except Exception:
        return False
