"""
Data compilation engine for Phase 8 Report Generator.
Reads strictly from storage/analytics/dashboard.json as the Single Source of Truth,
supplemented by structured_data and validation records for mine-level tables.
Zero AI/LLM intervention. 100% deterministic compilation.
"""

import os
import json
import glob
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.services.report_utils import BRANDING, VALIDATION_RULES, format_number, format_pct, format_datetime

AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DASHBOARD_FILE = os.path.join(AI_SERVICE_DIR, "storage", "analytics", "dashboard.json")
STRUCTURED_DIR = os.path.join(AI_SERVICE_DIR, "storage", "structured_data")
VALIDATION_DIR = os.path.join(AI_SERVICE_DIR, "storage", "validation")


def load_analytics_dashboard() -> Dict[str, Any]:
    """Load dashboard.json as the single deterministic source of truth for analytics."""
    if os.path.exists(DASHBOARD_FILE):
        try:
            with open(DASHBOARD_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            print(f"[report_templates] Error loading dashboard.json: {e}")
            
    # Fallback zeroed structure if dashboard.json hasn't been generated yet
    return {
        "status": "success",
        "analyticsVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "documentsProcessed": 0,
        "totalDocuments": 0,
        "documents": {
            "totalDocuments": 0, "documentsProcessed": 0, "ocrComplete": 0,
            "structuredRecords": 0, "validatedDocuments": 0, "pendingDocuments": 0,
            "averageOcrTime": 0.0, "averageValidationTime": 0.0, "averageExtractionTime": 0.0,
            "byCategory": {}, "byFileType": {}
        },
        "production": {
            "totalCoalProduction": 0.0, "totalTargetProduction": 0.0,
            "totalAchievedProduction": 0.0, "targetVariance": 0.0,
            "productionAchievement": 0.0, "averageProduction": 0.0,
            "highestProduction": 0.0, "lowestProduction": 0.0,
            "productionUnit": "MT", "productionTrend": []
        },
        "validation": {
            "totalValidated": 0, "validDocuments": 0, "warningDocuments": 0,
            "errorDocuments": 0, "averageValidationScore": 0.0,
            "overallQualityRating": "N/A", "validationAccuracy": 0.0,
            "totalErrors": 0, "totalWarnings": 0
        },
        "quality": {
            "fieldCompletenessPercentage": 0.0, "missingFieldsPercentage": 0.0,
            "missingMandatoryFields": 0, "duplicateDocuments": 0,
            "lowOcrConfidence": 0, "manualReviewRequired": 0
        },
        "subsidiaries": [],
        "states": [],
        "financialYears": [],
        "rankings": {"topSubsidiaries": [], "topStates": [], "topMines": []},
        "charts": {"productionTrend": [], "subsidiaryDistribution": [], "validationScoreDistribution": []}
    }


def load_all_records() -> List[Dict[str, Any]]:
    """Load joined structured data records with their validation results."""
    records = []
    if not os.path.exists(STRUCTURED_DIR):
        return records

    structured_files = glob.glob(os.path.join(STRUCTURED_DIR, "*.json"))
    for s_file in structured_files:
        try:
            with open(s_file, "r", encoding="utf-8") as f:
                s_data = json.load(f)
                doc_id = s_data.get("documentId")
                if not doc_id:
                    continue
                
                # Check matching validation record
                v_data = {}
                v_file = os.path.join(VALIDATION_DIR, f"{doc_id}.json")
                if os.path.exists(v_file):
                    try:
                        with open(v_file, "r", encoding="utf-8") as vf:
                            v_data = json.load(vf)
                    except Exception:
                        pass
                
                rec = {
                    "documentId": doc_id,
                    "reportTitle": s_data.get("reportTitle") or "Untitled Document",
                    "reportType": s_data.get("reportType") or "Unknown",
                    "financialYear": s_data.get("financialYear") or "N/A",
                    "issuingOrganization": s_data.get("issuingOrganization") or "CMPDI",
                    "subsidiary": s_data.get("subsidiary") or "CIL",
                    "mineName": s_data.get("mineName") or "N/A",
                    "mineType": s_data.get("mineType") or "N/A",
                    "region": s_data.get("region") or "N/A",
                    "district": s_data.get("district") or "N/A",
                    "state": s_data.get("state") or "N/A",
                    "coalProduction": float(s_data.get("coalProduction") or 0.0),
                    "targetProduction": float(s_data.get("targetProduction") or 0.0),
                    "achievedProduction": float(s_data.get("achievedProduction") or 0.0),
                    "overburdenRemoval": s_data.get("overburdenRemoval"),
                    "percentageAchievement": float(s_data.get("percentageAchievement") or 0.0),
                    "productionUnit": s_data.get("productionUnit") or "MT",
                    "extractedFieldsCount": s_data.get("extractedFieldsCount") or 0,
                    "extractedAt": s_data.get("extractedAt"),
                    # Validation join
                    "validationStatus": v_data.get("validationStatus") or "Unvalidated",
                    "validationScore": v_data.get("validationScore") or 0,
                    "errorCount": v_data.get("errorCount") or 0,
                    "warningCount": v_data.get("warningCount") or 0,
                    "rulesTriggered": v_data.get("rulesTriggered") or [],
                    "messages": v_data.get("messages") or v_data.get("validationMessages") or [],
                    "validatedAt": v_data.get("validatedAt")
                }
                records.append(rec)
        except Exception as e:
            print(f"[report_templates] Error loading record {s_file}: {e}")
            
    return records


def apply_record_filters(records: List[Dict[str, Any]], filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Apply deterministic multi-attribute filters to document records."""
    if not filters:
        return records

    filtered = []
    fy_filter = (filters.get("financialYear") or "").strip().lower()
    sub_filter = (filters.get("subsidiary") or "").strip().lower()
    mine_filter = (filters.get("mine") or "").strip().lower()
    state_filter = (filters.get("state") or "").strip().lower()
    status_filter = (filters.get("validationStatus") or "").strip().lower()
    cat_filter = (filters.get("documentCategory") or filters.get("reportType") or "").strip().lower()

    for r in records:
        if fy_filter and fy_filter != "all" and fy_filter not in r.get("financialYear", "").lower():
            continue
        if sub_filter and sub_filter != "all" and sub_filter != r.get("subsidiary", "").lower():
            continue
        if mine_filter and mine_filter != "all" and mine_filter not in r.get("mineName", "").lower():
            continue
        if state_filter and state_filter != "all" and state_filter != r.get("state", "").lower():
            continue
        if status_filter and status_filter != "all" and status_filter != r.get("validationStatus", "").lower():
            continue
        if cat_filter and cat_filter != "all" and cat_filter not in r.get("reportType", "").lower():
            continue
        filtered.append(r)

    return filtered


def compute_rule_violation_counts(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Tally VAL001-VAL010 occurrences across validated records."""
    counts = {rule_id: 0 for rule_id in VALIDATION_RULES}
    for r in records:
        for rt in r.get("rulesTriggered", []):
            rule_key = rt if isinstance(rt, str) else rt.get("ruleId")
            if rule_key in counts:
                counts[rule_key] += 1
        for msg in r.get("messages", []):
            rule_key = msg.get("rule") or msg.get("ruleId")
            if rule_key in counts:
                counts[rule_key] += 1

    rule_summary = []
    for rule_id, rule_info in VALIDATION_RULES.items():
        rule_summary.append({
            "ruleId": rule_id,
            "name": rule_info["name"],
            "severity": rule_info["severity"],
            "description": rule_info["description"],
            "occurrences": counts[rule_id]
        })
    return rule_summary


def build_report_context(report_type: str, filters: Optional[Dict[str, Any]] = None, custom_sections: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Main entry point for generating the report payload.
    Takes report_type and optional filters, returns a fully structured payload.
    """
    dashboard = load_analytics_dashboard()
    all_records = load_all_records()
    filtered_records = apply_record_filters(all_records, filters)
    rule_violations = compute_rule_violation_counts(filtered_records)

    generated_at = datetime.now(timezone.utc).isoformat()

    context = {
        "reportType": report_type,
        "branding": BRANDING,
        "generatedAt": generated_at,
        "formattedDate": format_datetime(generated_at),
        "sourceAnalyticsVersion": dashboard.get("analyticsVersion", 1),
        "filters": filters or {},
        "dashboard": dashboard,
        "records": filtered_records,
        "totalRecordsCount": len(filtered_records),
        "ruleViolations": rule_violations,
        "customSections": custom_sections or []
    }

    # Extract distinct mines for mine performance table
    mines_map = {}
    for r in filtered_records:
        m_name = r.get("mineName")
        if m_name and m_name != "N/A":
            if m_name not in mines_map:
                mines_map[m_name] = {
                    "mineName": m_name,
                    "subsidiary": r.get("subsidiary", "CIL"),
                    "district": r.get("district", "N/A"),
                    "state": r.get("state", "N/A"),
                    "mineType": r.get("mineType", "Opencast"),
                    "coalProduction": 0.0,
                    "targetProduction": 0.0,
                    "achievedProduction": 0.0,
                    "documentsCount": 0,
                    "validationStatus": r.get("validationStatus", "Valid")
                }
            mines_map[m_name]["coalProduction"] += r.get("coalProduction", 0.0)
            mines_map[m_name]["targetProduction"] += r.get("targetProduction", 0.0)
            mines_map[m_name]["achievedProduction"] += r.get("achievedProduction", 0.0)
            mines_map[m_name]["documentsCount"] += 1
            if r.get("validationStatus") == "Error":
                mines_map[m_name]["validationStatus"] = "Error"
            elif r.get("validationStatus") == "Warning" and mines_map[m_name]["validationStatus"] != "Error":
                mines_map[m_name]["validationStatus"] = "Warning"

    context["minesList"] = sorted(list(mines_map.values()), key=lambda m: m["coalProduction"], reverse=True)

    return context
