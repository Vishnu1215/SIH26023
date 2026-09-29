import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.database import get_sync_db

logger = logging.getLogger("ai_service.json_storage")

def save_structured_data(document_id: str, data: Dict[str, Any]) -> str:
    """
    Save structured document JSON to MongoDB collection 'structured_records'.
    MongoDB is the primary single source of truth.
    """
    try:
        db = get_sync_db()
        clean = dict(data)
        clean.pop("_id", None)
        payload = {
            "documentId": document_id,
            "normalizedJson": clean.get("tables") or clean.get("normalizedJson") or clean,
            "entities": clean.get("entities") or {},
            "extractedTopics": clean.get("topics") or clean.get("extractedTopics") or [],
            "metadata": clean.get("metadata") or {},
            "summary": clean.get("summary") or "",
            "extractedAt": datetime.now(timezone.utc).isoformat()
        }
        db["structured_records"].update_one(
            {"documentId": document_id},
            {"$set": payload},
            upsert=True
        )
        logger.info(f"Saved structured JSON for document {document_id} to MongoDB collection 'structured_records'")
        return f"mongodb://coal_portal/structured_records/{document_id}"
    except Exception as exc:
        logger.error(f"Failed to save structured JSON for {document_id} to MongoDB: {exc}", exc_info=True)
        raise

def load_structured_data(document_id: str) -> Optional[Dict[str, Any]]:
    """
    Load structured document JSON directly from MongoDB 'structured_records' collection.
    """
    try:
        db = get_sync_db()
        record = db["structured_records"].find_one({"documentId": document_id}, {"_id": 0})
        if record:
            # Return reconstructed format compatible with existing callers
            return {
                "documentId": document_id,
                "tables": record.get("normalizedJson", {}),
                "normalizedJson": record.get("normalizedJson", {}),
                "entities": record.get("entities", {}),
                "topics": record.get("extractedTopics", []),
                "extractedTopics": record.get("extractedTopics", []),
                "metadata": record.get("metadata", {}),
                "summary": record.get("summary", ""),
                "extractedAt": record.get("extractedAt")
            }
        return None
    except Exception as exc:
        logger.error(f"Failed to load structured JSON for {document_id} from MongoDB: {exc}")
        return None

def structured_data_exists(document_id: str) -> bool:
    """Check if structured data exists in MongoDB collection."""
    try:
        db = get_sync_db()
        cnt = db["structured_records"].count_documents({"documentId": document_id})
        return cnt > 0
    except Exception:
        return False
