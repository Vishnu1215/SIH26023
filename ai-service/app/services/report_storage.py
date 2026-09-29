import os
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPORTS_DIR = os.path.join(AI_SERVICE_DIR, "storage", "reports")
HISTORY_FILE = os.path.join(REPORTS_DIR, "report-history.json")

SUBDIRS = {
    "pdf": os.path.join(REPORTS_DIR, "pdf"),
    "docx": os.path.join(REPORTS_DIR, "docx"),
    "excel": os.path.join(REPORTS_DIR, "excel"),
    "xlsx": os.path.join(REPORTS_DIR, "excel"),
    "html": os.path.join(REPORTS_DIR, "html"),
}


def init_report_storage() -> None:
    """Ensure report storage directories and manifest exist."""
    os.makedirs(REPORTS_DIR, exist_ok=True)
    for path in SUBDIRS.values():
        os.makedirs(path, exist_ok=True)
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)


def get_report_history() -> List[Dict[str, Any]]:
    """Retrieve full history of generated reports, sorted newest first from MongoDB Atlas."""
    init_report_storage()
    # 1. Primary Source: MongoDB Atlas
    try:
        from app.database import get_sync_db
        db = get_sync_db()
        docs = list(db["generated_reports"].find({}, {"_id": 0}).sort("createdAt", -1))
        if docs:
            return docs
    except Exception as e:
        pass

    # 2. Local fallback
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
                if isinstance(history, list):
                    return sorted(
                        history,
                        key=lambda r: r.get("createdAt", ""),
                        reverse=True
                    )
    except Exception as e:
        print(f"[report_storage] Error loading history: {e}")
    return []


def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    """Find a report record by reportId from MongoDB Atlas."""
    try:
        from app.database import get_sync_db
        db = get_sync_db()
        doc = db["generated_reports"].find_one({"reportId": report_id}, {"_id": 0})
        if doc:
            return doc
    except Exception as e:
        pass

    history = get_report_history()
    for item in history:
        if item.get("reportId") == report_id:
            return item
    return None


def save_report_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Save or update a report record in MongoDB Atlas and local disk."""
    init_report_storage()
    
    # 1. Persist into MongoDB Atlas 'generated_reports'
    try:
        from app.database import get_sync_db
        db = get_sync_db()
        # Clean record for MongoDB
        clean_record = {k: v for k, v in record.items() if k != "_id"}
        db["generated_reports"].update_one(
            {"reportId": record.get("reportId")},
            {"$set": clean_record},
            upsert=True
        )
    except Exception as e:
        print(f"[report_storage] MongoDB persistence warning: {e}")

    # 2. Also keep local manifest
    history = []
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
    except Exception:
        history = []

    existing_idx = next(
        (i for i, r in enumerate(history) if r.get("reportId") == record.get("reportId")),
        None
    )
    if existing_idx is not None:
        history[existing_idx] = record
    else:
        history.insert(0, record)
        
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"[report_storage] Error saving history: {e}")
        
    return record


def delete_report(report_id: str) -> bool:
    """Delete the generated report file and remove it from MongoDB and history."""
    init_report_storage()

    # 1. Remove from MongoDB Atlas
    try:
        from app.database import get_sync_db
        db = get_sync_db()
        db["generated_reports"].delete_one({"reportId": report_id})
    except Exception as e:
        pass

    history = get_report_history()
    target_record = None
    new_history = []
    
    for r in history:
        if r.get("reportId") == report_id:
            target_record = r
        else:
            new_history.append(r)
            
    if not target_record:
        return False
        
    # Delete physical file if present
    file_path = target_record.get("filePath")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"[report_storage] Error deleting file {file_path}: {e}")
            
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(new_history, f, indent=2)
    except Exception as e:
        pass
    return True


def get_report_file_path(report_id: str, fmt: str, filename: str) -> str:
    """Compute standard storage path for a report file."""
    init_report_storage()
    fmt_key = fmt.lower()
    folder = SUBDIRS.get(fmt_key, REPORTS_DIR)
    safe_filename = f"{report_id}_{filename}"
    return os.path.join(folder, safe_filename)
