from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db

class ChatRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        return self._db if self._db is not None else get_db()

    @property
    def collection(self):
        return self.db["chat_history"]

    async def save_interaction(
        self,
        question: str,
        answer: str,
        document_id: Optional[str] = None,
        query_type: str = "rag",
        confidence: float = 1.0,
        evidence: Optional[List[Dict[str, Any]]] = None,
        documents_used: Optional[List[Dict[str, Any]]] = None,
        response_time_ms: float = 0.0,
        use_llm: bool = False
    ) -> Dict[str, Any]:
        """Save a Q&A interaction to MongoDB chat_history."""
        record = {
            "documentId": document_id,
            "question": question,
            "answer": answer,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "queryType": query_type,
            "confidence": confidence,
            "evidence": evidence or [],
            "documentsUsed": documents_used or [],
            "responseTimeMs": round(response_time_ms, 2),
            "useLLM": use_llm
        }
        res = await self.collection.insert_one(record)
        record["id"] = str(res.inserted_id)
        record.pop("_id", None)
        return record

    async def get_history(self, document_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve recent interactions (LIFO order)."""
        query: Dict[str, Any] = {}
        if document_id:
            query["documentId"] = document_id

        cursor = self.collection.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def clear_history(self, document_id: Optional[str] = None) -> bool:
        """Clear chat history in MongoDB."""
        query: Dict[str, Any] = {}
        if document_id:
            query["documentId"] = document_id
        res = await self.collection.delete_many(query)
        return res.acknowledged


def get_chat_repository() -> ChatRepository:
    return ChatRepository()
