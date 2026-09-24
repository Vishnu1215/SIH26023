"""
Phase 10 - Natural Language Query & Decision Support Engine.
Module 4: Analytics Query Engine
Module 5: Deterministic Response Builder
Module 6: Query Suggestions
Module 7: Query History Persistence (storage/query_history.json)

100% Deterministic, explainable, zero external AI / LLMs.
Consumes Single Sources of Truth:
- Document search: storage/search_index.json
- Analytics: storage/analytics/dashboard.json
- Document intelligence: storage/document_intelligence/{id}.json
"""

import os
import json
import uuid
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from app.services.query_parser import parse_query
from app.services.search_index import search_documents, get_document_intelligence, load_search_index
from app.services.analytics_storage import load_dashboard
from app.services.analytics_engine import generate_dashboard_summary

AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
QUERY_HISTORY_FILE = os.path.join(AI_SERVICE_DIR, "storage", "query_history.json")


def _get_active_dashboard() -> Dict[str, Any]:
    """Retrieve the single source of truth analytics dashboard."""
    data = load_dashboard()
    if not data or not data.get("documents"):
        try:
            data = generate_dashboard_summary(save=True)
        except Exception:
            data = {}
    return data or {}


# =====================================================================
# Module 7: Query History Storage
# =====================================================================

def load_query_history() -> List[Dict[str, Any]]:
    """Load recent queries from storage/query_history.json (max 50, newest first)."""
    if not os.path.exists(QUERY_HISTORY_FILE):
        return []
    try:
        with open(QUERY_HISTORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except Exception as e:
        print(f"[query_engine] Warning reading query history: {e}")
    return []


def save_to_history(query: str, intent: str, total_results: int, filters: Dict[str, Any]) -> None:
    """Save an executed query to storage/query_history.json."""
    try:
        history = load_query_history()
        entry = {
            "id": f"qh-{uuid.uuid4().hex[:8]}",
            "query": query,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "intent": intent,
            "totalResults": total_results,
            "filters": filters
        }
        # Prepend and trim to 50
        history.insert(0, entry)
        history = history[:50]

        os.makedirs(os.path.dirname(QUERY_HISTORY_FILE), exist_ok=True)
        with open(QUERY_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"[query_engine] Warning saving query history: {e}")


def clear_query_history() -> bool:
    """Clear query history."""
    try:
        if os.path.exists(QUERY_HISTORY_FILE):
            os.remove(QUERY_HISTORY_FILE)
        return True
    except Exception as e:
        print(f"[query_engine] Warning clearing history: {e}")
        return False


# =====================================================================
# Module 6: Deterministic Query Suggestions
# =====================================================================

def get_query_suggestions() -> List[Dict[str, str]]:
    """Return PRD-aligned deterministic query suggestions with categories."""
    return [
        {
            "title": "SECL Production Reports",
            "query": "Show production reports for SECL",
            "category": "Production"
        },
        {
            "title": "FY 2023-24 Documents",
            "query": "Which documents belong to FY 2023-24?",
            "category": "Financial Year"
        },
        {
            "title": "Odisha Reports",
            "query": "Show reports from Odisha",
            "category": "Geography"
        },
        {
            "title": "Chhattisgarh Mines",
            "query": "List mines in Chhattisgarh",
            "category": "Mines"
        },
        {
            "title": "Validation Failures",
            "query": "Which documents failed validation?",
            "category": "Validation"
        },
        {
            "title": "Annual Reports",
            "query": "Show annual reports",
            "category": "Category"
        },
        {
            "title": "Gevra Mine Mentions",
            "query": "Find documents mentioning Gevra Mine",
            "category": "Mines"
        },
        {
            "title": "High Output (>100 MT)",
            "query": "Show documents with production greater than 100 MT",
            "category": "Production"
        },
        {
            "title": "Mine Safety Reports",
            "query": "Show reports related to mine safety",
            "category": "Topic"
        },
        {
            "title": "Production Leader",
            "query": "Which subsidiary has the highest production?",
            "category": "Analytics"
        },
        {
            "title": "CMPDI Reports",
            "query": "Which reports belong to CMPDI?",
            "category": "Organization"
        },
        {
            "title": "Validation Accuracy",
            "query": "What is the overall validation accuracy?",
            "category": "Validation"
        }
    ]


# =====================================================================
# Module 4 & 5: Analytics Query Engine & Deterministic Response Builder
# =====================================================================

def execute_nl_query(query_str: str, document_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Executes a natural language query end-to-end:
    Query -> Query Parser -> Intent & Filters -> Analytics or Search -> Response Builder.
    Returns complete structured response adhering to government standards.
    """
    start_time = time.perf_counter()
    parsed = parse_query(query_str, document_id=document_id)
    intent = parsed["intent"]
    filters = parsed["filters"]
    lower_query = (query_str or "").lower().strip()

    answer = ""
    source = ""
    reason = ""
    supporting_records: List[Dict[str, Any]] = []
    data_payload: Dict[str, Any] = {}

    dashboard = _get_active_dashboard()
    index_data = load_search_index()
    docs_map = index_data.get("documents", {})

    # -------------------------------------------------------------
    # Case 1: Specific Document Inquiries (Ask about this document)
    # -------------------------------------------------------------
    if intent == "document_details" or (document_id and document_id in docs_map):
        doc_key = document_id or next((k for k in docs_map.keys() if k in lower_query), None)
        if doc_key and doc_key in docs_map:
            doc = docs_map[doc_key]
            intel = get_document_intelligence(doc_key) or {}
            source = f"storage/document_intelligence/{doc_key}.json"

            if any(w in lower_query for w in ["validation", "score", "error", "accuracy", "discrepanc"]):
                v_score = doc.get("validationScore", 0)
                v_status = doc.get("validationStatus", "Unknown")
                answer = f"Document '{doc.get('reportTitle', doc_key)}' has a validation score of {v_score}/100 with status '{v_status}'."
                reason = "Extracted verified statutory validation results from document intelligence."
                data_payload = {"validationScore": v_score, "validationStatus": v_status, "documentId": doc_key}
            elif any(w in lower_query for w in ["summary"]):
                answer = doc.get("summary") or "No executive summary generated for this document."
                reason = "Deterministic factual summary compiled from structured fields and validation audits."
                data_payload = {"summary": answer, "documentId": doc_key}
            elif any(w in lower_query for w in ["entities", "mine", "location", "org"]):
                entities = intel.get("namedEntities") or {}
                mines = ", ".join(entities.get("mines", [])) or "None"
                orgs = ", ".join(entities.get("organizations", [])) or "None"
                states = ", ".join(entities.get("states", [])) or "None"
                answer = f"Entities detected: Organizations: {orgs} | Mines: {mines} | States: {states}."
                reason = "Extracted via mining gazetteers and regular expressions."
                data_payload = {"entities": entities, "documentId": doc_key}
            elif any(w in lower_query for w in ["topic", "subject"]):
                topics = intel.get("topics") or []
                top_str = ", ".join([f"{t.get('topic')} ({int(t.get('weight', 0)*100)}%)" for t in topics]) or "Coal Production"
                answer = f"Detected topics: {top_str}."
                reason = "Domain ontology term frequency scoring."
                data_payload = {"topics": topics, "documentId": doc_key}
            elif any(w in lower_query for w in ["related", "similar"]):
                related = intel.get("relatedDocuments") or []
                answer = f"Found {len(related)} related document(s) sharing mine, subsidiary, or financial year."
                reason = "Deterministic attribute overlap scoring."
                supporting_records = related
                data_payload = {"relatedCount": len(related), "documentId": doc_key}
            else:
                answer = f"Document details for '{doc.get('reportTitle', doc_key)}': Subsidiary: {doc.get('subsidiary')}, Mine: {doc.get('mineName')}, State: {doc.get('state')}, FY: {doc.get('financialYear')}."
                reason = "Retrieved primary document metadata."
                data_payload = doc

            supporting_records = [doc]

    # -------------------------------------------------------------
    # Case 2: Analytics Lookup Engine (Single Source: dashboard.json)
    # -------------------------------------------------------------
    if not answer and (intent == "analytics_lookup" or intent == "dashboard_metrics"):
        source = "storage/analytics/dashboard.json"
        prod = dashboard.get("production", {})
        val = dashboard.get("validation", {})
        rankings = dashboard.get("rankings", {})
        subs_list = dashboard.get("subsidiaries", [])

        # Highest Production / Top Subsidiary
        if any(w in lower_query for w in ["highest production", "top subsidiary", "most coal", "highest coal", "which subsidiary produced the highest", "which subsidiary has the highest"]):
            top_subs = rankings.get("topSubsidiaries", subs_list)
            if top_subs and len(top_subs) > 0:
                leader = top_subs[0]
                leader_name = leader.get("subsidiary", "Unknown")
                prod_val = leader.get("production", 0)
                unit = leader.get("unit", "MT")
                answer = f"{leader_name} recorded the highest coal production with {prod_val:,.2f} {unit}."
                reason = f"Rank #1 among all reporting subsidiaries in consolidated analytics."
                data_payload = {
                    "leader": leader_name,
                    "production": prod_val,
                    "unit": unit,
                    "rank": 1,
                    "documents": leader.get("documents", 0)
                }
                # Find matching documents
                supporting_records = [d for d in docs_map.values() if d.get("subsidiary") == leader_name][:5]
            else:
                answer = "No subsidiary production data recorded."
                reason = "Empty analytics dataset."

        # Lowest Production
        elif any(w in lower_query for w in ["lowest production"]):
            lowest_val = prod.get("lowestProduction", 0.0)
            unit = prod.get("productionUnit", "MT")
            answer = f"The lowest reported production figure is {lowest_val:,.2f} {unit}."
            reason = "Calculated from aggregated production distribution across records."
            data_payload = {"lowestProduction": lowest_val, "unit": unit}

        # Average Production
        elif any(w in lower_query for w in ["average production", "avg production"]):
            avg_val = prod.get("averageProduction", 0.0)
            unit = prod.get("productionUnit", "MT")
            answer = f"The average coal production across all reporting entities is {avg_val:,.2f} {unit}."
            reason = "Calculated across all validated production records."
            data_payload = {"averageProduction": avg_val, "unit": unit}

        # Total Coal Production & Targets
        elif any(w in lower_query for w in ["total coal production", "overall production", "total production", "target production", "achievement"]):
            tot_prod = prod.get("totalCoalProduction", 0)
            tot_target = prod.get("totalTargetProduction", 0)
            achieve_pct = prod.get("productionAchievementPct", prod.get("productionAchievement", 0.0))
            unit = prod.get("productionUnit", "MT")
            answer = f"Total coal production is {tot_prod:,.2f} {unit} against a target of {tot_target:,.2f} {unit} ({achieve_pct:.1f}% achievement)."
            reason = "Aggregated production metrics across all validated mining returns."
            data_payload = {
                "totalCoalProduction": tot_prod,
                "totalTargetProduction": tot_target,
                "achievementPct": achieve_pct,
                "unit": unit
            }

        # Top States
        elif any(w in lower_query for w in ["top states", "states with highest"]):
            top_states = rankings.get("topStates", dashboard.get("states", []))
            if top_states:
                state_names = [f"{s.get('state')} ({s.get('production', 0):,.1f} MT)" for s in top_states[:3]]
                answer = f"Top coal producing states: {', '.join(state_names)}."
                reason = "Ranked state-level coal output from consolidated returns."
                data_payload = {"topStates": top_states[:5]}
            else:
                answer = "No state production rankings available."
                reason = "No state records found."

        # Validation Accuracy / Quality Score
        elif any(w in lower_query for w in ["validation accuracy", "data quality", "quality rating", "validation score"]):
            acc = val.get("validationAccuracy", 0.0)
            rating = val.get("overallQualityRating", "Good")
            avg_score = val.get("averageValidationScore", 0.0)
            answer = f"Platform validation accuracy is {acc:.1f}% with an overall data quality score of {avg_score:.1f}/100 (Rating: {rating})."
            reason = "Calculated from Phase 6 validation engine across all verified records."
            data_payload = {
                "validationAccuracy": acc,
                "averageValidationScore": avg_score,
                "qualityRating": rating,
                "validDocuments": val.get("validDocuments", 0),
                "errorDocuments": val.get("errorDocuments", 0)
            }

        # Broad Dashboard Metrics
        else:
            doc_stats = dashboard.get("documents", {})
            tot_docs = doc_stats.get("totalDocuments", len(docs_map))
            tot_prod = prod.get("totalCoalProduction", 0)
            val_acc = val.get("validationAccuracy", 0.0)
            answer = f"The platform currently tracks {tot_docs} documents, {tot_prod:,.2f} MT total coal production, and maintains {val_acc:.1f}% validation accuracy."
            reason = "Consolidated executive overview from Single Source of Truth dashboard."
            data_payload = {
                "totalDocuments": tot_docs,
                "totalCoalProduction": tot_prod,
                "validationAccuracy": val_acc
            }

    # -------------------------------------------------------------
    # Case 3: Validation Lookup (e.g. Which documents failed validation?)
    # -------------------------------------------------------------
    if not answer and intent == "validation_lookup":
        source = "storage/search_index.json"
        failed_docs = [
            d for d in docs_map.values()
            if (d.get("validationStatus") in ["Error", "Failed"]) or (d.get("validationScore", 100) < 85)
        ]
        supporting_records = failed_docs
        answer = f"Identified {len(failed_docs)} document(s) with validation errors or discrepancy flags."
        reason = "Filtered records with statutory validation violations or score < 85."
        data_payload = {
            "failedCount": len(failed_docs),
            "documents": [d.get("reportTitle") for d in failed_docs[:5]]
        }

    # -------------------------------------------------------------
    # Case 4: Mine Lookup (e.g. List mines in Chhattisgarh)
    # -------------------------------------------------------------
    if not answer and intent == "mine_lookup":
        source = "storage/search_index.json"
        target_state = filters.get("state")
        target_sub = filters.get("subsidiary")

        matched_docs = list(docs_map.values())
        if target_state:
            matched_docs = [d for d in matched_docs if (d.get("state") or "").lower() == target_state.lower()]
        if target_sub:
            matched_docs = [d for d in matched_docs if (d.get("subsidiary") or "").lower() == target_sub.lower()]

        unique_mines = sorted(list(set([d.get("mineName") for d in matched_docs if d.get("mineName") and d.get("mineName") != "N/A" and d.get("mineName") != "-"])))

        loc_desc = f"in {target_state}" if target_state else (f"under {target_sub}" if target_sub else "across records")
        if unique_mines:
            answer = f"Found {len(unique_mines)} active mine(s) {loc_desc}: {', '.join(unique_mines)}."
        else:
            answer = f"No specific mines recorded {loc_desc}."
        reason = "Extracted unique mine entities from indexed operational documents."
        supporting_records = matched_docs
        data_payload = {"mines": unique_mines, "location": loc_desc}

    # -------------------------------------------------------------
    # Case 5: Document Search / Filter Execution (Search Documents)
    # -------------------------------------------------------------
    if not answer:
        source = "storage/search_index.json"

        # Call Phase 9 inverted search index
        results = search_documents(
            query=filters.get("keyword") or "",
            mine=filters.get("mine") or "",
            subsidiary=filters.get("subsidiary") or "",
            state=filters.get("state") or "",
            financial_year=filters.get("financialYear") or "",
            category=filters.get("category") or "",
            topic=filters.get("topic") or "",
            limit=50
        )

        # Apply post-filters: Production range
        min_p = filters.get("minProduction")
        max_p = filters.get("maxProduction")
        v_status = filters.get("validationStatus")

        filtered = []
        for r in results:
            p_val = float(r.get("coalProduction") or 0.0)
            if min_p is not None and p_val < min_p:
                continue
            if max_p is not None and p_val > max_p:
                continue
            if v_status and r.get("validationStatus", "").lower() != v_status.lower():
                continue
            filtered.append(r)

        supporting_records = filtered
        count = len(filtered)

        # Build natural language answer
        criteria_parts = []
        if filters.get("category"):
            criteria_parts.append(f"category '{filters['category']}'")
        if filters.get("subsidiary"):
            criteria_parts.append(f"subsidiary '{filters['subsidiary']}'")
        if filters.get("mine"):
            criteria_parts.append(f"mine '{filters['mine']}'")
        if filters.get("state"):
            criteria_parts.append(f"state '{filters['state']}'")
        if filters.get("financialYear"):
            criteria_parts.append(f"FY '{filters['financialYear']}'")
        if filters.get("topic"):
            criteria_parts.append(f"topic '{filters['topic']}'")
        if min_p is not None:
            criteria_parts.append(f"production > {min_p} MT")
        if max_p is not None:
            criteria_parts.append(f"production < {max_p} MT")

        filter_desc = ", ".join(criteria_parts) if criteria_parts else "specified criteria"

        # Smart deterministic fallback 1: Production reports for subsidiary
        if count == 0 and filters.get("category") == "Production Report" and filters.get("subsidiary"):
            sub_name = filters.get("subsidiary").lower()
            fallback_matches = [
                d for d in docs_map.values()
                if (d.get("subsidiary") or "").lower() == sub_name and (float(d.get("coalProduction") or 0) > 0 or "production" in d.get("reportTitle", "").lower())
            ]
            if fallback_matches:
                filtered = fallback_matches
                supporting_records = filtered
                count = len(filtered)
                answer = f"Found {count} document(s) reporting production for {filters['subsidiary']}."
                reason = f"Matched documents for subsidiary '{filters['subsidiary']}' containing verified production records."

        # Smart deterministic fallback 2: Subsidiary or Organization referenced in Title or Keywords
        if count == 0 and filters.get("subsidiary"):
            sub_name = filters.get("subsidiary").lower()
            fallback_org_matches = [
                d for d in docs_map.values()
                if sub_name in d.get("reportTitle", "").lower() or any(sub_name in kw.lower() for kw in d.get("keywords", []))
            ]
            if fallback_org_matches:
                filtered = fallback_org_matches
                supporting_records = filtered
                count = len(filtered)
                answer = f"Found {count} document(s) referencing {filters['subsidiary']}."
                reason = f"Matched documents referencing '{filters['subsidiary']}' in report title or keywords."

        if count > 0 and not answer:
            answer = f"Found {count} document(s) matching {filter_desc}."
            reason = f"Deterministic multi-attribute query over Phase 9 inverted search index."
        elif count == 0:
            answer = f"No documents matched {filter_desc}."
            reason = "No stored documents satisfied all specified filter conditions."

        data_payload = {"count": count, "filtersApplied": filters}

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

    # Save query to history
    save_to_history(
        query=query_str,
        intent=intent,
        total_results=len(supporting_records),
        filters=filters
    )

    return {
        "status": "success",
        "query": query_str,
        "intent": intent,
        "answer": answer,
        "source": source,
        "reason": reason,
        "data": data_payload,
        "filters": filters,
        "supportingRecords": supporting_records[:20],
        "totalResults": len(supporting_records),
        "executionTimeMs": elapsed_ms
    }
