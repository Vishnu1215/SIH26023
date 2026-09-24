"""
Phase 12 - Module 2: Risk Assessment Engine.

Calculates a deterministic Operational Risk Score (0–100) based strictly on:
- Production target achievement & concentration risk
- Statutory validation accuracy & rule violation rates
- Repository data quality & field completeness
- Processing & OCR failure rates

100% Deterministic, explainable, and reproducible without external ML/AI.
"""

from typing import Dict, Any, List

def calculate_operational_risk(
    dashboard: Dict[str, Any],
    validation_records: List[Dict[str, Any]] = None,
    indexed_docs: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes weighted deterministic operational risk score and breakdown.
    """
    prod = dashboard.get("production", {})
    val = dashboard.get("validation", {})
    quality = dashboard.get("quality", {})
    docs = dashboard.get("documents", {})
    rankings = dashboard.get("rankings", {})
    subsidiaries = dashboard.get("subsidiaries", [])

    total_docs = docs.get("totalDocuments", len(indexed_docs or [])) or 1

    # 1. Production Risk (0 - 100)
    achieve_pct = prod.get("productionAchievementPct", prod.get("productionAchievement", 100.0))
    if achieve_pct < 50.0:
        base_prod_risk = 85.0
    elif achieve_pct < 75.0:
        base_prod_risk = 60.0 + (75.0 - achieve_pct)
    elif achieve_pct < 90.0:
        base_prod_risk = 35.0 + (90.0 - achieve_pct) * 1.5
    elif achieve_pct < 100.0:
        base_prod_risk = 10.0 + (100.0 - achieve_pct) * 2.0
    else:
        base_prod_risk = 5.0 # Minimal target risk

    # Production concentration / dependency factor
    top_subs = rankings.get("topSubsidiaries", subsidiaries)
    if top_subs and len(top_subs) > 0 and top_subs[0].get("contributionPct", 0) > 80.0:
        # High dependency on a single subsidiary
        concentration_risk = 20.0
    else:
        concentration_risk = 0.0

    production_risk = min(100.0, base_prod_risk + concentration_risk)

    # 2. Validation Risk (0 - 100)
    val_accuracy = val.get("validationAccuracy", 100.0)
    invalid_docs = val.get("invalidDocuments", 0)
    invalid_ratio = (invalid_docs / total_docs) * 100.0

    # Risk is deficit from 100% accuracy plus invalid file proportion
    accuracy_deficit = max(0.0, 100.0 - val_accuracy)
    validation_risk = min(100.0, (accuracy_deficit * 0.7) + (invalid_ratio * 0.3))

    # 3. Data Quality Risk (0 - 100)
    overall_quality = quality.get("overallQualityScore", 85.0)
    quality_risk = max(0.0, min(100.0, 100.0 - overall_quality))

    # 4. Completeness Risk (0 - 100)
    # Check for missing critical attributes in indexed documents
    missing_fy = 0
    missing_state = 0
    missing_mine = 0
    docs_list = indexed_docs or []
    for d in docs_list:
        if not d.get("financialYear") or d.get("financialYear") in ["N/A", "Unknown", None]:
            missing_fy += 1
        if not d.get("state") or d.get("state") in ["N/A", "Unknown", None]:
            missing_state += 1
        if not d.get("mineName") or d.get("mineName") in ["N/A", "Unknown", None]:
            missing_mine += 1

    doc_count = max(1, len(docs_list))
    missing_field_pct = ((missing_fy + missing_state + missing_mine) / (doc_count * 3)) * 100.0
    completeness_risk = min(100.0, missing_field_pct * 1.5)

    # 5. Processing Failure Risk (0 - 100)
    failed_docs = docs.get("documentsFailed", docs.get("totalFailed", 0))
    uploaded_docs = docs.get("documentsUploaded", total_docs) or 1
    processing_risk = min(100.0, (failed_docs / uploaded_docs) * 100.0)

    # Weighted Overall Risk Calculation
    # Weights: Production (30%), Validation (25%), Quality (20%), Completeness (15%), Processing (10%)
    overall_risk = (
        (production_risk * 0.30) +
        (validation_risk * 0.25) +
        (quality_risk * 0.20) +
        (completeness_risk * 0.15) +
        (processing_risk * 0.10)
    )
    overall_risk = round(overall_risk, 1)

    # Risk Level Categorization
    if overall_risk >= 60.0:
        risk_level = "High"
    elif overall_risk >= 30.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # Identify Explicit Contributing Risk Factors
    risk_factors: List[Dict[str, Any]] = []

    if achieve_pct < 90.0:
        risk_factors.append({
            "factor": "Production Shortfall",
            "impact": "High" if achieve_pct < 75.0 else "Medium",
            "score": round(production_risk, 1),
            "description": f"National coal production is at {achieve_pct:.1f}% of statutory target, falling below the 90% benchmark."
        })
    elif concentration_risk > 0:
        leader_name = top_subs[0].get("subsidiary", "Unknown")
        share = top_subs[0].get("contributionPct", 0)
        risk_factors.append({
            "factor": "Subsidiary Output Concentration",
            "impact": "Medium",
            "score": round(production_risk, 1),
            "description": f"{leader_name} accounts for {share:.1f}% of total reported coal output, indicating high operational concentration."
        })

    if val_accuracy < 85.0 or invalid_docs > 0:
        risk_factors.append({
            "factor": "Statutory Validation Discrepancies",
            "impact": "High" if val_accuracy < 75.0 else "Medium",
            "score": round(validation_risk, 1),
            "description": f"{invalid_docs} document(s) flagged with validation rule issues; overall validation accuracy is {val_accuracy:.1f}%."
        })

    if quality_risk > 20.0:
        risk_factors.append({
            "factor": "Document OCR & Extraction Quality",
            "impact": "Medium",
            "score": round(quality_risk, 1),
            "description": f"Data quality score is {overall_quality:.1f}/100 with potential degradation in scanned document clarity."
        })

    if completeness_risk > 25.0:
        risk_factors.append({
            "factor": "Statutory Field Omissions",
            "impact": "Medium",
            "score": round(completeness_risk, 1),
            "description": f"Multiple reporting records lack complete Financial Year, Colliery Name, or State attributes."
        })

    if processing_risk > 5.0:
        risk_factors.append({
            "factor": "Ingestion Failures",
            "impact": "High",
            "score": round(processing_risk, 1),
            "description": f"{failed_docs} document(s) encountered unrecoverable parser/OCR exceptions."
        })

    if not risk_factors:
        risk_factors.append({
            "factor": "Optimal Operational Baseline",
            "impact": "Low",
            "score": overall_risk,
            "description": "All core operational parameters (production achievement, statutory validation, and data quality) meet Ministry benchmarks."
        })

    return {
        "overallRisk": overall_risk,
        "riskLevel": risk_level,
        "riskBreakdown": {
            "productionRisk": round(production_risk, 1),
            "validationRisk": round(validation_risk, 1),
            "qualityRisk": round(quality_risk, 1),
            "completenessRisk": round(completeness_risk, 1),
            "processingRisk": round(processing_risk, 1)
        },
        "riskFactors": risk_factors
    }
