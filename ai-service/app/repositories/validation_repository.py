from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db

class ValidationRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        return self._db if self._db is not None else get_db()

    @property
    def collection(self):
        return self.db["validation_results"]

    async def upsert_validation_result(
        self,
        document_id: str,
        score: int = 100,
        status: str = "Valid",
        errors: int = 0,
        warnings: int = 0,
        validation_messages: Optional[List[Dict[str, Any]]] = None,
        executed_rules: Optional[List[str]] = None,
        extra: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Insert or update validation report in MongoDB."""
        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "documentId": document_id,
            "score": score,
            "status": status,
            "errors": errors,
            "warnings": warnings,
            "validationMessages": validation_messages or [],
            "executedRules": executed_rules or [],
            "timestamp": now_iso
        }
        if extra:
            payload.update(extra)

        await self.collection.update_one(
            {"documentId": document_id},
            {"$set": payload},
            upsert=True
        )
        return payload

    async def get_validation_result(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve validation result for a document."""
        return await self.collection.find_one({"documentId": document_id}, {"_id": 0})

    async def list_validation_results(self, limit: int = 200) -> List[Dict[str, Any]]:
        cursor = self.collection.find({}, {"_id": 0}).limit(limit)
        return await cursor.to_list(length=limit)

    async def get_status_counts(self) -> Dict[str, int]:
        """Aggregate counts for Valid, Warning, Error documents."""
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        results = await self.collection.aggregate(pipeline).to_list(length=20)
        counts = {"Valid": 0, "Warning": 0, "Error": 0, "Pending": 0}
        for item in results:
            k = item.get("_id")
            if k in counts:
                counts[k] = item.get("count", 0)
            elif k:
                counts[k] = item.get("count", 0)
        return counts


def get_validation_repository() -> ValidationRepository:
    return ValidationRepository()
