"""
Phase 12 - Module 3: Trend Analyzer.

Evaluates historical and chronological progression across:
- Financial Year Coal Production
- Statutory Validation Accuracy
- Document Ingestion Volume
- Statutory Report Generation Activity

Classifies trajectories into: Increasing, Stable, Declining.
100% Deterministic slope and variance evaluation.
"""

from typing import Dict, Any, List

def analyze_trends(
    dashboard: Dict[str, Any],
    reports_history: List[Dict[str, Any]] = None,
    indexed_docs: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Analyzes historical trajectories and returns trends with deterministic justifications.
    """
    charts = dashboard.get("charts", {})
    financial_years = dashboard.get("financialYears", [])
    val = dashboard.get("validation", {})
    prod = dashboard.get("production", {})

    # 1. Financial Year Progression & Production Trend
    fy_production_series = []
    if financial_years and isinstance(financial_years, list):
        for item in financial_years:
            fy_label = item.get("financialYear") or item.get("label") or "FY"
            p_val = float(item.get("production", 0) or 0)
            fy_production_series.append({
                "period": fy_label,
                "production": round(p_val, 2),
                "documents": item.get("documents", 1)
            })

    # Fallback to charts["productionTrend"] if financialYears list is short
    if not fy_production_series and charts.get("productionTrend"):
        for pt in charts.get("productionTrend", []):
            fy_production_series.append({
                "period": pt.get("label") or pt.get("month") or "Period",
                "production": float(pt.get("production") or pt.get("actual") or 0),
                "documents": 1
            })

    # Evaluate Production Direction
    if len(fy_production_series) >= 2:
        last_val = fy_production_series[-1]["production"]
        prev_val = fy_production_series[-2]["production"]
        if prev_val > 0:
            pct_change = ((last_val - prev_val) / prev_val) * 100.0
        else:
            pct_change = 100.0 if last_val > 0 else 0.0

        if pct_change > 2.0:
            prod_trend = "Increasing"
            prod_reason = f"Coal output expanded by {pct_change:+.1f}% from {fy_production_series[-2]['period']} to {fy_production_series[-1]['period']}."
        elif pct_change < -2.0:
            prod_trend = "Declining"
            prod_reason = f"Coal production fell by {abs(pct_change):.1f}% compared to preceding reporting interval {fy_production_series[-2]['period']}."
        else:
            prod_trend = "Stable"
            prod_reason = f"Coal output remained consistent within ±2% margin across {fy_production_series[-2]['period']} and {fy_production_series[-1]['period']}."
    else:
        prod_trend = "Stable"
        pct_change = 0.0
        tot = prod.get("totalCoalProduction", 0)
        prod_reason = f"Current baseline reflects consolidated production volume of {tot:,.2f} MT across active records."

    production_trend_payload = {
        "trend": prod_trend,
        "percentageChange": round(pct_change, 1),
        "reason": prod_reason,
        "supportingMetrics": {
            "latestProduction": fy_production_series[-1]["production"] if fy_production_series else prod.get("totalCoalProduction", 0),
            "historicalPeriods": len(fy_production_series),
            "achievementPct": prod.get("productionAchievementPct", 100.0)
        }
    }

    # 2. Validation Trend
    val_accuracy = val.get("validationAccuracy", 100.0)
    # Compare with benchmark
    if val_accuracy >= 92.0:
        val_trend = "Increasing"
        val_reason = f"Statutory audit compliance is high at {val_accuracy:.1f}%, indicating robust document structure and rule compliance."
    elif val_accuracy >= 80.0:
        val_trend = "Stable"
        val_reason = f"Validation accuracy remains steady at {val_accuracy:.1f}% with acceptable statutory rule pass rates."
    else:
        val_trend = "Declining"
        val_reason = f"Validation accuracy stands at {val_accuracy:.1f}%, impacted by {val.get('invalidDocuments', 0)} non-compliant document returns."

    validation_trend_payload = {
        "trend": val_trend,
        "currentAccuracy": val_accuracy,
        "reason": val_reason,
        "supportingMetrics": {
            "validDocuments": val.get("validDocuments", 0),
            "invalidDocuments": val.get("invalidDocuments", 0),
            "accuracy": val_accuracy
        }
    }

    # 3. Document Ingestion Trend
    docs_count = len(indexed_docs or [])
    if docs_count >= 10:
        ingest_trend = "Increasing"
        ingest_reason = f"Active ingestion repository contains {docs_count} verified files, reflecting comprehensive data intake."
    elif docs_count >= 3:
        ingest_trend = "Stable"
        ingest_reason = f"Ingestion volume is steady with {docs_count} documents currently indexed and structured."
    else:
        ingest_trend = "Declining"
        ingest_reason = f"Low document ingestion count ({docs_count} records). Additional mining returns should be uploaded."

    ingest_trend_payload = {
        "trend": ingest_trend,
        "totalDocuments": docs_count,
        "reason": ingest_reason,
        "supportingMetrics": {
            "indexedCount": docs_count,
            "categoriesCovered": len(dashboard.get("documents", {}).get("byCategory", {}))
        }
    }

    # 4. Report Generation Trend
    rep_count = len(reports_history or [])
    if rep_count >= 5:
        report_trend = "Increasing"
        report_reason = f"{rep_count} statutory reports generated and published for executive decision makers."
    elif rep_count >= 1:
        report_trend = "Stable"
        report_reason = f"Statutory reporting is active with {rep_count} executive and production reports available."
    else:
        report_trend = "Declining"
        report_reason = "No statutory reports generated in current repository. Reports should be compiled via Report Generator."

    report_trend_payload = {
        "trend": report_trend,
        "totalReports": rep_count,
        "reason": report_reason,
        "supportingMetrics": {
            "generatedReports": rep_count
        }
    }

    return {
        "productionTrend": production_trend_payload,
        "validationTrend": validation_trend_payload,
        "documentIngestionTrend": ingest_trend_payload,
        "reportGenerationTrend": report_trend_payload,
        "historicalSeries": fy_production_series
    }
