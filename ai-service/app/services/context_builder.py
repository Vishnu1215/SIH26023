"""
Phase 11 - Hybrid AI Question Answering: Context Builder.

Collects ONLY the minimum required factual context from Single Sources of Truth:
- storage/analytics/dashboard.json (Phase 7 consolidated analytics)
- storage/search_index.json (Phase 9 inverted index and document metadata)
- storage/structured_data/{id}.json (Phase 5 parsed JSON records)
- storage/validation/{id}.json (Phase 6 rule evaluations and audit messages)
- storage/document_intelligence/{id}.json (Phase 9 semantic topics, entities, summaries)
- storage/reports/report-history.json (Phase 8 generated statutory reports)

Never recomputes analytics or duplicates data.
Extracts compact, evidence-backed context slices for deterministic answer composition.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional

from app.services.analytics_storage import load_dashboard
from app.services.analytics_engine import generate_dashboard_summary
from app.services.search_index import load_search_index, search_documents, get_document_intelligence
from app.services.report_storage import get_report_history
from app.services.rag_adapter import rag_adapter

logger = logging.getLogger(__name__)

AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STRUCTURED_DATA_DIR = os.path.join(AI_SERVICE_DIR, "storage", "structured_data")
VALIDATION_DIR = os.path.join(AI_SERVICE_DIR, "storage", "validation")


def _get_active_dashboard() -> Dict[str, Any]:
    """Retrieve single source of truth analytics dashboard."""
    data = load_dashboard()
    if not data or not data.get("documents") or data.get("documents", {}).get("totalDocuments", 0) == 0:
        try:
            data = generate_dashboard_summary(save=True)
        except Exception as e:
            logger.warning(f"[context_builder] Could not generate dashboard: {e}")
            data = {}
    return data or {}


def build_qa_context(
    query_type: str,
    entities: Dict[str, Any],
    query_str: str,
    document_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Builds minimal isolated context slice corresponding to the user query and routing classification.
    """
    dashboard = _get_active_dashboard()
    index_data = load_search_index()
    docs_map = index_data.get("documents", {})
    all_reports = get_report_history()

    target_doc_id = document_id or entities.get("documentId")
    clean_q = query_str.lower()

    context: Dict[str, Any] = {
        "queryType": query_type,
        "entities": entities,
        "primarySource": "storage/analytics/dashboard.json",
        "analyticsSlice": {},
        "searchRecords": [],
        "documentRecord": None,
        "intelligenceRecord": None,
        "validationRecord": None,
        "reportRecords": [],
        "evidenceItems": []
    }

    # -----------------------------------------------------------------
    # Case 1: Specific Document Context
    # -----------------------------------------------------------------
    if target_doc_id and target_doc_id in docs_map:
        context["primarySource"] = f"storage/document_intelligence/{target_doc_id}.json"
        doc_meta = docs_map[target_doc_id]
        context["documentRecord"] = doc_meta

        # Load Intelligence
        intel = get_document_intelligence(target_doc_id)
        context["intelligenceRecord"] = intel

        # Load Validation
        val_path = os.path.join(VALIDATION_DIR, f"{target_doc_id}.json")
        if os.path.exists(val_path):
            try:
                with open(val_path, "r", encoding="utf-8") as f:
                    context["validationRecord"] = json.load(f)
            except Exception:
                pass

        # Load Structured Data
        struct_path = os.path.join(STRUCTURED_DATA_DIR, f"{target_doc_id}.json")
        if os.path.exists(struct_path):
            try:
                with open(struct_path, "r", encoding="utf-8") as f:
                    struct_data = json.load(f)
                    context["documentRecord"]["structuredData"] = struct_data.get("data", {})
            except Exception:
                pass

        context["evidenceItems"].append({
            "source": f"Document: {doc_meta.get('fileName', target_doc_id)}",
            "detail": f"Subsidiary: {doc_meta.get('subsidiary', 'N/A')}, Status: {doc_meta.get('validationStatus', 'N/A')}, Score: {doc_meta.get('validationScore', 'N/A')}/100"
        })
        return context

    # -----------------------------------------------------------------
    # Case 2: Analytics & Production Context
    # -----------------------------------------------------------------
    if query_type in ["Analytics Question", "Production Question", "Subsidiary Question", "Comparison Question", "Trend Question"]:
        context["primarySource"] = "storage/analytics/dashboard.json"
        prod = dashboard.get("production", {})
        val = dashboard.get("validation", {})
        quality = dashboard.get("quality", {})
        rankings = dashboard.get("rankings", {})
        subsidiaries = dashboard.get("subsidiaries", [])
        states = dashboard.get("states", [])
        financial_years = dashboard.get("financialYears", [])
        charts = dashboard.get("charts", {})

        subsidiary = entities.get("subsidiary")
        state = entities.get("state")

        # Slice for specific subsidiary
        if subsidiary:
            sub_match = next((s for s in subsidiaries if s.get("subsidiary", "").upper() == subsidiary.upper()), None)
            context["analyticsSlice"]["subsidiaryDetail"] = sub_match
            if sub_match:
                context["evidenceItems"].append({
                    "source": "storage/analytics/dashboard.json (subsidiaries)",
                    "detail": f"{subsidiary}: Production {sub_match.get('production', 0):,.2f} {sub_match.get('unit', 'MT')}, Rank #{sub_match.get('rank', 'N/A')}, Share {sub_match.get('contributionPct', 0):.1f}%"
                })

        # Slice for overall production
        context["analyticsSlice"]["production"] = {
            "totalCoalProduction": prod.get("totalCoalProduction", 0),
            "totalTargetProduction": prod.get("totalTargetProduction", 0),
            "productionAchievementPct": prod.get("productionAchievementPct", prod.get("productionAchievement", 0)),
            "averageProduction": prod.get("averageProduction", 0),
            "highestProduction": prod.get("highestProduction", 0),
            "lowestProduction": prod.get("lowestProduction", 0),
            "productionUnit": prod.get("productionUnit", "MT")
        }
        context["analyticsSlice"]["rankings"] = rankings
        context["analyticsSlice"]["validationHealth"] = {
            "validationAccuracy": val.get("validationAccuracy", 0),
            "validDocuments": val.get("validDocuments", 0),
            "invalidDocuments": val.get("invalidDocuments", 0),
            "commonErrors": val.get("commonErrors", [])[:3]
        }
        context["analyticsSlice"]["quality"] = {
            "overallQualityScore": quality.get("overallQualityScore", 0),
            "qualityRating": quality.get("qualityRating", "Good")
        }
        context["analyticsSlice"]["trend"] = charts.get("productionTrend", []) or financial_years

        # Supporting document records from search index
        filtered_records = []
        for d in docs_map.values():
            if subsidiary and d.get("subsidiary", "").upper() != subsidiary.upper():
                continue
            if state and d.get("state", "").upper() != state.upper():
                continue
            filtered_records.append(d)
        context["searchRecords"] = filtered_records[:5]

        # Add evidence item from dashboard
        top_subs = rankings.get("topSubsidiaries", subsidiaries)
        if top_subs:
            leader = top_subs[0]
            context["evidenceItems"].append({
                "source": "storage/analytics/dashboard.json (rankings)",
                "detail": f"Production Leader: {leader.get('subsidiary')} ({leader.get('production', 0):,.2f} {leader.get('unit', 'MT')})"
            })
        return context

    # -----------------------------------------------------------------
    # Case 3: Validation Question Context
    # -----------------------------------------------------------------
    if query_type == "Validation Question":
        context["primarySource"] = "storage/analytics/dashboard.json"
        val = dashboard.get("validation", {})
        context["analyticsSlice"]["validation"] = val

        # Find failed documents in search index
        failed_docs = [d for d in docs_map.values() if d.get("validationStatus") in ["Invalid", "Needs Review", "Failed"]]
        context["searchRecords"] = failed_docs[:8]

        context["evidenceItems"].append({
            "source": "storage/analytics/dashboard.json (validation)",
            "detail": f"Validation Accuracy: {val.get('validationAccuracy', 0)}%, Valid: {val.get('validDocuments', 0)}, Invalid: {val.get('invalidDocuments', 0)}"
        })
        return context

    # -----------------------------------------------------------------
    # Case 4: Report Generator Question Context
    # -----------------------------------------------------------------
    if query_type == "Report Question":
        context["primarySource"] = "storage/reports/report-history.json"
        subsidiary = entities.get("subsidiary")
        matching_reports = []
        for r in all_reports:
            if subsidiary and r.get("subsidiary", "").upper() != subsidiary.upper():
                continue
            matching_reports.append(r)
        context["reportRecords"] = matching_reports[:5]
        context["evidenceItems"].append({
            "source": "storage/reports/report-history.json",
            "detail": f"{len(matching_reports)} statutory reports available for inspection/download."
        })
        return context

    # -----------------------------------------------------------------
    # Case 5: Mine Question / Search Question Context
    # -----------------------------------------------------------------
    context["primarySource"] = "storage/search_index.json"
    search_res = search_documents(
        query=query_str,
        subsidiary=entities.get("subsidiary"),
        state=entities.get("state"),
        financial_year=entities.get("financialYear"),
        category=entities.get("category"),
        limit=8
    )
    context["searchRecords"] = search_res if isinstance(search_res, list) else search_res.get("results", [])

    # Mine entities discovery across records
    if query_type == "Mine Question":
        mines_found = set()
        for r in context["searchRecords"]:
            if r.get("mineName") and r.get("mineName") != "Unknown":
                mines_found.add(r.get("mineName"))
        context["analyticsSlice"]["minesFound"] = sorted(list(mines_found))

    for rec in context["searchRecords"][:3]:
        context["evidenceItems"].append({
            "source": rec.get("reportTitle") or rec.get("fileName"),
            "detail": f"Subsidiary: {rec.get('subsidiary')}, Mine: {rec.get('mineName')}, State: {rec.get('state')}"
        })

    return context
