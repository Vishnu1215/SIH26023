import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from app.core.config import settings

logger = logging.getLogger("ai_service.validation_storage")


def get_validation_file_path(document_id: str) -> str:
    """Return absolute file path for a document's validation JSON."""
    return os.path.join(settings.VALIDATION_STORAGE_DIR, f"{document_id}.json")


def save_validation_report(document_id: str, report: Dict[str, Any]) -> str:
    """
    Persist validation report to storage/validation/{documentId}.json.
    Maintains a validationHistory list across multiple runs.
    """
    os.makedirs(settings.VALIDATION_STORAGE_DIR, exist_ok=True)
    file_path = get_validation_file_path(document_id)

    # Check for previous report to preserve and append history
    existing_history = []
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                old_data = json.load(f)
                existing_history = old_data.get("validationHistory", [])
                # If old data had no history array, add the previous snapshot
                if not existing_history and "validatedAt" in old_data:
                    existing_history.append({
                        "validatedAt": old_data.get("validatedAt"),
                        "score": old_data.get("validationScore"),
                        "status": old_data.get("validationStatus"),
                        "errorCount": old_data.get("errorCount", 0),
                        "warningCount": old_data.get("warningCount", 0)
                    })
        except Exception as read_err:
            logger.warning(f"Could not read previous validation file for {document_id}: {read_err}")

    # Append current validation run to history
    current_snapshot = {
        "validatedAt": report.get("validatedAt") or datetime.now(timezone.utc).isoformat(),
        "score": report.get("validationScore"),
        "status": report.get("validationStatus"),
        "errorCount": report.get("errorCount", 0),
        "warningCount": report.get("warningCount", 0)
    }
    updated_history = [current_snapshot] + existing_history

    report["validationHistory"] = updated_history

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        logger.info(f"Validation report saved: {file_path}")
        return file_path
    except Exception as exc:
        logger.error(f"Failed to save validation report for {document_id}: {exc}", exc_info=True)
        raise


def load_validation_report(document_id: str) -> Optional[Dict[str, Any]]:
    """Load persisted validation JSON report."""
    file_path = get_validation_file_path(document_id)
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.error(f"Failed to load validation report for {document_id}: {exc}")
        return None


def validation_report_exists(document_id: str) -> bool:
    """Check if a validation report exists on disk."""
    return os.path.exists(get_validation_file_path(document_id))
