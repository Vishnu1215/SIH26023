import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.database import get_sync_db

logger = logging.getLogger("ai_service.qa_storage")

def load_qa_history() -> List[Dict[str, Any]]:
    """Loads QA history directly from MongoDB collection 'chat_history' (sorted newest first, max 50)."""
    try:
        db = get_sync_db()
        cursor = db["chat_history"].find({}, {"_id": 0}).sort("timestamp", -1).limit(50)
        return list(cursor)
    except Exception as e:
        logger.error(f"Error loading QA history from MongoDB: {e}")
        return []

def save_qa_record(
    question: str,
    answer: str,
    query_type: str,
    confidence: float,
    evidence: List[Dict[str, Any]],
    documents_used: List[Dict[str, Any]],
    response_time_ms: float,
    use_llm: bool = False,
    document_id: Optional[str] = None
) -> Dict[str, Any]:
    """Persists a new QA execution record directly into MongoDB collection 'chat_history'."""
    entry = {
        "id": str(uuid.uuid4()),
        "documentId": document_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "question": question,
        "answer": answer,
        "queryType": query_type,
        "confidence": confidence,
        "evidenceCount": len(evidence or []),
        "evidence": evidence or [],
        "documentsUsed": documents_used or [],
        "responseTimeMs": round(response_time_ms, 2),
        "useLLM": use_llm
    }
    try:
        db = get_sync_db()
        db["chat_history"].insert_one(dict(entry))
        logger.info(f"Persisted QA query into MongoDB chat_history: '{question[:40]}...'")
    except Exception as e:
        logger.error(f"Error writing QA history to MongoDB: {e}", exc_info=True)
    return entry

def clear_qa_history() -> bool:
    """Clears all stored QA history in MongoDB."""
    try:
        db = get_sync_db()
        db["chat_history"].delete_many({})
        logger.info("Cleared MongoDB chat_history collection.")
        return True
    except Exception as e:
        logger.error(f"Error clearing QA history from MongoDB: {e}")
        return False
