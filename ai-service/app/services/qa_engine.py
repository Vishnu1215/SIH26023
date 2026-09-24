"""
Phase 11 - Hybrid AI Question Answering: Main QA Engine.

Orchestrates the entire Hybrid QA Pipeline:
Natural Language Question
         ↓
  qa_router.py (Intent, Type, Entities)
         ↓
  context_builder.py (Single Source of Truth Slices)
         ↓
 ┌─────────────────────────────┐
 │ sql_adapter.py (Relational) │
 │ rag_adapter.py (Retrieval)  │
 │ llm_adapter.py (Optional)   │
 └─────────────────────────────┘
         ↓
  answer_composer.py (Deterministic & Citation-backed)
         ↓
  qa_storage.py (History Log in storage/qa_history.json)
"""

import time
import logging
from typing import Dict, Any, List, Optional

from app.services.qa_router import route_qa_query
from app.services.context_builder import build_qa_context, _get_active_dashboard
from app.services.citation_builder import build_citations_from_records
from app.services.sql_adapter import sql_adapter
from app.services.rag_adapter import rag_adapter
from app.services.llm_adapter import llm_adapter
from app.services.answer_composer import compose_qa_response
from app.services.qa_storage import save_qa_record, load_qa_history, clear_qa_history
from app.services.search_index import load_search_index
from app.services.report_storage import get_report_history

logger = logging.getLogger(__name__)


def execute_qa(
    question: str,
    use_llm: bool = False,
    document_id: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes a Hybrid QA query end-to-end with evidence collection and source citations.
    """
    start_time = time.perf_counter()
    clean_q = (question or "").strip()

    # 1. Hybrid Query Router
    route_info = route_qa_query(clean_q, document_id=document_id)
    query_type = route_info["queryType"]
    entities = route_info["entities"]

    # Merge external filters if provided
    if filters:
        for k, v in filters.items():
            if v and not entities.get(k):
                entities[k] = v

    # 2. Context Builder (Minimum required factual slice)
    context = build_qa_context(
        query_type=query_type,
        entities=entities,
        query_str=clean_q,
        document_id=document_id
    )

    # 3. Optional SQL Adapter & RAG Retrieval Hooks
    sql_meta = None
    if route_info.get("requiresSQL") and sql_adapter.can_handle_with_sql(query_type, entities):
        sql_meta = sql_adapter.generate_sql_statement(query_type, entities)

    rag_chunks = []
    if route_info.get("requiresRAG"):
        rag_chunks = rag_adapter.retrieve_relevant_chunks(
            query=clean_q,
            top_k=3,
            document_id=document_id,
            filters=entities
        )
        if rag_chunks:
            for ch in rag_chunks:
                context["evidenceItems"].append({
                    "source": f"RAG Chunk: {ch.get('documentTitle')}",
                    "detail": ch.get("text")[:150]
                })

    # 4. Optional LLM Adapter Call
    llm_narrative = None
    if use_llm and llm_adapter.is_enabled():
        llm_narrative = llm_adapter.generate_narrative(context, clean_q)

    # 5. Deterministic Answer Composer
    response = compose_qa_response(
        query_str=clean_q,
        query_type=query_type,
        entities=entities,
        context=context,
        llm_narrative=llm_narrative
    )

    # Attach SQL metadata if applicable
    if sql_meta:
        response["sqlStatement"] = sql_meta.get("sql")

    # Measure execution latency
    end_time = time.perf_counter()
    response_time_ms = (end_time - start_time) * 1000.0
    response["responseTimeMs"] = round(response_time_ms, 2)
    response["useLLM"] = bool(use_llm and llm_adapter.is_enabled())
    response["status"] = "success"

    # 6. Persist to storage/qa_history.json
    save_qa_record(
        question=clean_q,
        answer=response.get("answer", ""),
        query_type=query_type,
        confidence=response.get("confidence", 0.98),
        evidence=response.get("evidence", []),
        documents_used=response.get("documentsUsed", []),
        response_time_ms=response_time_ms,
        use_llm=response["useLLM"],
        document_id=document_id
    )

    return response


def explain_qa_query(question: str, document_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns explainable rationale, data sources, and evidence without revealing chain-of-thought.
    """
    clean_q = (question or "").strip()
    route_info = route_qa_query(clean_q, document_id=document_id)
    query_type = route_info["queryType"]
    entities = route_info["entities"]

    context = build_qa_context(query_type, entities, clean_q, document_id=document_id)
    primary_src = context.get("primarySource", "storage/analytics/dashboard.json")

    data_sources = [primary_src]
    if context.get("searchRecords"):
        data_sources.append("storage/search_index.json")
    if context.get("reportRecords"):
        data_sources.append("storage/reports/report-history.json")

    reasoning_templates = {
        "Subsidiary Question": "Direct analytical lookup from verified subsidiary contribution rankings in dashboard.json.",
        "Analytics Question": "Aggregated macro Key Performance Indicator lookup from storage/analytics/dashboard.json.",
        "Production Question": "Mathematical evaluation of coal production metrics and threshold boundaries.",
        "Validation Question": "Audited statutory rule validation logs in storage/validation/.",
        "Mine Question": "Geographical gazetteer extraction matching coal mines and collieries.",
        "Document Question": "Deep document metadata and entity extraction from document intelligence.",
        "Comparison Question": "Variance analysis between target and actual production figures.",
        "Trend Question": "Chronological aggregation across reporting financial year intervals.",
        "Report Question": "Statutory report registry lookup from compiled report files.",
        "Search Question": "Deterministic inverted full-text search across indexed repository files."
    }

    reasoning = reasoning_templates.get(query_type, "Factual metadata resolution across verified single sources of truth.")

    return {
        "status": "success",
        "question": clean_q,
        "queryType": query_type,
        "reasoning": reasoning,
        "evidence": context.get("evidenceItems", []),
        "dataSources": sorted(list(set(data_sources))),
        "confidence": route_info.get("confidence", 0.98),
        "requiresSQL": route_info.get("requiresSQL", False),
        "requiresRAG": route_info.get("requiresRAG", False)
    }


def get_dynamic_qa_suggestions() -> List[Dict[str, Any]]:
    """
    Dynamically generates context-aware QA suggestions based on active dashboard,
    document intelligence, and reports.
    """
    dashboard = _get_active_dashboard()
    reports = get_report_history()
    index_data = load_search_index()
    docs = index_data.get("documents", {})

    suggestions = []

    # 1. Subsidiary suggestion
    top_subs = dashboard.get("rankings", {}).get("topSubsidiaries", dashboard.get("subsidiaries", []))
    if top_subs:
        leader_name = top_subs[0].get("subsidiary", "SECL")
        suggestions.append({
            "title": "Subsidiary Production Leader",
            "question": "Which subsidiary produced the highest coal?",
            "category": "Subsidiary",
            "badge": "Top Performer"
        })
        suggestions.append({
            "title": f"{leader_name} Performance",
            "question": f"What is the total coal production of {leader_name}?",
            "category": "Production",
            "badge": "Target & Output"
        })

    # 2. National Macro KPI suggestion
    suggestions.append({
        "title": "National Coal Production",
        "question": "What is the total coal production across all reporting entities?",
        "category": "Analytics",
        "badge": "Executive KPI"
    })

    # 3. Validation Audit suggestion
    suggestions.append({
        "title": "Statutory Compliance Audit",
        "question": "Which documents failed validation or need review?",
        "category": "Validation",
        "badge": "Statutory Audit"
    })

    # 4. Data Quality suggestion
    suggestions.append({
        "title": "Platform Quality Rating",
        "question": "What is the overall data quality score and validation accuracy?",
        "category": "Quality",
        "badge": "Data Health"
    })

    # 5. Mine Lookup suggestion
    suggestions.append({
        "title": "Mine Registry Lookup",
        "question": "Which mines and collieries are located in Chhattisgarh?",
        "category": "Mines",
        "badge": "Geological"
    })

    # 6. Report Generator suggestion
    if reports:
        suggestions.append({
            "title": "Available Statutory Reports",
            "question": "Show available executive and production reports for download",
            "category": "Reports",
            "badge": "Statutory Reports"
        })

    return suggestions
