import os
import json
from datetime import datetime, timezone
from app.core.config import settings

# Ensure log directory exists
os.makedirs(os.path.dirname(settings.OCR_LOG_FILE), exist_ok=True)


def log_ocr_event(
    document_id: str,
    filename: str,
    loader_used: str,
    page_count: int,
    processing_time: float,
    status: str,
    error_code: str = None
):
    """
    Append an OCR / extraction processing event to logs/ocr.log.
    Records timestamp, documentId, filename, loaderUsed, pageCount, processingTime, status, errorCode.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    log_entry = {
        "timestamp": timestamp,
        "documentId": document_id,
        "filename": filename,
        "loaderUsed": loader_used,
        "pageCount": page_count,
        "processingTime": processing_time,
        "status": status,
        "errorCode": error_code
    }

    try:
        with open(settings.OCR_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print(f"[OCR_LOGGER_ERROR] Failed to write to {settings.OCR_LOG_FILE}: {e}")
