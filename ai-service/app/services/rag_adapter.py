"""
Phase 11 - Hybrid AI Question Answering: RAG Adapter Abstraction Layer.

Provides a decoupled retrieval interface for context grounding.
Retrieves relevant factual text chunks without requiring external vector databases.
Designed to be plug-and-play with future Vector Stores (Chroma, FAISS, Milvus, Qdrant).

Currently powered deterministically by:
- storage/search_index.json (Inverted full-text index)
- storage/document_intelligence/{id}.json (Executive summaries, topics, entities)
- storage/structured_data/{id}.json (Factual data tables)
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional

from app.services.search_index import search_documents, get_document_intelligence, load_search_index

logger = logging.getLogger(__name__)

class RAGAdapter:
    def __init__(self):
        self.backend: str = "deterministic_index" # options: deterministic_index, faiss_ready, chroma_ready
        self.embedding_dimension: int = 384 # Standard MiniLM dimension for future use
        self.vector_store_ready: bool = True

    def get_status(self) -> Dict[str, Any]:
        """Returns RAG adapter configuration and readiness status."""
        return {
            "backend": self.backend,
            "vectorStoreReady": self.vector_store_ready,
            "embeddingDimension": self.embedding_dimension,
            "retrievalMethod": "Deterministic Inverted Index + Metadata Grounding",
            "futureBackendsSupported": ["ChromaDB", "FAISS", "Milvus", "Qdrant", "pgvector"]
        }

    def retrieve_relevant_chunks(
        self,
        query: str,
        top_k: int = 5,
        document_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top-k most relevant evidence chunks for a given natural language query.
        Returns standardized chunk records compatible with LLM context windows or deterministic synthesizers.
        """
        chunks: List[Dict[str, Any]] = []
        clean_query = (query or "").strip().lower()

        # If document_id is specified, pull directly from document intelligence and summary
        if document_id:
            intel = get_document_intelligence(document_id)
            index_data = load_search_index()
            doc_meta = index_data.get("documents", {}).get(document_id, {})

            if intel or doc_meta:
                summary_text = (intel or {}).get("summary") or doc_meta.get("summary") or ""
                if summary_text:
                    chunks.append({
                        "chunkId": f"{document_id}_summary",
                        "documentId": document_id,
                        "documentTitle": doc_meta.get("reportTitle") or doc_meta.get("fileName", document_id),
                        "section": "Executive Summary",
                        "text": summary_text,
                        "score": 0.95,
                        "metadata": {
                            "subsidiary": doc_meta.get("subsidiary"),
                            "mineName": doc_meta.get("mineName"),
                            "financialYear": doc_meta.get("financialYear"),
                            "validationScore": doc_meta.get("validationScore")
                        }
                    })

                # Add structured entity chunk
                entities = (intel or {}).get("namedEntities") or {}
                mines = ", ".join(entities.get("mines", []))
                orgs = ", ".join(entities.get("organizations", []))
                if mines or orgs:
                    chunks.append({
                        "chunkId": f"{document_id}_entities",
                        "documentId": document_id,
                        "documentTitle": doc_meta.get("reportTitle") or doc_meta.get("fileName", document_id),
                        "section": "Statutory Entities",
                        "text": f"Mines: {mines or 'N/A'}. Organizations: {orgs or 'N/A'}. State: {doc_meta.get('state', 'N/A')}.",
                        "score": 0.88,
                        "metadata": {"subsidiary": doc_meta.get("subsidiary")}
                    })
            return chunks[:top_k]

        # General multi-document search across search index
        search_res = search_documents(
            query=query,
            subsidiary=filters.get("subsidiary") if filters else None,
            state=filters.get("state") if filters else None,
            financial_year=filters.get("financialYear") if filters else None,
            category=filters.get("category") if filters else None,
            limit=top_k
        )
        results_list = search_res if isinstance(search_res, list) else search_res.get("results", [])
        for idx, item in enumerate(results_list):
            doc_id = item.get("documentId", f"doc_{idx}")
            doc_title = item.get("reportTitle") or item.get("fileName", doc_id)
            summary = item.get("summary") or item.get("highlightSnippet") or "Validated statutory coal mining record."

            chunks.append({
                "chunkId": f"{doc_id}_c1",
                "documentId": doc_id,
                "documentTitle": doc_title,
                "section": item.get("category", "Mining Return"),
                "text": summary,
                "score": round(max(0.6, 1.0 - (idx * 0.08)), 2),
                "metadata": {
                    "subsidiary": item.get("subsidiary"),
                    "mineName": item.get("mineName"),
                    "financialYear": item.get("financialYear"),
                    "validationScore": item.get("validationScore"),
                    "coalProduction": item.get("coalProduction")
                }
            })

        return chunks[:top_k]


# Global singleton instance
rag_adapter = RAGAdapter()
