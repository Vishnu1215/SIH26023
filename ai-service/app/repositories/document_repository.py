from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database, get_db

class DocumentRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        return self._db if self._db is not None else get_db()

    @property
    def collection(self):
        return self.db["documents"]

    async def upsert_document(self, document_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert or update a document metadata record in MongoDB."""
        doc_id = document_data.get("documentId")
        if not doc_id:
            raise ValueError("documentId is required for document upsert.")

        clean_doc = dict(document_data)
        clean_doc.pop("_id", None)
        if "updatedAt" not in clean_doc:
            clean_doc["updatedAt"] = datetime.now(timezone.utc).isoformat()
        if "uploadTime" not in clean_doc:
            clean_doc["uploadTime"] = clean_doc.get("uploadedAt") or datetime.now(timezone.utc).isoformat()

        await self.collection.update_one(
            {"documentId": doc_id},
            {"$set": clean_doc},
            upsert=True
        )
        return await self.get_document_by_id(doc_id)

    async def get_document_by_id(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a document by its documentId."""
        doc = await self.collection.find_one({"documentId": document_id}, {"_id": 0})
        return doc

    async def list_documents(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        sort_by: str = "uploadTime",
        sort_dir: int = -1,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List documents with optional filtering and pagination."""
        query = filter_query or {}
        cursor = self.collection.find(query, {"_id": 0}).sort(sort_by, sort_dir).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    async def count_documents(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        """Count total matching documents in collection."""
        return await self.collection.count_documents(filter_query or {})

    async def update_status(self, document_id: str, status: str, updates: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Update workflow status and optional arbitrary properties."""
        set_fields = {"status": status, "updatedAt": datetime.now(timezone.utc).isoformat()}
        if updates:
            set_fields.update(updates)

        result = await self.collection.update_one(
            {"documentId": document_id},
            {"$set": set_fields}
        )
        if result.matched_count == 0:
            return None
        return await self.get_document_by_id(document_id)

    async def delete_document(self, document_id: str) -> bool:
        """Remove a document from collection."""
        res = await self.collection.delete_one({"documentId": document_id})
        return res.deleted_count > 0


def get_document_repository() -> DocumentRepository:
    """Dependency injection helper."""
    return DocumentRepository()
