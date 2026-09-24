"""
Phase 9 - Module 6: Cross-Document Relationships
Module 7: Semantic Metadata Storage (storage/document_intelligence/{id}.json)
Module 8: Pure-JSON Inverted Search Index (storage/search_index.json)
Deterministic multi-attribute query engine with zero database/vector dependencies.
"""

import os
import json
import glob
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Set

AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INTELLIGENCE_DIR = os.path.join(AI_SERVICE_DIR, "storage", "document_intelligence")
SEARCH_INDEX_FILE = os.path.join(AI_SERVICE_DIR, "storage", "search_index.json")


def init_intelligence_storage():
    """Ensure storage/document_intelligence directory exists."""
    os.makedirs(INTELLIGENCE_DIR, exist_ok=True)


def compute_related_documents(
    target_doc_id: str,
    target_data: Dict[str, Any],
    all_docs_metadata: List[Dict[str, Any]],
    max_related: int = 5
) -> List[Dict[str, Any]]:
    """
    Module 6: Deterministic similarity scoring based on shared attributes:
    - Same mine: +30 pts
    - Same subsidiary: +25 pts
    - Same financial year: +20 pts
    - Same state: +15 pts
    - Same document category: +10 pts
    Score clamped to 0 - 100.
    """
    related = []
    target_mine = (target_data.get("mineName") or "").strip().lower()
    target_sub = (target_data.get("subsidiary") or "").strip().lower()
    target_fy = (target_data.get("financialYear") or "").strip().lower()
    target_state = (target_data.get("state") or "").strip().lower()
    target_cat = (target_data.get("documentCategory") or target_data.get("category") or "").strip().lower()

    for doc in all_docs_metadata:
        doc_id = doc.get("documentId")
        if not doc_id or doc_id == target_doc_id:
            continue

        score = 0
        shared = []

        d_mine = (doc.get("mineName") or "").strip().lower()
        d_sub = (doc.get("subsidiary") or "").strip().lower()
        d_fy = (doc.get("financialYear") or "").strip().lower()
        d_state = (doc.get("state") or "").strip().lower()
        d_cat = (doc.get("documentCategory") or doc.get("category") or "").strip().lower()

        if target_mine and target_mine != "n/a" and target_mine == d_mine:
            score += 30
            shared.append(f"Mine ({doc.get('mineName')})")

        if target_sub and target_sub != "n/a" and target_sub == d_sub:
            score += 25
            shared.append(f"Subsidiary ({doc.get('subsidiary')})")

        if target_fy and target_fy != "n/a" and target_fy == d_fy:
            score += 20
            shared.append(f"FY ({doc.get('financialYear')})")

        if target_state and target_state != "n/a" and target_state == d_state:
            score += 15
            shared.append(f"State ({doc.get('state')})")

        if target_cat and target_cat != "unknown" and target_cat == d_cat:
            score += 10
            shared.append(f"Category ({doc.get('documentCategory') or doc.get('category')})")

        if score > 0:
            related.append({
                "documentId": doc_id,
                "documentTitle": doc.get("reportTitle") or doc.get("originalName") or "Document",
                "subsidiary": doc.get("subsidiary") or "CIL",
                "financialYear": doc.get("financialYear") or "N/A",
                "similarityScore": min(100, score),
                "sharedAttributes": shared
            })

    # Sort descending by similarity score
    related.sort(key=lambda x: x["similarityScore"], reverse=True)
    return related[:max_related]


def save_document_intelligence(doc_id: str, intelligence_payload: Dict[str, Any]) -> str:
    """Module 7: Persist semantic metadata record to storage/document_intelligence/{doc_id}.json."""
    init_intelligence_storage()
    file_path = os.path.join(INTELLIGENCE_DIR, f"{doc_id}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(intelligence_payload, f, indent=2)
    return file_path


def get_document_intelligence(doc_id: str) -> Optional[Dict[str, Any]]:
    """Module 7: Retrieve semantic metadata record by documentId."""
    file_path = os.path.join(INTELLIGENCE_DIR, f"{doc_id}.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[search_index] Error loading intelligence for {doc_id}: {e}")
    return None


def get_all_document_intelligence() -> List[Dict[str, Any]]:
    """Retrieve all stored document intelligence records."""
    init_intelligence_storage()
    records = []
    for fp in glob.glob(os.path.join(INTELLIGENCE_DIR, "*.json")):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    records.append(data)
        except Exception:
            pass
    return records


def rebuild_search_index() -> Dict[str, Any]:
    """
    Module 8: Maintain storage/search_index.json.
    Constructs an inverted index mapping keywords, topics, mine, state, subsidiary,
    and FY directly to document IDs. Pure JSON, zero database.
    """
    init_intelligence_storage()
    all_intel = get_all_document_intelligence()

    index_data = {
        "lastIndexedAt": datetime.now(timezone.utc).isoformat(),
        "totalDocuments": len(all_intel),
        "documents": {},
        "indices": {
            "by_keyword": {},
            "by_topic": {},
            "by_subsidiary": {},
            "by_mine": {},
            "by_state": {},
            "by_fy": {},
            "by_category": {},
            "by_entity": {}
        }
    }

    for record in all_intel:
        doc_id = record.get("documentId")
        if not doc_id:
            continue

        classification = record.get("classification", {})
        structured = record.get("structuredData", {})
        topics = record.get("topics", [])
        keywords = record.get("keywords", [])
        entities = record.get("entities", {})

        # Document summary card in index
        index_data["documents"][doc_id] = {
            "documentId": doc_id,
            "reportTitle": structured.get("reportTitle") or record.get("reportTitle") or "Document",
            "documentCategory": classification.get("documentCategory", "Unknown"),
            "classificationConfidence": classification.get("classificationConfidence", 0),
            "subsidiary": structured.get("subsidiary") or "CIL",
            "mineName": structured.get("mineName") or "N/A",
            "state": structured.get("state") or "N/A",
            "district": structured.get("district") or "N/A",
            "financialYear": structured.get("financialYear") or "N/A",
            "coalProduction": structured.get("coalProduction") or 0.0,
            "productionUnit": structured.get("productionUnit") or "MT",
            "validationScore": record.get("validationScore", 100),
            "validationStatus": record.get("validationStatus", "Valid"),
            "summary": record.get("summary", ""),
            "topTopics": [t["topic"] for t in topics[:3]],
            "keywords": keywords[:8],
            "relatedCount": len(record.get("relationships", {}).get("relatedDocuments", []))
        }

        # Helper to append to inverted index
        def _add_to_index(index_group: str, key: str):
            if not key or key == "n/a" or key == "unknown":
                return
            clean_k = key.strip().lower()
            if clean_k not in index_data["indices"][index_group]:
                index_data["indices"][index_group][clean_k] = []
            if doc_id not in index_data["indices"][index_group][clean_k]:
                index_data["indices"][index_group][clean_k].append(doc_id)

        # Invert keywords
        for kw in keywords:
            _add_to_index("by_keyword", kw)

        # Invert topics
        for t in topics:
            _add_to_index("by_topic", t.get("topic", ""))

        # Invert categorical attributes
        _add_to_index("by_subsidiary", structured.get("subsidiary", ""))
        _add_to_index("by_mine", structured.get("mineName", ""))
        _add_to_index("by_state", structured.get("state", ""))
        _add_to_index("by_fy", structured.get("financialYear", ""))
        _add_to_index("by_category", classification.get("documentCategory", ""))

        # Invert named entities
        if isinstance(entities, dict):
            for org in entities.get("organizations", []):
                _add_to_index("by_entity", org)
            for m in entities.get("mines", []):
                _add_to_index("by_entity", m)

    # Save search index
    with open(SEARCH_INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index_data, f, indent=2)

    return index_data


def update_document_in_search_index(doc_id: str, record: Dict[str, Any]) -> None:
    """Incrementally update or insert a single document in the search index."""
    index_data = load_search_index()
    classification = record.get("classification", {})
    structured = record.get("structuredData", {})
    topics = record.get("topics", [])
    keywords = record.get("keywords", [])
    entities = record.get("entities", {})

    index_data["documents"][doc_id] = {
        "documentId": doc_id,
        "reportTitle": structured.get("reportTitle") or record.get("reportTitle") or "Document",
        "documentCategory": classification.get("documentCategory", "Unknown"),
        "classificationConfidence": classification.get("classificationConfidence", 0),
        "subsidiary": structured.get("subsidiary") or "CIL",
        "mineName": structured.get("mineName") or "N/A",
        "state": structured.get("state") or "N/A",
        "district": structured.get("district") or "N/A",
        "financialYear": structured.get("financialYear") or "N/A",
        "coalProduction": structured.get("coalProduction") or 0.0,
        "productionUnit": structured.get("productionUnit") or "MT",
        "validationScore": record.get("validationScore", 100),
        "validationStatus": record.get("validationStatus", "Valid"),
        "summary": record.get("summary", ""),
        "topTopics": [t["topic"] for t in topics[:3]],
        "keywords": keywords[:8],
        "relatedCount": len(record.get("relationships", {}).get("relatedDocuments", []))
    }
    index_data["totalDocuments"] = len(index_data["documents"])
    index_data["lastIndexedAt"] = datetime.now(timezone.utc).isoformat()

    def _add_to_index(index_group: str, key: str):
        if not key or key == "n/a" or key == "unknown":
            return
        clean_k = key.strip().lower()
        if clean_k not in index_data["indices"][index_group]:
            index_data["indices"][index_group][clean_k] = []
        if doc_id not in index_data["indices"][index_group][clean_k]:
            index_data["indices"][index_group][clean_k].append(doc_id)

    for kw in keywords:
        _add_to_index("by_keyword", kw)
    for t in topics:
        _add_to_index("by_topic", t.get("topic", ""))
    _add_to_index("by_subsidiary", structured.get("subsidiary", ""))
    _add_to_index("by_mine", structured.get("mineName", ""))
    _add_to_index("by_state", structured.get("state", ""))
    _add_to_index("by_fy", structured.get("financialYear", ""))
    _add_to_index("by_category", classification.get("documentCategory", ""))

    try:
        with open(SEARCH_INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2)
    except Exception as e:
        print(f"[search_index] Warning saving incremental index: {e}")


def load_search_index() -> Dict[str, Any]:
    """Load or rebuild search_index.json."""
    if os.path.exists(SEARCH_INDEX_FILE):
        try:
            with open(SEARCH_INDEX_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return rebuild_search_index()


def _to_clean_str(val: Any) -> str:
    """Safely coerce any query parameter to clean string."""
    if val is None or not isinstance(val, str):
        return ""
    return val.strip()


def search_documents(
    query: Any = "",
    mine: Any = "",
    subsidiary: Any = "",
    state: Any = "",
    financial_year: Any = "",
    category: Any = "",
    topic: Any = "",
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Search documents using inverted indices and deterministic text scoring.
    Supports multi-field filtering with robust type coercion.
    """
    index_data = load_search_index()
    docs_map = index_data.get("documents", {})
    indices = index_data.get("indices", {})

    matching_doc_ids: Optional[Set[str]] = None

    # Coerce parameters to string safely
    c_query = _to_clean_str(query)
    c_mine = _to_clean_str(mine)
    c_subsidiary = _to_clean_str(subsidiary)
    c_state = _to_clean_str(state)
    c_fy = _to_clean_str(financial_year)
    c_category = _to_clean_str(category)
    c_topic = _to_clean_str(topic)

    # Attribute filter intersections
    def _intersect_filter(group_name: str, val: str):
        nonlocal matching_doc_ids
        if not val or val.lower() == "all":
            return
        clean_val = val.lower()
        matched = set()
        for idx_key, doc_ids in indices.get(group_name, {}).items():
            if clean_val in idx_key:
                matched.update(doc_ids)
        if matching_doc_ids is None:
            matching_doc_ids = matched
        else:
            matching_doc_ids = matching_doc_ids.intersection(matched)

    _intersect_filter("by_mine", c_mine)
    _intersect_filter("by_subsidiary", c_subsidiary)
    _intersect_filter("by_state", c_state)
    _intersect_filter("by_fy", c_fy)
    _intersect_filter("by_category", c_category)
    _intersect_filter("by_topic", c_topic)

    if matching_doc_ids is None:
        candidate_ids = set(docs_map.keys())
    else:
        candidate_ids = matching_doc_ids

    # Text query scoring
    query_clean = query.strip().lower()
    scored_results = []

    for doc_id in candidate_ids:
        doc = docs_map.get(doc_id)
        if not doc:
            continue

        match_score = 1.0  # Base match for passing attribute filters
        highlights = []

        if query_clean:
            # Check title match (highest weight)
            if query_clean in doc.get("reportTitle", "").lower():
                match_score += 15.0
                highlights.append(f"Title: {doc.get('reportTitle')}")

            # Check mine or subsidiary match
            if query_clean in doc.get("mineName", "").lower():
                match_score += 12.0
                highlights.append(f"Mine: {doc.get('mineName')}")
            if query_clean in doc.get("subsidiary", "").lower():
                match_score += 10.0
                highlights.append(f"Subsidiary: {doc.get('subsidiary')}")

            # Check topic match
            for t in doc.get("topTopics", []):
                if query_clean in t.lower():
                    match_score += 8.0
                    highlights.append(f"Topic: {t}")

            # Check keyword match
            for kw in doc.get("keywords", []):
                if query_clean in kw.lower():
                    match_score += 5.0
                    highlights.append(f"Keyword: {kw}")

            # Check summary match
            if query_clean in doc.get("summary", "").lower():
                match_score += 3.0

            # If user entered a query but document got zero score boost, skip
            if match_score <= 1.0:
                continue

        scored_results.append({
            **doc,
            "searchScore": round(match_score, 1),
            "matchHighlights": highlights[:4]
        })

    # Sort descending by searchScore
    scored_results.sort(key=lambda x: x.get("searchScore", 0), reverse=True)
    return scored_results[:limit]
