"""
Phase 12 - Module 7: Recommendation Coordinator Service.

Orchestrates Phase 12 Decision Support & Recommendations:
- Loads single sources of truth (dashboard.json, search_index.json, reports, validation)
- Invokes Recommendation Engine (Module 1)
- Invokes Risk Assessment Engine (Module 2)
- Invokes Trend Analyzer (Module 3)
- Invokes Executive Insights Engine (Module 4)
- Invokes Alerts Engine (Module 5)
- Persists into storage/recommendations/recommendations.json (Module 6)
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.services.analytics_storage import load_dashboard
from app.services.analytics_engine import generate_dashboard_summary
from app.services.search_index import load_search_index
from app.services.report_storage import get_report_history
from app.services.recommendation_storage import (
    load_recommendations,
    save_recommendations,
    load_recommendations_history,
    clear_recommendations_history
)
from app.services.risk_engine import calculate_operational_risk
from app.services.trend_analyzer import analyze_trends
from app.services.executive_insights import generate_executive_insights
from app.services.alerts_engine import generate_operational_alerts
from app.services.recommendation_engine import generate_recommendations

logger = logging.getLogger(__name__)

AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VALIDATION_DIR = os.path.join(AI_SERVICE_DIR, "storage", "validation")


def _get_active_dashboard() -> Dict[str, Any]:
    """Retrieve single source of truth analytics dashboard."""
    data = load_dashboard()
    if not data or not data.get("documents") or data.get("documents", {}).get("totalDocuments", 0) == 0:
        try:
            data = generate_dashboard_summary(save=True)
        except Exception as e:
            logger.warning(f"[recommendation_service] Could not recompute dashboard: {e}")
            data = {}
    return data or {}


def _get_all_indexed_documents() -> List[Dict[str, Any]]:
    """Loads all documents registered in search index."""
    idx = load_search_index()
    return list(idx.get("documents", {}).values())


def compute_all_recommendations(force: bool = False) -> Dict[str, Any]:
    """
    Coordinates end-to-end evaluation and persistence of all Phase 12 decision support modules.
    If existing cached recommendations are recent (< 5 min) and force=False, returns cached.
    """
    if not force:
        cached = load_recommendations()
        if cached and cached.get("lastUpdated"):
            # Check age (within 300s)
            try:
                dt = datetime.fromisoformat(cached["lastUpdated"].replace("Z", "+00:00"))
                age = (datetime.now(timezone.utc) - dt).total_seconds()
                if age < 300:
                    return cached
            except Exception:
                pass

    # 1. Load Single Sources of Truth
    dashboard = _get_active_dashboard()
    indexed_docs = _get_all_indexed_documents()
    reports_history = get_report_history()

    # 2. Module 2: Calculate Operational Risk Score
    risk_payload = calculate_operational_risk(
        dashboard=dashboard,
        indexed_docs=indexed_docs
    )

    # 3. Module 3: Analyze Trends
    trends_payload = analyze_trends(
        dashboard=dashboard,
        reports_history=reports_history,
        indexed_docs=indexed_docs
    )

    # 4. Module 4: Generate Executive Insights
    insights_list = generate_executive_insights(
        dashboard=dashboard,
        reports_history=reports_history,
        indexed_docs=indexed_docs
    )

    # 5. Module 5: Generate Operational Alerts
    alerts_list = generate_operational_alerts(
        dashboard=dashboard,
        reports_history=reports_history,
        indexed_docs=indexed_docs
    )

    # 6. Module 1: Generate Prioritized Recommendations
    recs_list = generate_recommendations(
        dashboard=dashboard,
        reports_history=reports_history,
        indexed_docs=indexed_docs
    )

    # 7. Aggregate Summary
    critical_alerts = [a for a in alerts_list if a.get("severity") in ["Red", "Critical"]]
    high_priority_recs = [r for r in recs_list if r.get("priority") in ["Critical", "High"]]

    full_payload = {
        "status": "success",
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "overallRisk": risk_payload.get("overallRisk", 0),
            "riskLevel": risk_payload.get("riskLevel", "Low"),
            "totalRecommendations": len(recs_list),
            "highPriorityRecommendations": len(high_priority_recs),
            "totalAlerts": len(alerts_list),
            "criticalAlertsCount": len(critical_alerts),
            "insightsCount": len(insights_list)
        },
        "risk": risk_payload,
        "recommendations": recs_list,
        "alerts": alerts_list,
        "insights": insights_list,
        "trends": trends_payload
    }

    # 8. Persist to storage/recommendations/recommendations.json and history.json
    save_recommendations(full_payload)

    return full_payload


def get_recommendations_list(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    subsidiary: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Returns filtered list of recommendations."""
    payload = compute_all_recommendations()
    recs = payload.get("recommendations", [])

    filtered = []
    for r in recs:
        if category and r.get("category", "").lower() != category.lower():
            continue
        if priority and r.get("priority", "").lower() != priority.lower():
            continue
        if subsidiary:
            subs = [s.lower() for s in r.get("affectedSubsidiaries", [])]
            if subsidiary.lower() not in subs:
                continue
        filtered.append(r)
    return filtered


def get_insights_list() -> List[Dict[str, Any]]:
    """Returns executive insights list."""
    payload = compute_all_recommendations()
    return payload.get("insights", [])


def get_alerts_list(severity: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns operational alerts list with optional severity filter."""
    payload = compute_all_recommendations()
    alerts = payload.get("alerts", [])

    if severity:
        return [a for a in alerts if a.get("severity", "").lower() == severity.lower()]
    return alerts


def get_risk_assessment() -> Dict[str, Any]:
    """Returns operational risk assessment."""
    payload = compute_all_recommendations()
    return payload.get("risk", {})


def get_trend_analysis() -> Dict[str, Any]:
    """Returns trend analysis."""
    payload = compute_all_recommendations()
    return payload.get("trends", {})
