"""
Phase 13 - Module 4: Storage Monitor Service.

Provides real-time inspection of file-based storage systems, directory allocations,
file counts, folder sizes, and identifies the largest persisted assets across
the Ministry of Coal / CMPDI platform.
"""

import os
import shutil
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)


def _format_bytes(size_bytes: int) -> str:
    """Format bytes into human-readable string (KB, MB, GB)."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def _scan_directory(dir_path: str) -> Dict[str, Any]:
    """Scan a directory recursively and calculate total files, size, latest modified, and file extensions."""
    if not os.path.exists(dir_path):
        return {
            "exists": False,
            "fileCount": 0,
            "folderSizeBytes": 0,
            "folderSizeFormatted": "0 B",
            "latestModified": None,
            "extensionCounts": {}
        }

    total_files = 0
    total_size = 0
    latest_mtime = 0.0
    ext_counts: Dict[str, int] = {}

    try:
        for root, _, files in os.walk(dir_path):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    stat = os.stat(file_path)
                    total_files += 1
                    total_size += stat.st_size
                    if stat.st_mtime > latest_mtime:
                        latest_mtime = stat.st_mtime
                    _, ext = os.path.splitext(file)
                    ext = ext.lower() or "no_ext"
                    ext_counts[ext] = ext_counts.get(ext, 0) + 1
                except Exception:
                    continue
    except Exception as e:
        logger.warning(f"[storage_monitor] Error scanning {dir_path}: {e}")

    latest_iso = (
        datetime.fromtimestamp(latest_mtime, tz=timezone.utc).isoformat()
        if latest_mtime > 0
        else None
    )

    return {
        "exists": True,
        "fileCount": total_files,
        "folderSizeBytes": total_size,
        "folderSizeFormatted": _format_bytes(total_size),
        "latestModified": latest_iso,
        "extensionCounts": ext_counts
    }


def get_storage_metrics() -> Dict[str, Any]:
    """
    Scans all key storage folders and aggregates folder breakdown, total volume,
    largest files, and storage health.
    """
    root_dir = os.path.dirname(settings.BASE_DIR)
    uploads_dir = os.path.join(root_dir, "uploads")
    ai_storage_dir = os.path.join(settings.BASE_DIR, "storage")

    monitored_folders = [
        {
            "id": "uploads",
            "name": "Uploaded Source Documents",
            "path": uploads_dir,
            "description": "Original raw PDF, CSV, Excel, and image documents uploaded by users."
        },
        {
            "id": "reports",
            "name": "Generated Statutory Reports",
            "path": os.path.join(ai_storage_dir, "reports"),
            "description": "Multi-format generated reports (PDF, XLSX, DOCX, HTML)."
        },
        {
            "id": "structured_data",
            "name": "Structured Document Data",
            "path": settings.STRUCTURED_DATA_DIR,
            "description": "Deterministic normalized tabular and metric JSON extractions."
        },
        {
            "id": "validation",
            "name": "Validation Engine Records",
            "path": settings.VALIDATION_STORAGE_DIR,
            "description": "Rule validation audits, anomaly flags, and statutory compliance checks."
        },
        {
            "id": "analytics",
            "name": "Analytics Master Store",
            "path": settings.ANALYTICS_STORAGE_DIR,
            "description": "Single source of truth aggregated KPIs, production metrics, and trend timelines."
        },
        {
            "id": "document_intelligence",
            "name": "Document Intelligence & Topics",
            "path": os.path.join(ai_storage_dir, "document_intelligence"),
            "description": "Deterministic semantic indices, document classifications, and topic relationships."
        },
        {
            "id": "recommendations",
            "name": "Decision Support & Recommendations",
            "path": os.path.join(ai_storage_dir, "recommendations"),
            "description": "Persisted risk assessments, operational alerts, and executive action points."
        },
        {
            "id": "logs",
            "name": "System & Audit Logs",
            "path": settings.LOGS_STORAGE_DIR,
            "description": "Immutable compliance trails, processing histories, and audit records."
        },
        {
            "id": "extracted_text",
            "name": "OCR Extracted Text Cache",
            "path": settings.TEXT_STORAGE_DIR,
            "description": "Raw OCR output cache extracted from documents."
        }
    ]

    folder_metrics: List[Dict[str, Any]] = []
    total_files = 0
    total_size_bytes = 0
    all_files_list: List[Dict[str, Any]] = []

    for folder in monitored_folders:
        dir_path = folder["path"]
        scan = _scan_directory(dir_path)
        total_files += scan["fileCount"]
        total_size_bytes += scan["folderSizeBytes"]

        folder_metrics.append({
            "id": folder["id"],
            "name": folder["name"],
            "path": os.path.relpath(dir_path, root_dir) if os.path.exists(dir_path) else dir_path,
            "description": folder["description"],
            "exists": scan["exists"],
            "fileCount": scan["fileCount"],
            "folderSizeBytes": scan["folderSizeBytes"],
            "folderSizeFormatted": scan["folderSizeFormatted"],
            "latestModified": scan["latestModified"],
            "extensionCounts": scan["extensionCounts"]
        })

        # Collect files for largest files scan (capped walk)
        if scan["exists"]:
            try:
                for root, _, files in os.walk(dir_path):
                    for file in files:
                        fp = os.path.join(root, file)
                        try:
                            stat = os.stat(fp)
                            all_files_list.append({
                                "fileName": file,
                                "folder": folder["name"],
                                "relativePath": os.path.relpath(fp, root_dir),
                                "sizeBytes": stat.st_size,
                                "sizeFormatted": _format_bytes(stat.st_size),
                                "lastModified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
                            })
                        except Exception:
                            continue
            except Exception:
                pass

    # Sort largest files
    all_files_list.sort(key=lambda x: x["sizeBytes"], reverse=True)
    largest_files = all_files_list[:10]

    # Calculate percentage distribution per folder
    for f in folder_metrics:
        if total_size_bytes > 0:
            f["percentageOfTotal"] = round((f["folderSizeBytes"] / total_size_bytes) * 100, 1)
        else:
            f["percentageOfTotal"] = 0.0

    # Disk usage
    disk_total = 0
    disk_free = 0
    disk_used = 0
    disk_percent = 0.0
    try:
        total_d, used_d, free_d = shutil.disk_usage(settings.BASE_DIR)
        disk_total = total_d
        disk_used = used_d
        disk_free = free_d
        if disk_total > 0:
            disk_percent = round((disk_used / disk_total) * 100, 1)
    except Exception as e:
        logger.warning(f"[storage_monitor] Failed disk_usage: {e}")

    return {
        "status": "success",
        "summary": {
            "totalFiles": total_files,
            "totalSizeBytes": total_size_bytes,
            "totalSizeFormatted": _format_bytes(total_size_bytes),
            "monitoredFoldersCount": len(monitored_folders),
            "diskTotalFormatted": _format_bytes(disk_total) if disk_total > 0 else "N/A",
            "diskFreeFormatted": _format_bytes(disk_free) if disk_free > 0 else "N/A",
            "diskUsagePercentage": disk_percent
        },
        "folders": folder_metrics,
        "largestFiles": largest_files
    }
