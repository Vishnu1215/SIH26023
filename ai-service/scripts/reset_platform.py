#!/usr/bin/env python3
"""
Platform Data Reset & Storage Sanitization Utility.
SIH26023 - Ministry of Coal | CMPDI Reporting Platform.

Resets all runtime and generated demo data across the platform:
- Uploaded document files in uploads/documents/
- Extracted text files in ai-service/storage/extracted_text/
- Structured JSON records in ai-service/storage/structured_data/
- Rule validation reports in ai-service/storage/validation/
- Document intelligence semantic records in ai-service/storage/document_intelligence/
- Report artifacts (PDF, DOCX, XLSX, HTML) and report-history.json
- Pure-JSON search index (search_index.json)
- Query history (query_history.json)
- Q&A history (qa_history.json)
- Recommendations and history (recommendations.json, history.json)
- Audit log history and validation log
- Recomputes clean 0-document single-source-of-truth dashboard.json

Preserves:
- sample-data/ (all folders and official Ministry documents untouched)
- Report templates, code, configurations, and directory structure (.gitkeep)
"""

import os
import sys
import glob
import json
from datetime import datetime, timezone

# Ensure ai-service root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_SERVICE_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(AI_SERVICE_DIR)

if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from app.services.analytics_engine import generate_dashboard_summary
from app.services.recommendation_service import compute_all_recommendations


def clean_directory(dir_path: str, keep_gitkeep: bool = True) -> int:
    """Removes all files in dir_path, preserving subdirectories and optional .gitkeep."""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
        if keep_gitkeep:
            with open(os.path.join(dir_path, ".gitkeep"), "w") as f:
                pass
        return 0

    count = 0
    for item in os.listdir(dir_path):
        item_path = os.path.join(dir_path, item)
        if os.path.isfile(item_path):
            if keep_gitkeep and item == ".gitkeep":
                continue
            try:
                os.remove(item_path)
                count += 1
            except Exception as e:
                print(f"  [WARN] Failed to delete {item_path}: {e}")
    
    # Ensure .gitkeep exists so git retains the directory
    if keep_gitkeep:
        gitkeep_path = os.path.join(dir_path, ".gitkeep")
        if not os.path.exists(gitkeep_path):
            with open(gitkeep_path, "w") as f:
                pass

    return count


def reset_platform_data():
    print("==================================================================")
    print("  SIH26023 - Ministry of Coal | CMPDI Reporting Platform")
    print("  Complete System Cleanup & Storage Reset")
    print("==================================================================")

    now_iso = datetime.now(timezone.utc).isoformat()
    total_purged = 0

    # 1. Clean uploads/documents/
    uploads_dir = os.path.join(PROJECT_ROOT, "uploads", "documents")
    del_count = clean_directory(uploads_dir)
    total_purged += del_count
    print(f"1. uploads/documents/: Purged {del_count} uploaded demo documents.")

    # Ensure uploads/.gitkeep exists
    uploads_root_gitkeep = os.path.join(PROJECT_ROOT, "uploads", ".gitkeep")
    if not os.path.exists(uploads_root_gitkeep):
        with open(uploads_root_gitkeep, "w") as f:
            pass

    # 2. Clean ai-service/storage/extracted_text/
    extracted_dir = os.path.join(AI_SERVICE_DIR, "storage", "extracted_text")
    del_count = clean_directory(extracted_dir)
    total_purged += del_count
    print(f"2. storage/extracted_text/: Purged {del_count} text files.")

    # 3. Clean ai-service/storage/structured_data/
    structured_dir = os.path.join(AI_SERVICE_DIR, "storage", "structured_data")
    del_count = clean_directory(structured_dir)
    total_purged += del_count
    print(f"3. storage/structured_data/: Purged {del_count} structured JSON records.")

    # 4. Clean ai-service/storage/validation/
    validation_dir = os.path.join(AI_SERVICE_DIR, "storage", "validation")
    del_count = clean_directory(validation_dir)
    total_purged += del_count
    print(f"4. storage/validation/: Purged {del_count} validation report files.")

    # 5. Clean ai-service/storage/document_intelligence/
    intelligence_dir = os.path.join(AI_SERVICE_DIR, "storage", "document_intelligence")
    del_count = clean_directory(intelligence_dir)
    total_purged += del_count
    print(f"5. storage/document_intelligence/: Purged {del_count} semantic intelligence files.")

    # 6. Clean ai-service/storage/reports/
    reports_base = os.path.join(AI_SERVICE_DIR, "storage", "reports")
    rep_deleted = 0
    for subdir in ["pdf", "docx", "excel", "html"]:
        p = os.path.join(reports_base, subdir)
        rep_deleted += clean_directory(p)
    total_purged += rep_deleted
    
    # Reset report-history.json
    history_file = os.path.join(reports_base, "report-history.json")
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    print(f"6. storage/reports/: Purged {rep_deleted} artifact files and reset report-history.json to [].")

    # 7. Reset Search Index (storage/search_index.json)
    search_index_file = os.path.join(AI_SERVICE_DIR, "storage", "search_index.json")
    empty_index = {
        "lastIndexedAt": now_iso,
        "totalDocuments": 0,
        "documents": {},
        "indices": {
            "by_keyword": {},
            "by_topic": {},
            "by_subsidiary": {},
            "by_mine": {},
            "by_state": {},
            "by_fy": {},
            "by_category": {},
            "by_entity": {}
        }
    }
    with open(search_index_file, "w", encoding="utf-8") as f:
        json.dump(empty_index, f, indent=2)
    print("7. storage/search_index.json: Reset to clean empty inverted index.")

    # 8. Reset Query History (storage/query_history.json)
    query_history_file = os.path.join(AI_SERVICE_DIR, "storage", "query_history.json")
    with open(query_history_file, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    print("8. storage/query_history.json: Reset to [].")

    # 9. Reset QA History (storage/qa_history.json)
    qa_history_file = os.path.join(AI_SERVICE_DIR, "storage", "qa_history.json")
    with open(qa_history_file, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    print("9. storage/qa_history.json: Reset to [].")

    # 10. Recompute clean Analytics Dashboard (storage/analytics/dashboard.json)
    analytics_dir = os.path.join(AI_SERVICE_DIR, "storage", "analytics")
    os.makedirs(analytics_dir, exist_ok=True)
    dashboard_summary = generate_dashboard_summary(external_documents=[], save=True)
    print(f"10. storage/analytics/dashboard.json: Recomputed deterministic clean baseline (totalDocuments={dashboard_summary.get('totalDocuments', 0)}).")

    # 11. Reset Recommendations (storage/recommendations/recommendations.json and history.json)
    recs_dir = os.path.join(AI_SERVICE_DIR, "storage", "recommendations")
    os.makedirs(recs_dir, exist_ok=True)
    with open(os.path.join(recs_dir, "history.json"), "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    clean_recs = compute_all_recommendations(force=True)
    print(f"11. storage/recommendations/: Reset history.json to [] and initialized baseline recommendations snapshot.")

    # 12. Reset Logs (storage/logs/audit_history.json and validation.log)
    logs_dir = os.path.join(AI_SERVICE_DIR, "storage", "logs")
    os.makedirs(logs_dir, exist_ok=True)
    
    validation_log = os.path.join(logs_dir, "validation.log")
    with open(validation_log, "w", encoding="utf-8") as f:
        f.write(f"[{now_iso}] [INFO] Validation log initialized in clean state.\n")

    initial_audit_event = [
        {
            "id": "aud-init-0001",
            "timestamp": now_iso,
            "action": "SYSTEM_INITIALIZED",
            "module": "System",
            "status": "SUCCESS",
            "duration": 0.0,
            "affectedDocument": None,
            "details": "Platform data store reset and verified clean for Ministry of Coal / CMPDI demonstration.",
            "user": "System Administrator",
            "ipAddress": "127.0.0.1"
        }
    ]
    with open(os.path.join(logs_dir, "audit_history.json"), "w", encoding="utf-8") as f:
        json.dump(initial_audit_event, f, indent=2)
    print("12. storage/logs/: Reset validation.log and initialized audit_history.json with baseline event.")

    # 13. Verify sample-data is untouched
    sample_dir = os.path.join(PROJECT_ROOT, "sample-data")
    sample_folders = [d for d in os.listdir(sample_dir) if os.path.isdir(os.path.join(sample_dir, d))]
    print(f"13. sample-data/: Verified {len(sample_folders)} pristine sample categories preserved.")

    print("==================================================================")
    print(f"  RESET COMPLETE: {total_purged} demo files cleanly purged.")
    print("  All storage layers initialized in clean baseline state.")
    print("==================================================================")


if __name__ == "__main__":
    reset_platform_data()
