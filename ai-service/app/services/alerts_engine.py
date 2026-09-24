"""
Phase 12 - Module 5: Alerts Engine.

Generates deterministic operational, statutory, and data quality alerts:
- Severity: Red (Critical), Orange (High), Yellow (Medium)
- Sources: Production deficits, Validation errors, Missing statutory fields,
           Low quality ratings, OCR failures, Missing statutory reports.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List

def generate_operational_alerts(
    dashboard: Dict[str, Any],
    reports_history: List[Dict[str, Any]] = None,
    indexed_docs: List[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Generates deterministic alerts mapped to Red, Orange, and Yellow severity tiers.
    """
    alerts: List[Dict[str, Any]] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    prod = dashboard.get("production", {})
    val = dashboard.get("validation", {})
    quality = dashboard.get("quality", {})
    docs = dashboard.get("documents", {})
    rankings = dashboard.get("rankings", {})
    subsidiaries = dashboard.get("subsidiaries", [])

    docs_list = indexed_docs or []
    total_docs = max(1, len(docs_list))

    # Alert 1: Low Production Achievement / Deficit
    achieve_pct = prod.get("productionAchievementPct", prod.get("productionAchievement", 100.0))
    tot_prod = prod.get("totalCoalProduction", 0)
    tot_target = prod.get("totalTargetProduction", 0)

    if tot_target > 0 and achieve_pct < 85.0:
        alerts.append({
            "id": f"ALT-PROD-{len(alerts)+1:03d}",
            "title": "Critical Coal Production Shortfall",
            "description": f"National coal production is at {achieve_pct:.1f}% of statutory target ({tot_prod:,.1f} MT vs {tot_target:,.1f} MT target), indicating an operational deficit.",
            "severity": "Red",
            "source": "storage/analytics/dashboard.json (production)",
            "recommendation": "Convene an operational review meeting with lagging subsidiaries to address extraction bottlenecks and revised mine plans.",
            "timestamp": now_iso,
            "affectedEntities": [s.get("subsidiary") for s in subsidiaries if s.get("production", 0) < s.get("target", 0)]
        })
    elif tot_target > 0 and achieve_pct < 95.0:
        alerts.append({
            "id": f"ALT-PROD-{len(alerts)+1:03d}",
            "title": "Coal Production Trailing Target",
            "description": f"Overall production stands at {achieve_pct:.1f}% of targeted quota. Production is lagging statutory target by {tot_target - tot_prod:,.1f} MT.",
            "severity": "Orange",
            "source": "storage/analytics/dashboard.json (production)",
            "recommendation": "Accelerate overburden removal and optimize rake availability to meet quarterly dispatch targets.",
            "timestamp": now_iso,
            "affectedEntities": ["CIL Subsidiaries"]
        })

    # Alert 2: High Validation Errors / Non-Compliant Documents
    invalid_docs = val.get("invalidDocuments", 0)
    val_accuracy = val.get("validationAccuracy", 100.0)

    if invalid_docs > 0:
        # Find affected document titles
        affected_doc_titles = [d.get("reportTitle") or d.get("fileName") for d in docs_list if d.get("validationStatus") in ["Invalid", "Needs Review", "Failed"]]
        severity = "Red" if val_accuracy < 75.0 or invalid_docs >= 3 else "Orange"

        alerts.append({
            "id": f"ALT-VAL-{len(alerts)+1:03d}",
            "title": f"Statutory Validation Errors in {invalid_docs} Document(s)",
            "description": f"{invalid_docs} document(s) failed automated statutory compliance audit (VR-001..VR-010). Platform validation accuracy is {val_accuracy:.1f}%.",
            "severity": severity,
            "source": "storage/validation/",
            "recommendation": "Audit non-compliant returns in the Document Hub. Correct numerical inconsistencies or request revised returns from colliery managers.",
            "timestamp": now_iso,
            "affectedEntities": affected_doc_titles[:5]
        })

    # Alert 3: Missing Critical Statutory Metadata (Financial Year / State / Mine)
    missing_fy_docs = [d.get("reportTitle") or d.get("fileName") for d in docs_list if not d.get("financialYear") or d.get("financialYear") in ["N/A", "Unknown", None]]
    missing_state_docs = [d.get("reportTitle") or d.get("fileName") for d in docs_list if not d.get("state") or d.get("state") in ["N/A", "Unknown", None]]

    if missing_fy_docs:
        alerts.append({
            "id": f"ALT-META-{len(alerts)+1:03d}",
            "title": f"Missing Financial Year in {len(missing_fy_docs)} Document(s)",
            "description": f"{len(missing_fy_docs)} records do not contain a recognized financial year string, preventing accurate fiscal year consolidation.",
            "severity": "Orange",
            "source": "storage/structured_data/",
            "recommendation": "Re-extract or manually assign the statutory financial year tag to ensure accurate chronological rollups.",
            "timestamp": now_iso,
            "affectedEntities": missing_fy_docs[:5]
        })

    if missing_state_docs:
        alerts.append({
            "id": f"ALT-META-{len(alerts)+1:03d}",
            "title": f"Missing State / Jurisdiction in {len(missing_state_docs)} Record(s)",
            "description": f"{len(missing_state_docs)} files lack explicit state attribution, affecting state-level royalty and production breakdowns.",
            "severity": "Yellow",
            "source": "storage/structured_data/",
            "recommendation": "Update colliery gazetteer mappings so mine names automatically resolve to their host states.",
            "timestamp": now_iso,
            "affectedEntities": missing_state_docs[:5]
        })

    # Alert 4: Low Quality / Degraded OCR
    q_score = quality.get("overallQualityScore", 85.0)
    if q_score < 75.0:
        alerts.append({
            "id": f"ALT-QUAL-{len(alerts)+1:03d}",
            "title": "Sub-Optimal Document Quality Index",
            "description": f"Overall data quality score is {q_score}/100, which falls below the recommended 75-point institutional threshold.",
            "severity": "Orange",
            "source": "storage/analytics/dashboard.json (quality)",
            "recommendation": "Ensure uploaded scanned returns meet 300 DPI resolution standards and apply image preprocessing before re-ingestion.",
            "timestamp": now_iso,
            "affectedEntities": ["Document Ingestion Pipeline"]
        })

    # Alert 5: Processing / Ingestion Failures
    failed_docs = docs.get("documentsFailed", docs.get("totalFailed", 0))
    if failed_docs > 0:
        alerts.append({
            "id": f"ALT-PROC-{len(alerts)+1:03d}",
            "title": f"{failed_docs} Unrecoverable Processing Failure(s)",
            "description": f"{failed_docs} document(s) experienced fatal parsing, corrupted PDF, or unsupported layout errors during pipeline ingestion.",
            "severity": "Red",
            "source": "storage/logs/",
            "recommendation": "Review ingestion error logs in Document Hub and upload clean uncorrupted file variants.",
            "timestamp": now_iso,
            "affectedEntities": [f"{failed_docs} Failed Files"]
        })

    # Alert 6: Missing Statutory Reports
    rep_count = len(reports_history or [])
    if rep_count == 0:
        alerts.append({
            "id": f"ALT-REP-{len(alerts)+1:03d}",
            "title": "No Certified Statutory Reports Generated",
            "description": "The system currently contains zero generated statutory reports (Executive, Production, or Geological reports) for official dissemination.",
            "severity": "Yellow",
            "source": "storage/reports/report-history.json",
            "recommendation": "Generate the standard Monthly Production Report and Executive Summary using the Phase 8 Report Generator module.",
            "timestamp": now_iso,
            "affectedEntities": ["Report Generator"]
        })

    # Alert 7: Extreme Subsidiary Concentration
    top_subs = rankings.get("topSubsidiaries", subsidiaries)
    if top_subs and len(top_subs) > 0 and top_subs[0].get("contributionPct", 0) > 85.0:
        leader_name = top_subs[0].get("subsidiary", "Unknown")
        share = top_subs[0].get("contributionPct", 0)
        alerts.append({
            "id": f"ALT-CONC-{len(alerts)+1:03d}",
            "title": f"High Output Concentration in {leader_name}",
            "description": f"{leader_name} accounts for {share:.1f}% of national reported coal output. Other active subsidiaries show minimal or missing returns in current database.",
            "severity": "Yellow",
            "source": "storage/analytics/dashboard.json (rankings)",
            "recommendation": "Verify whether monthly returns from other CIL subsidiaries (MCL, NCL, CCL, WCL, ECL) are awaiting ingestion.",
            "timestamp": now_iso,
            "affectedEntities": [leader_name]
        })

    # Fallback alert if all clean
    if not alerts:
        alerts.append({
            "id": "ALT-INFO-001",
            "title": "All Statutory Parameters Normal",
            "description": "Zero critical exceptions detected. Production benchmarks, statutory validation rules, and data completeness are operating within normal parameters.",
            "severity": "Yellow",
            "source": "storage/analytics/dashboard.json",
            "recommendation": "Continue regular monitoring and upload upcoming monthly returns on schedule.",
            "timestamp": now_iso,
            "affectedEntities": ["All Active Subsidiaries"]
        })

    return alerts
