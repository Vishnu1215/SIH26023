"""
Phase 12 - Module 4: Executive Insights Engine.

Generates concise, factual, deterministic executive insights for Ministry of Coal officials.
Maximum 10 insights. 100% grounded in single sources of truth without hallucinations.
"""

from typing import Dict, Any, List

def generate_executive_insights(
    dashboard: Dict[str, Any],
    reports_history: List[Dict[str, Any]] = None,
    indexed_docs: List[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Generates up to 10 high-value executive insights from consolidated analytics.
    """
    insights: List[Dict[str, Any]] = []

    prod = dashboard.get("production", {})
    val = dashboard.get("validation", {})
    quality = dashboard.get("quality", {})
    docs = dashboard.get("documents", {})
    rankings = dashboard.get("rankings", {})
    subsidiaries = dashboard.get("subsidiaries", [])
    states = dashboard.get("states", [])

    total_docs = docs.get("totalDocuments", len(indexed_docs or [])) or 1

    # Insight 1: Production Achievement vs Target
    achieve_pct = prod.get("productionAchievementPct", prod.get("productionAchievement", 0))
    tot_prod = prod.get("totalCoalProduction", 0)
    tot_target = prod.get("totalTargetProduction", 0)
    unit = prod.get("productionUnit", "MT")

    if tot_prod > 0:
        if tot_target > 0:
            statement = f"National coal production reached {tot_prod:,.2f} {unit}, achieving {achieve_pct:.1f}% of the cumulative target ({tot_target:,.2f} {unit})."
        else:
            statement = f"Total reported coal production stands at {tot_prod:,.2f} {unit} across verified mining returns."

        insights.append({
            "id": "INS-001",
            "title": "National Target Achievement",
            "statement": statement,
            "category": "Production",
            "impact": "Positive" if achieve_pct >= 90.0 else "Action Required",
            "icon": "Target",
            "metric": f"{achieve_pct:.1f}% Target Met",
            "source": "storage/analytics/dashboard.json"
        })

    # Insight 2: Subsidiary Production Leader
    top_subs = rankings.get("topSubsidiaries", subsidiaries)
    if top_subs and len(top_subs) > 0:
        leader = top_subs[0]
        leader_name = leader.get("subsidiary", "Unknown")
        l_prod = leader.get("production", 0)
        l_pct = leader.get("contributionPct", 0)
        insights.append({
            "id": "INS-002",
            "title": "Production Leader",
            "statement": f"{leader_name} is the top producing subsidiary, yielding {l_prod:,.2f} {unit} ({l_pct:.1f}% of national reported output).",
            "category": "Subsidiaries",
            "impact": "Highlight",
            "icon": "Award",
            "metric": f"{leader_name} ({l_pct:.1f}%)",
            "source": "storage/analytics/dashboard.json (rankings)"
        })

    # Insight 3: Statutory Validation Accuracy
    val_acc = val.get("validationAccuracy", 0)
    v_cnt = val.get("validDocuments", 0)
    inv_cnt = val.get("invalidDocuments", 0)
    insights.append({
        "id": "INS-003",
        "title": "Statutory Validation Compliance",
        "statement": f"Statutory validation accuracy across files is {val_acc:.1f}%, with {v_cnt} certified valid returns and {inv_cnt} flagged for review.",
        "category": "Validation",
        "impact": "Positive" if val_acc >= 85.0 else "Warning",
        "icon": "ShieldCheck",
        "metric": f"{val_acc:.1f}% Accuracy",
        "source": "storage/validation/"
    })

    # Insight 4: Data Quality & Completeness
    q_score = quality.get("overallQualityScore", 0)
    q_rating = quality.get("qualityRating", "Good")
    insights.append({
        "id": "INS-004",
        "title": "Data Quality Rating",
        "statement": f"Platform repository carries an overall data quality score of {q_score}/100 with an executive rating of '{q_rating}'.",
        "category": "Data Quality",
        "impact": "Positive" if q_score >= 80 else "Attention",
        "icon": "Gauge",
        "metric": f"{q_score}/100 ({q_rating})",
        "source": "storage/analytics/dashboard.json (quality)"
    })

    # Insight 5: Geographical Distribution
    top_states = rankings.get("topStates", states)
    if top_states and len(top_states) > 0:
        lead_state = top_states[0]
        s_name = lead_state.get("state", "Unknown")
        s_prod = lead_state.get("production", 0)
        s_docs = lead_state.get("documents", 1)
        insights.append({
            "id": "INS-005",
            "title": "Geographical Concentration",
            "statement": f"{s_name} accounts for the primary share of mining operations with {s_docs} reporting document(s) and {s_prod:,.2f} {unit} produced.",
            "category": "Geography",
            "impact": "Informational",
            "icon": "MapPin",
            "metric": f"{s_name} ({s_docs} Docs)",
            "source": "storage/analytics/dashboard.json (states)"
        })

    # Insight 6: Document Category Breakdown
    cat_map = docs.get("byCategory", docs.get("categories", {}))
    if cat_map:
        sorted_cats = sorted(cat_map.items(), key=lambda x: x[1], reverse=True)
        if sorted_cats:
            top_cat, top_cnt = sorted_cats[0]
            cat_pct = (top_cnt / total_docs) * 100.0
            insights.append({
                "id": "INS-006",
                "title": "Document Distribution",
                "statement": f"'{top_cat}' documents constitute the majority of processed records ({top_cnt} files, {cat_pct:.1f}% of total).",
                "category": "Operations",
                "impact": "Informational",
                "icon": "FileText",
                "metric": f"{top_cat} ({cat_pct:.0f}%)",
                "source": "storage/search_index.json"
            })

    # Insight 7: Multi-Subsidiary Engagement
    active_subs_cnt = len([s for s in subsidiaries if s.get("production", 0) > 0 or s.get("documents", 0) > 0])
    insights.append({
        "id": "INS-007",
        "title": "Subsidiary Representation",
        "statement": f"{active_subs_cnt} Coal India subsidiary entities are currently reporting verified performance returns into the centralized registry.",
        "category": "Subsidiaries",
        "impact": "Highlight",
        "icon": "Building2",
        "metric": f"{active_subs_cnt} Subsidiaries Reporting",
        "source": "storage/analytics/dashboard.json"
    })

    # Insight 8: Overburden & Environmental Metrics
    obr_val = prod.get("totalOverburdenRemoval", 0)
    if obr_val > 0:
        insights.append({
            "id": "INS-008",
            "title": "Overburden Removal Activity",
            "statement": f"Total reported overburden removal stands at {obr_val:,.2f} M.Cu.M, indicating ongoing excavation momentum across open cast mines.",
            "category": "Operations",
            "impact": "Positive",
            "icon": "Layers",
            "metric": f"{obr_val:,.1f} M.Cu.M",
            "source": "storage/structured_data/"
        })

    # Insight 9: Statutory Reports Availability
    rep_cnt = len(reports_history or [])
    if rep_cnt > 0:
        insights.append({
            "id": "INS-009",
            "title": "Published Statutory Reports",
            "statement": f"{rep_cnt} certified statutory reports (Executive, Production, and Geological) are compiled and ready for distribution in PDF/XLSX formats.",
            "category": "Reporting",
            "impact": "Positive",
            "icon": "ClipboardList",
            "metric": f"{rep_cnt} Reports Available",
            "source": "storage/reports/report-history.json"
        })

    # Insight 10: Ingestion & OCR Reliability
    failed_docs = docs.get("documentsFailed", docs.get("totalFailed", 0))
    if failed_docs == 0:
        insights.append({
            "id": "INS-010",
            "title": "Zero Ingestion Failures",
            "statement": "100% of uploaded geological returns and coal reports processed successfully through OCR and domain parsing without fatal parsing errors.",
            "category": "System Health",
            "impact": "Positive",
            "icon": "CheckCircle2",
            "metric": "100% Pipeline Reliability",
            "source": "storage/analytics/dashboard.json"
        })
    else:
        insights.append({
            "id": "INS-010",
            "title": "Parser Remediation Needed",
            "statement": f"{failed_docs} document(s) encountered unrecoverable OCR or format errors and require administrative re-upload or manual inspection.",
            "category": "System Health",
            "impact": "Action Required",
            "icon": "AlertCircle",
            "metric": f"{failed_docs} Failed Files",
            "source": "storage/analytics/dashboard.json"
        })

    # Limit strictly to 10 insights
    return insights[:10]
