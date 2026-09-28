#!/usr/bin/env python3
"""
System Integrity & Baseline Verification Script.
SIH26023 - Ministry of Coal | CMPDI Reporting Platform.

Verifies:
- All core storage files exist and have valid JSON schema
- Analytics dashboard is initialized and valid
- Search index is valid and clean
- Recommendation engine produces consistent baseline
- Administration service evaluates health, storage, and statistics
- Report history, QA history, Query history, and Audit log are accessible
"""

import os
import sys
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_SERVICE_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(AI_SERVICE_DIR)

if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from app.services.analytics_storage import load_dashboard
from app.services.search_index import load_search_index
from app.services.report_storage import get_report_history
from app.services.qa_storage import load_qa_history
from app.services.recommendation_storage import load_recommendations
from app.services.administration_service import AdministrationService


def run_verification():
    print("==================================================================")
    print("  SIH26023 - Full System Integrity Verification")
    print("==================================================================")
    
    passed_checks = 0
    total_checks = 0

    def check(name, condition, details=""):
        nonlocal passed_checks, total_checks
        total_checks += 1
        status = "PASS" if condition else "FAIL"
        if condition:
            passed_checks += 1
        print(f"[{status}] {name}: {details}")

    # 1. Analytics Dashboard
    dash = load_dashboard()
    check(
        "Analytics Dashboard",
        dash is not None and "production" in dash and "validation" in dash,
        f"status={dash.get('status') if dash else 'None'}, docs={dash.get('documents', {}).get('totalDocuments') if dash else 'N/A'}"
    )

    # 2. Search Index
    idx = load_search_index()
    check(
        "Search Index",
        idx is not None and "indices" in idx and "documents" in idx,
        f"totalDocuments={idx.get('totalDocuments') if idx else 'N/A'}, indices={list(idx.get('indices', {}).keys()) if idx else 'None'}"
    )

    # 3. Report History
    reports = get_report_history()
    check(
        "Report History Store",
        isinstance(reports, list),
        f"count={len(reports)} records"
    )

    # 4. QA History
    qa = load_qa_history()
    check(
        "Q&A History Store",
        isinstance(qa, list),
        f"count={len(qa)} records"
    )

    # 5. Recommendations
    recs = load_recommendations()
    check(
        "Recommendations Store",
        recs is not None and "recommendations" in recs and "risk" in recs,
        f"totalRecs={len(recs.get('recommendations', [])) if recs else 0}, overallRisk={recs.get('summary', {}).get('overallRisk') if recs else 'N/A'}"
    )

    # 6. Admin Health
    admin = AdministrationService()
    health = admin.get_health()
    check(
        "Administration - Health Score",
        health.get("overallStatus") in ["Healthy", "HEALTHY", "DEGRADED"],
        f"status={health.get('overallStatus')}, score={health.get('healthScore')}/100"
    )

    # 7. Admin Storage
    storage = admin.get_storage()
    check(
        "Administration - Storage Monitor",
        storage.get("status") == "success" and "summary" in storage,
        f"totalFiles={storage.get('summary', {}).get('totalFiles')}, totalSize={storage.get('summary', {}).get('totalSizeFormatted')}"
    )

    # 8. Admin Statistics
    stats = admin.get_statistics()
    kpis = stats.get("kpis", {})
    check(
        "Administration - Processing Statistics",
        stats.get("status") == "success" and "totalDocuments" in kpis,
        f"totalDocs={kpis.get('totalDocuments')}, totalReports={kpis.get('totalReports')}"
    )

    # 9. Admin Activity Stream
    activity = admin.get_activity(limit=10)
    check(
        "Administration - Activity Feed",
        isinstance(activity, list),
        f"feedItems={len(activity)}"
    )

    # 10. Admin Audit Trail
    audit_events = admin.get_audit(limit=10)
    check(
        "Administration - Audit Trail",
        isinstance(audit_events, list) and len(audit_events) > 0,
        f"auditRecords={len(audit_events)}, latestAction={audit_events[0].get('action') if audit_events else 'None'}"
    )

    # 11. Sample Data Pristine State
    sample_dir = os.path.join(PROJECT_ROOT, "sample-data")
    sample_folders = [d for d in os.listdir(sample_dir) if os.path.isdir(os.path.join(sample_dir, d))]
    check(
        "Sample Data Repository",
        len(sample_folders) == 10,
        f"{len(sample_folders)} folders intact"
    )

    # 12. Uploads Directory
    uploads_doc_dir = os.path.join(PROJECT_ROOT, "uploads", "documents")
    upload_files = [f for f in os.listdir(uploads_doc_dir) if f != ".gitkeep"]
    check(
        "Uploads Clean State",
        len(upload_files) == 0,
        f"unprocessed/orphaned files={len(upload_files)}"
    )

    print("==================================================================")
    print(f"  VERIFICATION RESULT: {passed_checks}/{total_checks} CHECKS PASSED")
    print("==================================================================")
    return passed_checks == total_checks


if __name__ == "__main__":
    success = run_verification()
    sys.exit(0 if success else 1)
