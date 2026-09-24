"""
Phase 13 - Module 8: Unified Administration Service.

Primary orchestrator coordinating all administrative capabilities:
- System Health & Availability
- Processing Statistics & KPI Aggregation
- File-Based Storage Monitoring
- Runtime Latencies & Performance
- System Configuration Profiles
- Unified Multi-Source Activity Stream
- Government Audit Trail Management
"""

import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.services.system_health import get_system_health
from app.services.processing_statistics import get_processing_statistics
from app.services.storage_monitor import get_storage_metrics
from app.services.runtime_metrics import get_runtime_metrics
from app.services.configuration_manager import get_configuration_summary
from app.services.activity_dashboard import get_unified_activity
from app.services.audit_logger import (
    log_audit_event,
    get_audit_events,
    clear_audit_events,
    init_audit_storage
)

logger = logging.getLogger(__name__)


class AdministrationService:
    """Central administrator coordinator for Phase 13."""

    def __init__(self):
        init_audit_storage()

    def get_health(self) -> Dict[str, Any]:
        """Module 1: Real-time health evaluation."""
        return get_system_health()

    def get_statistics(self) -> Dict[str, Any]:
        """Module 3: Processing and pipeline statistics."""
        return get_processing_statistics()

    def get_storage(self) -> Dict[str, Any]:
        """Module 4: Storage breakdown and file metrics."""
        return get_storage_metrics()

    def get_runtime(self) -> Dict[str, Any]:
        """Module 5: Runtime performance and latencies."""
        return get_runtime_metrics()

    def get_configuration(self) -> Dict[str, Any]:
        """Module 6: Read-only platform configuration."""
        return get_configuration_summary()

    def get_activity(self, limit: int = 25) -> List[Dict[str, Any]]:
        """Module 7: Unified multi-source activity feed."""
        return get_unified_activity(limit=limit)

    def get_audit(
        self,
        module: Optional[str] = None,
        status: Optional[str] = None,
        date: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Module 2: Government compliance audit trail."""
        return get_audit_events(module=module, status=status, date=date, limit=limit)

    def clear_audit(self) -> bool:
        """Module 2: Clear audit trail."""
        return clear_audit_events()

    def refresh_system_state(self, user: str = "System Administrator") -> Dict[str, Any]:
        """
        Orchestrates an administrative refresh of storage scans,
        caches, and logs a verified audit event.
        """
        start_time = time.perf_counter()

        # Re-evaluate health and storage
        health = get_system_health()
        storage = get_storage_metrics()
        stats = get_processing_statistics()

        duration = round((time.perf_counter() - start_time) * 1000, 2)

        # Record audit event
        audit_rec = log_audit_event(
            action="ADMIN_REFRESH",
            module="Administration",
            status="SUCCESS",
            duration=duration,
            affectedDocument=None,
            details=f"System administrative refresh completed in {duration}ms. Health score: {health.get('healthScore', 100)}/100, Total files: {storage.get('summary', {}).get('totalFiles', 0)}.",
            user=user
        )

        return {
            "status": "success",
            "message": "System administration cache and metrics successfully refreshed.",
            "durationMs": duration,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "auditEventId": audit_rec.get("id"),
            "healthScore": health.get("healthScore"),
            "overallStatus": health.get("overallStatus"),
            "totalFiles": storage.get("summary", {}).get("totalFiles"),
            "totalStorage": storage.get("summary", {}).get("totalSizeFormatted")
        }


# Singleton instance
admin_service = AdministrationService()
