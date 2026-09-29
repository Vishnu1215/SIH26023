"""
RAG Adapter: Grounded retrieval interface for context synthesis backed by MongoDB Atlas.
Retrieves top matching evidence chunks directly from the 'rag_chunks' collection.
"""

import re
import math
import logging
from typing import Dict, Any, List, Optional
from app.database import get_sync_db

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 128

def generate_embedding(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    if not text:
        return [0.0] * dim
    vec = [0.0] * dim
    words = re.findall(r'\b\w+\b', text.lower())
    if not words:
        return [0.0] * dim
    for w in words:
        h = 0
        for char in w:
            h = (h * 31 + ord(char)) % 1000000007
        vec[h % dim] += 1.0
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [round(x / norm, 6) for x in vec]
    return vec


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    return max(0.0, min(1.0, dot))


class RAGAdapter:
    def __init__(self):
        self.backend: str = "mongodb_rag_chunks"
        self.embedding_dimension: int = EMBEDDING_DIM
        self.vector_store_ready: bool = True

    def get_status(self) -> Dict[str, Any]:
        """Returns RAG adapter configuration and readiness status."""
        return {
            "backend": self.backend,
            "vectorStoreReady": self.vector_store_ready,
            "embeddingDimension": self.embedding_dimension,
            "retrievalMethod": "MongoDB Atlas Vector & Text Chunk Collection",
            "futureBackendsSupported": ["MongoDB Atlas Vector Search", "FAISS", "pgvector"]
        }

    def retrieve_relevant_chunks(
        self,
        query: str,
        top_k: int = 5,
        document_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top-k most relevant evidence chunks for a query from MongoDB 'rag_chunks'.
        No filesystem lookup.
        """
        try:
            db = get_sync_db()
            query_filter: Dict[str, Any] = {}
            if document_id:
                query_filter["documentId"] = document_id
            if filters:
                for k, v in filters.items():
                    if v:
                        query_filter[f"metadata.{k}"] = v

            cursor = db["rag_chunks"].find(query_filter, {"_id": 0})
            candidate_chunks = list(cursor)

            if not candidate_chunks:
                # If specific document requested had no chunks, fallback to structured summary in MongoDB
                if document_id:
                    doc = db["structured_records"].find_one({"documentId": document_id}, {"_id": 0})
                    if doc and doc.get("summary"):
                        return [{
                            "chunkId": f"{document_id}_summary",
                            "documentId": document_id,
                            "documentTitle": doc.get("metadata", {}).get("fileName", document_id),
                            "section": "Executive Summary",
                            "text": doc.get("summary"),
                            "score": 0.95,
                            "metadata": doc.get("metadata", {})
                        }]
                return []

            query_vec = generate_embedding(query)
            query_terms = set(re.findall(r'\b\w+\b', query.lower()))

            scored = []
            for ch in candidate_chunks:
                emb = ch.get("embedding", [])
                vec_sim = cosine_similarity(query_vec, emb)

                text = ch.get("text", "")
                text_lower = text.lower()
                overlap = sum(1 for term in query_terms if term in text_lower)
                boost = (overlap / max(1, len(query_terms))) * 0.35 if query_terms else 0.0

                total_score = min(1.0, vec_sim + boost)
                scored.append({
                    "chunkId": f"{ch.get('documentId')}_c{ch.get('chunkNumber', 1)}",
                    "documentId": ch.get("documentId"),
                    "chunkNumber": ch.get("chunkNumber", 1),
                    "documentTitle": ch.get("metadata", {}).get("fileName") or ch.get("documentId"),
                    "section": ch.get("metadata", {}).get("section", "Statutory Report"),
                    "text": text,
                    "score": round(total_score, 4),
                    "metadata": ch.get("metadata", {})
                })

            scored.sort(key=lambda x: x["score"], reverse=True)
            return scored[:top_k]
        except Exception as e:
            logger.error(f"Error retrieving RAG chunks from MongoDB: {e}", exc_info=True)
            return []


rag_adapter = RAGAdapter()
