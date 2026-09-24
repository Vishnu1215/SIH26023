"""
Phase 11 - Hybrid AI Question Answering: QA Router.

Classifies incoming natural language questions into defined query types:
- Analytics Question
- Validation Question
- Production Question
- Search Question
- Mine Question
- Subsidiary Question
- Report Question
- Comparison Question
- Trend Question
- Document Question

Extracts domain entities (subsidiary, mine, state, FY, category, topic, thresholds).
Determines execution requirements (Text-to-SQL readiness, RAG chunk retrieval need).
100% Deterministic rule-based router with zero hallucination.
"""

import re
from typing import Dict, Any, Optional

from app.services.query_parser import parse_query

def route_qa_query(query_str: str, document_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyzes user question and routes to optimal answering strategy.
    Returns classified queryType, extracted entities, SQL/RAG flags, and confidence.
    """
    clean_q = (query_str or "").strip()
    lower_q = clean_q.lower()

    # 1. Reuse verified entity parser
    parsed = parse_query(clean_q, document_id=document_id)
    p_filters = parsed.get("filters", {})

    # Check for direct document ID in query or parameter
    extracted_doc_id = document_id or parsed.get("documentId")
    if not extracted_doc_id:
        doc_id_match = re.search(r'\b(doc-[a-f0-9\-]+|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4})\b', lower_q)
        if doc_id_match:
            extracted_doc_id = doc_id_match.group(1)

    min_p = p_filters.get("minProduction")
    max_p = p_filters.get("maxProduction")
    operator = ">=" if min_p is not None else ("<=" if max_p is not None else "=")
    threshold = min_p if min_p is not None else max_p

    entities = {
        "subsidiary": p_filters.get("subsidiary"),
        "state": p_filters.get("state"),
        "mine": p_filters.get("mine"),
        "financialYear": p_filters.get("financialYear"),
        "category": p_filters.get("category"),
        "topic": p_filters.get("topic"),
        "operator": operator,
        "threshold": threshold,
        "validationStatus": p_filters.get("validationStatus"),
        "documentId": extracted_doc_id
    }

    # 2. Determine Query Type
    query_type = "Search Question"
    confidence = 0.95

    # Case A: Document-specific inquiry
    if extracted_doc_id or any(kw in lower_q for kw in ["this document", "this report", "current file", "uploaded file"]):
        query_type = "Document Question"
        confidence = 0.98

    # Case B: Comparison Question
    elif any(kw in lower_q for kw in ["compare", "versus", " vs ", "difference between", "higher than", "gap between", "compared to"]):
        query_type = "Comparison Question"
        confidence = 0.95

    # Case C: Trend Question
    elif any(kw in lower_q for kw in ["trend", "growth", "progression", "over time", "monthly trend", "fy trend", "historical"]):
        query_type = "Trend Question"
        confidence = 0.96

    # Case D: Validation Question
    elif any(kw in lower_q for kw in [
        "failed validation", "invalid document", "validation error", "warning", "discrepanc",
        "validation rules", "vr-", "non-compliant", "compliance status"
    ]):
        query_type = "Validation Question"
        confidence = 0.97

    # Case E: Subsidiary Leader / Ranking / Specific Subsidiary Question
    elif any(kw in lower_q for kw in [
        "highest production", "top subsidiary", "which subsidiary produced the highest",
        "which subsidiary has the highest", "highest coal", "most coal", "best performing subsidiary",
        "top subsidiaries", "subsidiary ranking", "highest producing"
    ]):
        query_type = "Subsidiary Question"
        confidence = 0.99

    # Case F: Mine Question
    elif entities.get("mine") or any(kw in lower_q for kw in ["list mines", "which mines", "show mines", "collieries", "colliery", "coal seam"]):
        query_type = "Mine Question"
        confidence = 0.95

    # Case G: Report Generator / Statutory Report Question
    elif any(kw in lower_q for kw in [
        "generated report", "executive report", "production report 202", "monthly report",
        "download report", "report history", "statutory report"
    ]) and not any(kw in lower_q for kw in ["what is the total production", "how much"]):
        query_type = "Report Question"
        confidence = 0.94

    # Case H: Production Question (Specific production queries, thresholds, targets)
    elif threshold is not None or any(kw in lower_q for kw in [
        "target production", "achievement percentage", "achievement %", "target variance",
        "overburden removal", "obr", "production greater than", "production less than"
    ]):
        query_type = "Production Question"
        confidence = 0.96

    # Case I: General Analytics / Dashboard KPI Question
    elif any(kw in lower_q for kw in [
        "total coal production", "overall production", "total production", "average production",
        "lowest production", "data quality score", "quality score", "overall validation accuracy",
        "validation accuracy", "dashboard", "kpi", "total documents", "how many documents"
    ]):
        query_type = "Analytics Question"
        confidence = 0.98

    # Case J: Specific subsidiary inquiry
    elif entities.get("subsidiary") and any(kw in lower_q for kw in ["production", "performance", "target", "achievement"]):
        query_type = "Subsidiary Question"
        confidence = 0.96

    # Determine Text-to-SQL readiness & RAG chunk retrieval requirements
    requires_sql = query_type in ["Analytics Question", "Production Question", "Subsidiary Question", "Comparison Question"]
    requires_rag = query_type in ["Document Question", "Search Question", "Report Question"] or (entities.get("topic") is not None)

    return {
        "queryType": query_type,
        "entities": entities,
        "requiresSQL": requires_sql,
        "requiresRAG": requires_rag,
        "confidence": confidence,
        "cleanQuery": clean_q
    }
