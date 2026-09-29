from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db

class StructuredRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        return self._db if self._db is not None else get_db()

    @property
    def collection(self):
        return self.db["structured_records"]

    async def upsert_structured_record(
        self,
        document_id: str,
        normalized_json: Optional[Dict[str, Any]] = None,
        entities: Optional[Dict[str, Any]] = None,
        extracted_topics: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        summary: str = "",
        extra: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Insert or update structured factual records extracted from document."""
        payload = {
            "documentId": document_id,
            "normalizedJson": normalized_json or {},
            "entities": entities or {},
            "extractedTopics": extracted_topics or [],
            "metadata": metadata or {},
            "summary": summary or "",
            "extractedAt": datetime.now(timezone.utc).isoformat()
        }
        if extra:
            payload.update(extra)

        await self.collection.update_one(
            {"documentId": document_id},
            {"$set": payload},
            upsert=True
        )
        return payload

    async def get_structured_record(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve structured record for a document."""
        return await self.collection.find_one({"documentId": document_id}, {"_id": 0})

    async def list_all_records(self, limit: int = 200) -> List[Dict[str, Any]]:
        """List all structured records across the database."""
        cursor = self.collection.find({}, {"_id": 0}).limit(limit)
        return await cursor.to_list(length=limit)

    async def count_records(self) -> int:
        return await self.collection.count_documents({})


def get_structured_repository() -> StructuredRepository:
    return StructuredRepository()
