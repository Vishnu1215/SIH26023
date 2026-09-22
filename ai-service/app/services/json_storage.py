import os
import json
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("ai_service.json_storage")

# Ensure storage directory exists
os.makedirs(settings.STRUCTURED_DATA_DIR, exist_ok=True)


def get_structured_file_path(document_id: str) -> str:
    """Return the absolute path to the structured JSON file for a given documentId."""
    return os.path.join(settings.STRUCTURED_DATA_DIR, f"{document_id}.json")


def save_structured_data(document_id: str, data: Dict[str, Any]) -> str:
    """
    Save structured document JSON to storage/structured_data/{documentId}.json.
    Returns the file path.
    """
    file_path = get_structured_file_path(document_id)
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved structured JSON for document {document_id} at {file_path}")
        return file_path
    except Exception as exc:
        logger.error(f"Failed to save structured JSON for {document_id}: {exc}")
        raise


def load_structured_data(document_id: str) -> Optional[Dict[str, Any]]:
    """
    Load structured document JSON from storage/structured_data/{documentId}.json.
    Returns None if file does not exist.
    """
    file_path = get_structured_file_path(document_id)
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.error(f"Failed to load structured JSON for {document_id}: {exc}")
        return None


def structured_data_exists(document_id: str) -> bool:
    """Check if structured data JSON exists for documentId."""
    return os.path.exists(get_structured_file_path(document_id))
