"""
Phase 11 - Hybrid AI Question Answering: QA History Storage.

Maintains storage/qa_history.json:
- timestamp
- question
- answer
- queryType
- evidence
- documentsUsed
- confidence
- responseTimeMs
- useLLM
- documentId

Preserves maximum 50 queries (LIFO order).
"""

import os
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
QA_HISTORY_FILE = os.path.join(AI_SERVICE_DIR, "storage", "qa_history.json")


def load_qa_history() -> List[Dict[str, Any]]:
    """Loads QA history from storage/qa_history.json (sorted newest first, max 50)."""
    if not os.path.exists(QA_HISTORY_FILE):
        return []
    try:
        with open(QA_HISTORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except Exception as e:
        print(f"[qa_storage] Error loading QA history: {e}")
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
    """Persists a new QA execution record to storage/qa_history.json."""
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "question": question,
        "answer": answer,
        "queryType": query_type,
        "confidence": confidence,
        "evidenceCount": len(evidence),
        "evidence": evidence,
        "documentsUsed": documents_used,
        "responseTimeMs": round(response_time_ms, 2),
        "useLLM": use_llm,
        "documentId": document_id
    }

    history = load_qa_history()
    # Prepend new entry and cap at 50
    history.insert(0, entry)
    history = history[:50]

    os.makedirs(os.path.dirname(QA_HISTORY_FILE), exist_ok=True)
    try:
        with open(QA_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[qa_storage] Error writing QA history: {e}")

    return entry


def clear_qa_history() -> bool:
    """Clears all stored QA history."""
    try:
        with open(QA_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
        return True
    except Exception as e:
        print(f"[qa_storage] Error clearing QA history: {e}")
        return False
