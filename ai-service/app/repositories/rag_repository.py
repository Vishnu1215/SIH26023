import math
import re
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db

EMBEDDING_DIM = 128

def generate_text_embedding(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    """
    Generates a deterministic normalized embedding vector from text.
    Provides fast, standalone vector similarity without downloading external 2GB weights.
    """
    if not text:
        return [0.0] * dim
    
    vec = [0.0] * dim
    words = re.findall(r'\b\w+\b', text.lower())
    if not words:
        return [0.0] * dim

    for w in words:
        # Hash word into bucket
        h = 0
        for char in w:
            h = (h * 31 + ord(char)) % 1000000007
        idx = h % dim
        vec[idx] += 1.0

    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [round(x / norm, 6) for x in vec]
    return vec


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    return max(0.0, min(1.0, dot))


class RAGRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        return self._db if self._db is not None else get_db()

    @property
    def collection(self):
        return self.db["rag_chunks"]

    async def save_chunks(self, document_id: str, chunks: List[Dict[str, Any]]) -> int:
        """
        Store all document chunks inside MongoDB rag_chunks collection.
        Replaces any existing chunks for this document.
        """
        await self.collection.delete_many({"documentId": document_id})
        if not chunks:
            return 0

        docs_to_insert = []
        for idx, chunk in enumerate(chunks):
            text = chunk.get("text", "").strip()
            embedding = chunk.get("embedding")
            if not embedding:
                embedding = generate_text_embedding(text)

            meta = chunk.get("metadata", {})
            meta.setdefault("documentId", document_id)

            docs_to_insert.append({
                "documentId": document_id,
                "chunkNumber": chunk.get("chunkNumber", idx + 1),
                "text": text,
                "embedding": embedding,
                "metadata": meta,
                "createdAt": datetime.now(timezone.utc).isoformat()
            })

        if docs_to_insert:
            res = await self.collection.insert_many(docs_to_insert)
            return len(res.inserted_ids)
        return 0

    async def get_chunks_by_document(self, document_id: str) -> List[Dict[str, Any]]:
        """Retrieve all chunks for a document sorted by chunkNumber."""
        cursor = self.collection.find({"documentId": document_id}, {"_id": 0}).sort("chunkNumber", 1)
        return await cursor.to_list(length=1000)

    async def search_chunks(
        self,
        query: str,
        query_embedding: Optional[List[float]] = None,
        top_k: int = 5,
        document_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search MongoDB rag_chunks collection using vector similarity and metadata filtering.
        Retrieves top matching chunks directly from MongoDB without filesystem lookup.
        """
        if not query_embedding:
            query_embedding = generate_text_embedding(query)

        query_filter: Dict[str, Any] = {}
        if document_id:
            query_filter["documentId"] = document_id
        if filters:
            for k, v in filters.items():
                if v:
                    query_filter[f"metadata.{k}"] = v

        cursor = self.collection.find(query_filter, {"_id": 0})
        candidate_chunks = await cursor.to_list(length=200)

        # Score candidates with cosine similarity + text keyword bonus
        scored = []
        query_terms = set(re.findall(r'\b\w+\b', query.lower()))

        for ch in candidate_chunks:
            emb = ch.get("embedding", [])
            vec_sim = cosine_similarity(query_embedding, emb)

            # Keyword overlap boost
            text_lower = ch.get("text", "").lower()
            overlap = sum(1 for term in query_terms if term in text_lower)
            boost = (overlap / max(1, len(query_terms))) * 0.3 if query_terms else 0.0

            total_score = min(1.0, vec_sim + boost)
            scored.append({
                "chunkId": f"{ch.get('documentId')}_chunk_{ch.get('chunkNumber')}",
                "documentId": ch.get("documentId"),
                "chunkNumber": ch.get("chunkNumber"),
                "text": ch.get("text"),
                "score": round(total_score, 4),
                "metadata": ch.get("metadata", {})
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    async def count_chunks(self) -> int:
        return await self.collection.count_documents({})


def get_rag_repository() -> RAGRepository:
    return RAGRepository()
