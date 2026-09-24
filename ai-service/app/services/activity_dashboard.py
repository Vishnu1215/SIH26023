"""
Phase 13 - Module 7: Unified Activity Dashboard Service.

Aggregates recent activities across all platform components (uploads, reports,
queries, Q&A, audits, recommendations) into a unified chronological feed.
"""

import os
import json
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_unified_activity(limit: int = 25) -> List[Dict[str, Any]]:
    """
    Collects recent activities from audit logs, report history, QA history,
    query history, and recommendation updates. Returns sorted by timestamp desc.
    """
    ai_storage = os.path.join(settings.BASE_DIR, "storage")
    events: List[Dict[str, Any]] = []

    # 1. Collect from Reports
    reports_file = os.path.join(ai_storage, "reports", "report-history.json")
    if os.path.exists(reports_file):
        try:
            with open(reports_file, "r", encoding="utf-8") as f:
                reports = json.load(f)
                for r in reports[:15]:
                    events.append({
                        "id": f"act-rep-{r.get('reportId', '')[:8]}",
                        "timestamp": r.get("createdAt", datetime.now(timezone.utc).isoformat()),
                        "action": "Report Generated",
                        "category": "Reports",
                        "description": f"Generated {r.get('reportType', 'Executive').capitalize()} Report ({r.get('fileName', '')}) in {r.get('format', 'pdf').upper()} format.",
                        "status": "SUCCESS",
                        "actor": r.get("generatedBy", "Executive User"),
                        "badgeColor": "emerald"
                    })
        except Exception as e:
            logger.warning(f"[activity_dashboard] Error loading reports: {e}")

    # 2. Collect from Hybrid QA
    qa_file = os.path.join(ai_storage, "qa_history.json")
    if os.path.exists(qa_file):
        try:
            with open(qa_file, "r", encoding="utf-8") as f:
                qas = json.load(f)
                for q in qas[:15]:
                    events.append({
                        "id": f"act-qa-{q.get('id', '')[:8]}",
                        "timestamp": q.get("timestamp", datetime.now(timezone.utc).isoformat()),
                        "action": "Hybrid Q&A Inquiry",
                        "category": "Q&A",
                        "description": f"Query: \"{q.get('question', '')[:65]}...\" answered with {q.get('confidence', 0.95):.0%} confidence.",
                        "status": "SUCCESS",
                        "actor": "Executive User",
                        "badgeColor": "blue"
                    })
        except Exception as e:
            logger.warning(f"[activity_dashboard] Error loading QA: {e}")

    # 3. Collect from Query History
    query_file = os.path.join(ai_storage, "query_history.json")
    if os.path.exists(query_file):
        try:
            with open(query_file, "r", encoding="utf-8") as f:
                queries = json.load(f)
                for qu in queries[:10]:
                    events.append({
                        "id": f"act-qry-{qu.get('id', '')[:8]}",
                        "timestamp": qu.get("timestamp", datetime.now(timezone.utc).isoformat()),
                        "action": "Natural Language Query",
                        "category": "Search",
                        "description": f"Executed intent '{qu.get('intent', 'search')}': \"{qu.get('query', '')[:60]}\"",
                        "status": "SUCCESS",
                        "actor": "Analyst User",
                        "badgeColor": "purple"
                    })
        except Exception as e:
            logger.warning(f"[activity_dashboard] Error loading queries: {e}")

    # 4. Collect from Recommendations History
    recs_file = os.path.join(ai_storage, "recommendations", "recommendations.json")
    if os.path.exists(recs_file):
        try:
            with open(recs_file, "r", encoding="utf-8") as f:
                recs = json.load(f)
                events.append({
                    "id": "act-rec-latest",
                    "timestamp": recs.get("lastUpdated", datetime.now(timezone.utc).isoformat()),
                    "action": "AI Recommendations Evaluated",
                    "category": "Decision Support",
                    "description": f"Computed {recs.get('summary', {}).get('totalRecommendations', 4)} actionable insights, Risk index: {recs.get('summary', {}).get('overallRisk', 41.9)}% ({recs.get('summary', {}).get('riskLevel', 'Medium')}).",
                    "status": "SUCCESS",
                    "actor": "System Engine",
                    "badgeColor": "amber"
                })
        except Exception as e:
            logger.warning(f"[activity_dashboard] Error loading recommendations: {e}")

    # 5. Collect from Audit Logs
    audit_file = os.path.join(settings.LOGS_STORAGE_DIR, "audit_history.json")
    if os.path.exists(audit_file):
        try:
            with open(audit_file, "r", encoding="utf-8") as f:
                audits = json.load(f)
                for a in audits[:10]:
                    events.append({
                        "id": f"act-aud-{a.get('id', '')[:8]}",
                        "timestamp": a.get("timestamp", datetime.now(timezone.utc).isoformat()),
                        "action": a.get("action", "Audit Event").replace("_", " ").title(),
                        "category": a.get("module", "System"),
                        "description": a.get("details", "Audit record recorded."),
                        "status": a.get("status", "SUCCESS"),
                        "actor": a.get("user", "System Administrator"),
                        "badgeColor": "indigo" if a.get("status") == "SUCCESS" else "rose"
                    })
        except Exception as e:
            logger.warning(f"[activity_dashboard] Error loading audit logs: {e}")

    # Deduplicate by ID and sort descending by timestamp
    seen_ids = set()
    unique_events = []
    for ev in events:
        if ev["id"] not in seen_ids:
            seen_ids.add(ev["id"])
            unique_events.append(ev)

    unique_events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return unique_events[:limit]
