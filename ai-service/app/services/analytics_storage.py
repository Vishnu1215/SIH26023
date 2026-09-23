import os
import json
import logging
from typing import Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger("ai_service.analytics_storage")

DASHBOARD_FILE_PATH = os.path.join(settings.ANALYTICS_STORAGE_DIR, "dashboard.json")


def get_dashboard_file_path(storage_dir: Optional[str] = None) -> str:
    """Return absolute file path to persisted analytics dashboard JSON."""
    base_dir = storage_dir or settings.ANALYTICS_STORAGE_DIR
    return os.path.join(base_dir, "dashboard.json")


def save_dashboard(dashboard_data: Dict[str, Any], storage_dir: Optional[str] = None) -> str:
    """
    Persist aggregated analytics to storage/analytics/dashboard.json.
    Single source of truth for all analytics queries.
    """
    base_dir = storage_dir or settings.ANALYTICS_STORAGE_DIR
    os.makedirs(base_dir, exist_ok=True)
    file_path = os.path.join(base_dir, "dashboard.json")
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(dashboard_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Analytics dashboard saved successfully at: {file_path}")
        return file_path
    except Exception as exc:
        logger.error(f"Failed to save analytics dashboard: {exc}", exc_info=True)
        raise


def load_dashboard(storage_dir: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Load persisted analytics dashboard JSON from storage."""
    file_path = get_dashboard_file_path(storage_dir)
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.error(f"Failed to read analytics dashboard from {file_path}: {exc}")
        return None


def dashboard_exists(storage_dir: Optional[str] = None) -> bool:
    """Check if the analytics dashboard JSON exists."""
    file_path = get_dashboard_file_path(storage_dir)
    return os.path.exists(file_path)
