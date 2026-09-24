"""
Phase 12 - Module 6: Recommendation Storage.

Persists deterministic recommendations, operational risk scores, alerts,
and executive insights to:
- storage/recommendations/recommendations.json (latest complete set)
- storage/recommendations/history.json (historical audit snapshots)
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RECOMMENDATIONS_DIR = os.path.join(AI_SERVICE_DIR, "storage", "recommendations")
RECOMMENDATIONS_FILE = os.path.join(RECOMMENDATIONS_DIR, "recommendations.json")
HISTORY_FILE = os.path.join(RECOMMENDATIONS_DIR, "history.json")


def init_recommendation_storage() -> None:
    """Ensure storage/recommendations directory exists."""
    os.makedirs(RECOMMENDATIONS_DIR, exist_ok=True)
    if not os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)
        except Exception as e:
            logger.warning(f"[recommendation_storage] Failed initializing history.json: {e}")


def load_recommendations() -> Optional[Dict[str, Any]]:
    """Loads latest recommendations from storage/recommendations/recommendations.json."""
    if not os.path.exists(RECOMMENDATIONS_FILE):
        return None
    try:
        with open(RECOMMENDATIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[recommendation_storage] Error loading recommendations.json: {e}")
        return None


def save_recommendations(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Saves latest recommendations snapshot to recommendations.json
    and appends a compact snapshot to history.json (max 50, LIFO).
    """
    init_recommendation_storage()
    now_iso = datetime.now(timezone.utc).isoformat()
    payload["lastUpdated"] = now_iso

    try:
        with open(RECOMMENDATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"[recommendation_storage] Error writing recommendations.json: {e}")

    # Maintain history.json
    try:
        history: List[Dict[str, Any]] = []
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
                if not isinstance(history, list):
                    history = []

        compact_snapshot = {
            "timestamp": now_iso,
            "overallRisk": payload.get("risk", {}).get("overallRisk", 0),
            "riskLevel": payload.get("risk", {}).get("riskLevel", "Low"),
            "recommendationsCount": len(payload.get("recommendations", [])),
            "criticalAlertsCount": len([a for a in payload.get("alerts", []) if a.get("severity") in ["Red", "Critical"]]),
            "insightsCount": len(payload.get("insights", []))
        }

        history.insert(0, compact_snapshot)
        history = history[:50]

        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.warning(f"[recommendation_storage] Error updating history.json: {e}")

    return payload


def load_recommendations_history() -> List[Dict[str, Any]]:
    """Loads historical snapshots from history.json."""
    init_recommendation_storage()
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"[recommendation_storage] Error loading history.json: {e}")
        return []


def clear_recommendations_history() -> bool:
    """Clears history.json."""
    init_recommendation_storage()
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
        return True
    except Exception as e:
        logger.error(f"[recommendation_storage] Error clearing history.json: {e}")
        return False
