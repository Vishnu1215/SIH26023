"""
Phase 9 Master Orchestrator: Intelligent Document Understanding & Topic Modeling.
Coordinates Modules 1 through 8 strictly deterministically:
- Document Classification (Module 1)
- Topic Modeling with Mining Ontology (Module 2)
- Keyword Extraction (Module 3)
- Named Entity Extraction (Module 4)
- Template-driven Executive Summary (Module 5)
- Cross-Document Relationships (Module 6)
- Semantic Storage (Module 7)
- Search Indexing (Module 8)
Target performance: <10ms per document.
"""

import os
import json
import glob
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from app.services.document_classifier import classify_document
from app.services.topic_model import extract_document_topics
from app.services.entity_extractor import extract_keywords, extract_named_entities
from app.services.document_summary import generate_executive_summary
from app.services.search_index import (
    save_document_intelligence,
    get_document_intelligence,
    compute_related_documents,
    rebuild_search_index,
    update_document_in_search_index,
    get_all_document_intelligence
)

AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STRUCTURED_DIR = os.path.join(AI_SERVICE_DIR, "storage", "structured_data")
VALIDATION_DIR = os.path.join(AI_SERVICE_DIR, "storage", "validation")


def _load_structured_record(doc_id: str) -> Dict[str, Any]:
    """Load Phase 5 structured extraction record."""
    fp = os.path.join(STRUCTURED_DIR, f"{doc_id}.json")
    if os.path.exists(fp):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _load_validation_record(doc_id: str) -> Dict[str, Any]:
    """Load Phase 6 validation engine record."""
    fp = os.path.join(VALIDATION_DIR, f"{doc_id}.json")
    if os.path.exists(fp):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _load_all_structured_metadata() -> List[Dict[str, Any]]:
    """Gather metadata across all structured records for cross-document graphs."""
    records = []
    if os.path.exists(STRUCTURED_DIR):
        for fp in glob.glob(os.path.join(STRUCTURED_DIR, "*.json")):
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and data.get("documentId"):
                        records.append(data)
            except Exception:
                pass
    return records


def process_document_intelligence(
    document_id: str,
    extracted_text: str = "",
    filename: str = ""
) -> Dict[str, Any]:
    """
    Main entry point for processing Phase 9 Document Intelligence.
    Consumes outputs from Phase 4, Phase 5, and Phase 6.
    Executes in <10ms deterministically.
    """
    start_time = time.perf_counter()

    # Load Phase 5 & Phase 6 data
    structured_data = _load_structured_record(document_id)
    validation_data = _load_validation_record(document_id)

    report_title = structured_data.get("reportTitle") or filename or "Document"

    # Module 1: Classification
    classification = classify_document(
        filename=filename,
        report_title=report_title,
        extracted_text=extracted_text,
        structured_data=structured_data
    )

    # Module 2: Topic Modeling
    topics = extract_document_topics(
        text=extracted_text,
        structured_data=structured_data
    )

    # Module 3: Keyword Extraction
    keywords = extract_keywords(
        text=extracted_text,
        structured_data=structured_data
    )

    # Module 4: Named Entity Extraction
    entities = extract_named_entities(
        text=extracted_text,
        structured_data=structured_data
    )

    # Module 5: Template-driven Executive Summary
    summary = generate_executive_summary(
        classification=classification,
        structured_data=structured_data,
        validation_data=validation_data,
        topics=topics
    )

    # Module 6: Cross-Document Relationships
    all_docs = _load_all_structured_metadata()
    target_meta = {
        "mineName": structured_data.get("mineName"),
        "subsidiary": structured_data.get("subsidiary"),
        "financialYear": structured_data.get("financialYear"),
        "state": structured_data.get("state"),
        "documentCategory": classification.get("documentCategory")
    }
    related_docs = compute_related_documents(
        target_doc_id=document_id,
        target_data=target_meta,
        all_docs_metadata=all_docs
    )

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

    # Assemble complete semantic metadata record
    intelligence_payload = {
        "documentId": document_id,
        "reportTitle": report_title,
        "processedAt": datetime.now(timezone.utc).isoformat(),
        "processingTimeMs": elapsed_ms,
        "classification": classification,
        "topics": topics,
        "keywords": keywords,
        "entities": entities,
        "summary": summary,
        "relationships": {
            "relatedDocuments": related_docs,
            "totalRelated": len(related_docs)
        },
        "structuredData": structured_data,
        "validationScore": validation_data.get("validationScore", 100),
        "validationStatus": validation_data.get("validationStatus", "Valid")
    }

    # Module 7: Save to storage/document_intelligence/{document_id}.json
    save_document_intelligence(document_id, intelligence_payload)

    # Module 8: Incrementally update storage/search_index.json
    update_document_in_search_index(document_id, intelligence_payload)

    return intelligence_payload


def batch_process_all_documents() -> Dict[str, Any]:
    """Batch process intelligence for all available structured records."""
    all_docs = _load_all_structured_metadata()
    processed_count = 0
    start_time = time.perf_counter()

    for doc in all_docs:
        doc_id = doc.get("documentId")
        if doc_id:
            process_document_intelligence(
                document_id=doc_id,
                filename=doc.get("reportTitle", "")
            )
            processed_count += 1

    # Rebuild search index once at the end
    rebuild_search_index()
    elapsed = round(time.perf_counter() - start_time, 3)

    return {
        "status": "success",
        "processedCount": processed_count,
        "timeTakenSeconds": elapsed
    }
