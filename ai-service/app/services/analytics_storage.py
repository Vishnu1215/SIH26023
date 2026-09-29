import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.database import get_sync_db

logger = logging.getLogger("ai_service.analytics_storage")

def save_dashboard(dashboard_data: Dict[str, Any], storage_dir: Optional[str] = None) -> str:
    """
    Persist aggregated analytics to MongoDB collection 'analytics'.
    Single source of truth for all dashboard and analytics queries.
    """
    try:
        db = get_sync_db()
        clean = dict(dashboard_data)
        clean.pop("_id", None)
        clean["documentId"] = "consolidated_dashboard"
        clean["type"] = "consolidated"
        clean["updatedAt"] = datetime.now(timezone.utc).isoformat()

        db["analytics"].update_one(
            {"documentId": "consolidated_dashboard", "type": "consolidated"},
            {"$set": clean},
            upsert=True
        )
        logger.info("Analytics dashboard saved successfully to MongoDB collection 'analytics'")
        return "mongodb://coal_portal/analytics/consolidated_dashboard"
    except Exception as exc:
        logger.error(f"Failed to save analytics dashboard to MongoDB: {exc}", exc_info=True)
        raise

def load_dashboard(storage_dir: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Load persisted analytics dashboard from MongoDB collection 'analytics'."""
    try:
        db = get_sync_db()
        doc = db["analytics"].find_one(
            {"documentId": "consolidated_dashboard", "type": "consolidated"},
            {"_id": 0}
        )
        return doc
    except Exception as exc:
        logger.error(f"Failed to read analytics dashboard from MongoDB: {exc}")
        return None

def dashboard_exists(storage_dir: Optional[str] = None) -> bool:
    """Check if the analytics dashboard exists in MongoDB."""
    try:
        db = get_sync_db()
        return db["analytics"].count_documents({"documentId": "consolidated_dashboard", "type": "consolidated"}) > 0
    except Exception:
        return False
