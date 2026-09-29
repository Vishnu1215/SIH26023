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
    Search documents directly from MongoDB Atlas across:
    document name, subsidiary, mine, topic, report type, financial year, and metadata.
    Returns ranked results without filesystem lookup.
    """
    from app.database import get_sync_db
    try:
        db = get_sync_db()
        c_query = _to_clean_str(query).lower()
        c_mine = _to_clean_str(mine)
        c_subsidiary = _to_clean_str(subsidiary)
        c_state = _to_clean_str(state)
        c_fy = _to_clean_str(financial_year)
        c_category = _to_clean_str(category)
        c_topic = _to_clean_str(topic)

        # Build MongoDB filter
        mongo_filter: Dict[str, Any] = {}
        if c_subsidiary and c_subsidiary.lower() != "all":
            mongo_filter["subsidiary"] = {"$regex": f"^{c_subsidiary}$", "$options": "i"}
        if c_mine and c_mine.lower() != "all":
            mongo_filter["mineName"] = {"$regex": c_mine, "$options": "i"}
        if c_state and c_state.lower() != "all":
            mongo_filter["state"] = {"$regex": c_state, "$options": "i"}
        if c_fy and c_fy.lower() != "all":
            mongo_filter["financialYear"] = {"$regex": c_fy, "$options": "i"}
        if c_category and c_category.lower() != "all":
            mongo_filter["category"] = {"$regex": c_category, "$options": "i"}

        docs_cursor = db["documents"].find(mongo_filter, {"_id": 0})
        matching_docs = list(docs_cursor)

        # If topic filter provided, match via structured_records
        if c_topic and c_topic.lower() != "all":
            topic_docs = db["structured_records"].find(
                {"extractedTopics": {"$regex": c_topic, "$options": "i"}},
                {"documentId": 1, "_id": 0}
            )
            topic_ids = {td["documentId"] for td in topic_docs}
            matching_docs = [d for d in matching_docs if d.get("documentId") in topic_ids]

        # Fetch structured summaries and topics in batch for ranking
        doc_ids = [d.get("documentId") for d in matching_docs if d.get("documentId")]
        struct_map = {}
        if doc_ids:
            struct_cursor = db["structured_records"].find({"documentId": {"$in": doc_ids}}, {"_id": 0})
            for s in struct_cursor:
                struct_map[s["documentId"]] = s

        scored_results = []
        for doc in matching_docs:
            d_id = doc.get("documentId")
            s_rec = struct_map.get(d_id, {})
            topics = s_rec.get("extractedTopics") or []
            summary = s_rec.get("summary") or doc.get("summary", "")

            match_score = 1.0
            highlights = []

            title = doc.get("fileName") or doc.get("reportTitle", "")
            d_mine_name = doc.get("mineName") or ""
            d_sub = doc.get("subsidiary") or ""

            if c_query:
                # Check title match
                if c_query in title.lower():
                    match_score += 15.0
                    highlights.append(f"Title: {title}")
                # Check mine or subsidiary
                if d_mine_name and c_query in d_mine_name.lower():
                    match_score += 12.0
                    highlights.append(f"Mine: {d_mine_name}")
                if d_sub and c_query in d_sub.lower():
                    match_score += 10.0
                    highlights.append(f"Subsidiary: {d_sub}")
                # Check topic match
                for t in topics:
                    if c_query in t.lower():
                        match_score += 8.0
                        highlights.append(f"Topic: {t}")
                # Check summary match
                if summary and c_query in summary.lower():
                    match_score += 4.0
                    highlights.append("Executive Summary")

                # If query was specified and got no boost, skip unless filtered specifically
                if match_score <= 1.0 and not (c_mine or c_subsidiary or c_state or c_fy or c_category or c_topic):
                    continue

            scored_results.append({
                "documentId": d_id,
                "reportTitle": title,
                "fileName": title,
                "documentCategory": doc.get("category", "General"),
                "subsidiary": d_sub,
                "mineName": d_mine_name,
                "state": doc.get("state", "National"),
                "district": doc.get("district"),
                "financialYear": doc.get("financialYear", "FY 2023-24"),
                "validationScore": doc.get("validationScore", 100),
                "validationStatus": doc.get("validationStatus", "Valid"),
                "summary": summary,
                "topTopics": topics[:3],
                "searchScore": round(match_score, 1),
                "matchHighlights": highlights[:4]
            })

        scored_results.sort(key=lambda x: x.get("searchScore", 0), reverse=True)
        return scored_results[:limit]
    except Exception as e:
        logger.error(f"Error querying MongoDB search: {e}", exc_info=True)
        return []
