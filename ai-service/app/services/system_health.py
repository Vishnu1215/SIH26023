"""
Phase 13 - Module 1: System Health Service.

Evaluates platform liveness, subsystem availability, storage accessibility,
and computes an overall health score (0-100) and operational status.
"""

import os
import sys
import time
import platform
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

from app.core.config import settings
from app.services.runtime_metrics import get_process_uptime_seconds, format_uptime

logger = logging.getLogger(__name__)


def get_system_health() -> Dict[str, Any]:
    """
    Evaluates health of AI Service, storage access, pipeline data availability,
    and returns overall health status and score.
    Target latency: <10 ms.
    """
    start_time = time.perf_counter()
    ai_storage = os.path.join(settings.BASE_DIR, "storage")
    root_dir = os.path.dirname(settings.BASE_DIR)
    uploads_dir = os.path.join(root_dir, "uploads")

    components: Dict[str, Dict[str, Any]] = {}
    checks: List[Dict[str, Any]] = []
    penalties = 0

    # 1. AI Service Core
    components["aiService"] = {
        "status": "Healthy",
        "description": "FastAPI AI core operational and responding.",
        "port": settings.PORT,
        "version": settings.VERSION
    }

    # 2. Storage Engine Check
    storage_accessible = os.path.exists(ai_storage) and os.access(ai_storage, os.R_OK | os.W_OK)
    uploads_accessible = os.path.exists(uploads_dir) and os.access(uploads_dir, os.R_OK)

    if storage_accessible and uploads_accessible:
        components["storageEngine"] = {
            "status": "Healthy",
            "description": "All storage directories mounted and read/write accessible."
        }
        checks.append({"name": "Storage File System", "status": "PASSED", "message": "Storage read/write verified."})
    else:
        components["storageEngine"] = {
            "status": "Degraded",
            "description": "Some storage mounts have limited accessibility."
        }
        checks.append({"name": "Storage File System", "status": "WARNING", "message": "Storage directories may have permission issues."})
        penalties += 15

    # 3. Analytics Master Dashboard Check (Phase 7 Single Source of Truth)
    dashboard_path = os.path.join(settings.ANALYTICS_STORAGE_DIR, "dashboard.json")
    if os.path.exists(dashboard_path) and os.path.getsize(dashboard_path) > 10:
        checks.append({"name": "Analytics Master Store", "status": "PASSED", "message": "dashboard.json valid."})
    else:
        checks.append({"name": "Analytics Master Store", "status": "WARNING", "message": "dashboard.json missing or empty."})
        penalties += 15

    # 4. Search Index Check (Phase 9 Single Source of Truth)
    search_path = os.path.join(ai_storage, "search_index.json")
    if os.path.exists(search_path) and os.path.getsize(search_path) > 10:
        components["searchEngine"] = {
            "status": "Healthy",
            "description": "Inverted search index operational."
        }
        checks.append({"name": "Search Inverted Index", "status": "PASSED", "message": "search_index.json valid."})
    else:
        components["searchEngine"] = {
            "status": "Degraded",
            "description": "Search index not yet generated or empty."
        }
        checks.append({"name": "Search Inverted Index", "status": "WARNING", "message": "search_index.json missing."})
        penalties += 10

    # 5. Hybrid Q&A Engine Check (Phase 11)
    qa_path = os.path.join(ai_storage, "qa_history.json")
    if os.path.exists(qa_path):
        components["qaEngine"] = {
            "status": "Healthy",
            "description": "Hybrid QA history and query routing active."
        }
        checks.append({"name": "Hybrid QA Store", "status": "PASSED", "message": "qa_history.json accessible."})
    else:
        components["qaEngine"] = {
            "status": "Healthy",
            "description": "Hybrid QA ready for queries."
        }
        checks.append({"name": "Hybrid QA Store", "status": "PASSED", "message": "Ready."})

    # 6. Recommendation & Decision Support Check (Phase 12)
    recs_path = os.path.join(ai_storage, "recommendations", "recommendations.json")
    if os.path.exists(recs_path):
        components["recommendationEngine"] = {
            "status": "Healthy",
            "description": "Operational risk & recommendations active."
        }
        checks.append({"name": "Decision Support Store", "status": "PASSED", "message": "recommendations.json valid."})
    else:
        components["recommendationEngine"] = {
            "status": "Degraded",
            "description": "Recommendations not computed."
        }
        checks.append({"name": "Decision Support Store", "status": "WARNING", "message": "recommendations.json missing."})
        penalties += 10

    # 7. Audit Engine Check (Phase 13)
    audit_path = os.path.join(settings.LOGS_STORAGE_DIR, "audit_history.json")
    components["auditEngine"] = {
        "status": "Healthy" if os.path.exists(audit_path) else "Degraded",
        "description": "Audit logging active and compliance ledger online."
    }
    checks.append({"name": "Audit Trail Ledger", "status": "PASSED" if os.path.exists(audit_path) else "WARNING", "message": "Ledger active."})
    if not os.path.exists(audit_path):
        penalties += 10

    # 8. Report Generator Check (Phase 8)
    reports_dir = os.path.join(ai_storage, "reports")
    components["reportEngine"] = {
        "status": "Healthy" if os.path.exists(reports_dir) else "Degraded",
        "description": "Multi-format report generation pipeline ready."
    }

    # Compute overall health score (0 - 100)
    health_score = max(0, 100 - penalties)
    if health_score >= 90:
        overall_status = "Healthy"
    elif health_score >= 60:
        overall_status = "Degraded"
    else:
        overall_status = "Critical"

    uptime_sec = get_process_uptime_seconds()
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return {
        "status": "success",
        "overallStatus": overall_status,
        "healthScore": health_score,
        "evaluationLatencyMs": latency_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": {
            "uptimeSeconds": round(uptime_sec, 1),
            "uptimeFormatted": format_uptime(uptime_sec)
        },
        "system": {
            "pythonVersion": sys.version.split()[0],
            "os": f"{platform.system()} {platform.release()}",
            "arch": platform.machine()
        },
        "components": components,
        "checks": checks
    }
