"""
Phase 12 - Module 1: Recommendation Engine.

Generates prioritized, actionable, deterministic executive recommendations
for Ministry of Coal and CMPDI officials.

100% Rule-based evaluation without LLMs or external AI.
Consumes Single Sources of Truth:
- storage/analytics/dashboard.json
- storage/validation/
- storage/search_index.json
- storage/reports/
"""

from datetime import datetime, timezone
from typing import Dict, Any, List

def generate_recommendations(
    dashboard: Dict[str, Any],
    reports_history: List[Dict[str, Any]] = None,
    indexed_docs: List[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Evaluates analytics, statutory validation, and operational data against Ministry rules
    and generates prioritized, evidence-backed recommendations.
    """
    recommendations: List[Dict[str, Any]] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    prod = dashboard.get("production", {})
    val = dashboard.get("validation", {})
    quality = dashboard.get("quality", {})
    docs = dashboard.get("documents", {})
    rankings = dashboard.get("rankings", {})
    subsidiaries = dashboard.get("subsidiaries", [])

    docs_list = indexed_docs or []
    total_docs = max(1, len(docs_list))

    # =================================================================
    # Rule 1: Production Achievement Deficit
    # =================================================================
    achieve_pct = prod.get("productionAchievementPct", prod.get("productionAchievement", 100.0))
    tot_prod = prod.get("totalCoalProduction", 0)
    tot_target = prod.get("totalTargetProduction", 0)
    unit = prod.get("productionUnit", "MT")

    if tot_target > 0 and achieve_pct < 90.0:
        priority = "Critical" if achieve_pct < 75.0 else "High"
        deficit = tot_target - tot_prod
        lagging_subs = [s.get("subsidiary") for s in subsidiaries if s.get("production", 0) < s.get("target", 0)] or ["CIL Subsidiaries"]

        recommendations.append({
            "id": f"REC-PROD-{len(recommendations)+1:03d}",
            "title": "Review Production Planning & Investigate Underperforming Subsidiaries",
            "description": f"National coal output ({tot_prod:,.2f} {unit}) is trailing targeted benchmarks ({tot_target:,.2f} {unit}) with an achievement rate of {achieve_pct:.1f}%.",
            "category": "Production",
            "priority": priority,
            "severity": priority,
            "confidence": 0.98,
            "reason": f"Production achievement of {achieve_pct:.1f}% is below the mandatory 90% operational benchmark.",
            "supportingMetrics": {
                "totalCoalProduction": tot_prod,
                "totalTargetProduction": tot_target,
                "achievementPct": achieve_pct,
                "deficit": round(deficit, 2),
                "unit": unit
            },
            "recommendedAction": "1. Convene high-level performance review with mine planning committees. 2. Address heavy earth moving machinery (HEMM) availability bottlenecks. 3. Re-evaluate monthly extraction schedules for lagging collieries.",
            "affectedDocuments": [],
            "affectedSubsidiaries": lagging_subs[:4],
            "generatedAt": now_iso
        })

    # =================================================================
    # Rule 2: Statutory Validation Accuracy Below Benchmark
    # =================================================================
    val_accuracy = val.get("validationAccuracy", 100.0)
    invalid_docs = val.get("invalidDocuments", 0)

    if val_accuracy < 85.0 or invalid_docs > 0:
        priority = "Critical" if val_accuracy < 75.0 else "High"
        affected_doc_records = [d for d in docs_list if d.get("validationStatus") in ["Invalid", "Needs Review", "Failed"]]
        affected_doc_titles = [d.get("reportTitle") or d.get("fileName") for d in affected_doc_records]
        affected_subs = list(set([d.get("subsidiary") for d in affected_doc_records if d.get("subsidiary")]))

        recommendations.append({
            "id": f"REC-VAL-{len(recommendations)+1:03d}",
            "title": "Enforce Document Validation Before Statutory Report Compilation",
            "description": f"Overall statutory validation accuracy is {val_accuracy:.1f}%, with {invalid_docs} document(s) violating DGMS/CMPDI statutory rules (VR-001..VR-010).",
            "category": "Validation",
            "priority": priority,
            "severity": priority,
            "confidence": 0.99,
            "reason": f"Statutory validation accuracy of {val_accuracy:.1f}% is below the 85% compliance threshold.",
            "supportingMetrics": {
                "validationAccuracy": val_accuracy,
                "invalidDocumentsCount": invalid_docs,
                "validDocumentsCount": val.get("validDocuments", 0)
            },
            "recommendedAction": "1. Review non-compliant records in the Validation Inspector. 2. Verify colliery tonnage numbers and target arithmetic. 3. Re-validate documents after correcting optical or structural extraction flaws.",
            "affectedDocuments": affected_doc_titles[:5],
            "affectedSubsidiaries": affected_subs,
            "generatedAt": now_iso
        })

    # =================================================================
    # Rule 3: Statutory Field Completeness & Extraction Coverage
    # =================================================================
    missing_fy = [d.get("reportTitle") or d.get("fileName") for d in docs_list if not d.get("financialYear") or d.get("financialYear") in ["N/A", "Unknown", None]]
    missing_state = [d.get("reportTitle") or d.get("fileName") for d in docs_list if not d.get("state") or d.get("state") in ["N/A", "Unknown", None]]
    missing_mine = [d.get("reportTitle") or d.get("fileName") for d in docs_list if not d.get("mineName") or d.get("mineName") in ["N/A", "Unknown", None]]

    incomplete_count = len(set(missing_fy + missing_state + missing_mine))
    completeness_pct = round(((total_docs - incomplete_count) / total_docs) * 100.0, 1)

    if completeness_pct < 85.0 or incomplete_count > 0:
        recommendations.append({
            "id": f"REC-QUAL-{len(recommendations)+1:03d}",
            "title": "Review Extraction Rules for Missing Statutory Metadata Fields",
            "description": f"Field completeness score is {completeness_pct}%. {incomplete_count} document(s) lack required Financial Year, State, or Colliery tags.",
            "category": "Data Quality",
            "priority": "High" if completeness_pct < 70.0 else "Medium",
            "severity": "High" if completeness_pct < 70.0 else "Medium",
            "confidence": 0.96,
            "reason": f"Field completeness of {completeness_pct}% falls below the 85% data governance standard.",
            "supportingMetrics": {
                "completenessPercentage": completeness_pct,
                "missingFinancialYearCount": len(missing_fy),
                "missingStateCount": len(missing_state),
                "missingMineCount": len(missing_mine)
            },
            "recommendedAction": "1. Update domain regular expressions in entity_extractor.py to capture varied date & state header layouts. 2. Expand coal colliery gazetteer mappings for regional mine names. 3. Re-run structured extraction.",
            "affectedDocuments": (missing_fy + missing_state + missing_mine)[:5],
            "affectedSubsidiaries": [],
            "generatedAt": now_iso
        })

    # =================================================================
    # Rule 4: High Subsidiary Output Imbalance
    # =================================================================
    top_subs = rankings.get("topSubsidiaries", subsidiaries)
    if top_subs and len(top_subs) > 0 and top_subs[0].get("contributionPct", 0) > 80.0:
        leader = top_subs[0]
        l_name = leader.get("subsidiary", "Unknown")
        l_pct = leader.get("contributionPct", 0)

        recommendations.append({
            "id": f"REC-OPS-{len(recommendations)+1:03d}",
            "title": f"Diversify Reporting Intake to Mitigate Dependency on {l_name}",
            "description": f"{l_name} contributes {l_pct:.1f}% of all reported coal production in the repository. Several major coalfields (MCL, NCL, CCL) are underrepresented.",
            "category": "Operational",
            "priority": "Medium",
            "severity": "Medium",
            "confidence": 0.94,
            "reason": f"Output concentration of {l_pct:.1f}% in a single subsidiary represents potential data skew.",
            "supportingMetrics": {
                "dominantSubsidiary": l_name,
                "dominantSharePct": l_pct,
                "reportingSubsidiariesCount": len(subsidiaries)
            },
            "recommendedAction": "1. Ingest pending monthly production statements from eastern and central subsidiaries (MCL, CCL, WCL, ECL). 2. Verify that network folder watchers are polling subsidiary network drives.",
            "affectedDocuments": [],
            "affectedSubsidiaries": [l_name],
            "generatedAt": now_iso
        })

    # =================================================================
    # Rule 5: Statutory Reporting Cadence
    # =================================================================
    rep_count = len(reports_history or [])
    if rep_count == 0:
        recommendations.append({
            "id": f"REC-REP-{len(recommendations)+1:03d}",
            "title": "Generate Periodic Executive & Production Summary Reports",
            "description": "Zero official reports are currently compiled in the statutory registry. Decision makers lack distributable PDF/DOCX summaries.",
            "category": "Compliance",
            "priority": "High",
            "severity": "High",
            "confidence": 0.99,
            "reason": "Absence of compiled statutory report artifacts in storage/reports/.",
            "supportingMetrics": {
                "existingReportsCount": 0,
                "totalDocumentsAvailable": total_docs
            },
            "recommendedAction": "1. Navigate to Report Generator (Phase 8). 2. Generate the Monthly Production Report and Executive Summary for current FY. 3. Export PDF/DOCX for ministry distribution.",
            "affectedDocuments": [],
            "affectedSubsidiaries": [],
            "generatedAt": now_iso
        })
    elif rep_count < 3:
        recommendations.append({
            "id": f"REC-REP-{len(recommendations)+1:03d}",
            "title": "Compile Comprehensive Geological and Financial Year Reports",
            "description": f"Only {rep_count} statutory report(s) exist. Geological resource assessments and financial year summaries have not yet been produced.",
            "category": "Compliance",
            "priority": "Low",
            "severity": "Low",
            "confidence": 0.92,
            "reason": "Low report format diversity in official reports registry.",
            "supportingMetrics": {
                "existingReportsCount": rep_count
            },
            "recommendedAction": "1. Generate Geological Report and Financial Year Review via the Report Generator module.",
            "affectedDocuments": [],
            "affectedSubsidiaries": [],
            "generatedAt": now_iso
        })

    # =================================================================
    # Rule 6: Overburden Removal Synchronization
    # =================================================================
    obr_val = prod.get("totalOverburdenRemoval", 0)
    if tot_prod > 1000.0 and obr_val == 0:
        recommendations.append({
            "id": f"REC-OBR-{len(recommendations)+1:03d}",
            "title": "Audit Overburden Removal Reporting in Open Cast Mining Returns",
            "description": "Substantial coal production is recorded without corresponding Overburden Removal (OBR) metrics, risking non-compliance with DGMS mine safety guidelines.",
            "category": "Compliance",
            "priority": "Medium",
            "severity": "Medium",
            "confidence": 0.91,
            "reason": "Zero reported overburden removal volume alongside active open-cast extraction.",
            "supportingMetrics": {
                "totalCoalProduction": tot_prod,
                "overburdenRemoval": obr_val
            },
            "recommendedAction": "1. Verify whether colliery returns include Form-A OBR tables. 2. Ensure stripping ratio calculations are extracted and validated.",
            "affectedDocuments": [],
            "affectedSubsidiaries": [],
            "generatedAt": now_iso
        })

    # Fallback Baseline Recommendation
    if not recommendations:
        recommendations.append({
            "id": "REC-BASE-001",
            "title": "Maintain Regular Monitoring & Monthly Return Ingestion",
            "description": "All operational metrics, validation compliance scores, and reporting completeness meet standard Ministry of Coal benchmarks.",
            "category": "Operational",
            "priority": "Low",
            "severity": "Low",
            "confidence": 0.99,
            "reason": "All monitored KPIs operate within institutional safety margins.",
            "supportingMetrics": {
                "validationAccuracy": val_accuracy,
                "totalCoalProduction": tot_prod
            },
            "recommendedAction": "1. Continue scheduled ingestion of upcoming monthly colliery returns. 2. Monitor quarterly performance variances.",
            "affectedDocuments": [],
            "affectedSubsidiaries": [],
            "generatedAt": now_iso
        })

    # Sort deterministically by priority order: Critical -> High -> Medium -> Low
    priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    recommendations.sort(key=lambda r: priority_order.get(r.get("priority", "Low"), 4))

    return recommendations
