from typing import Optional, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db

class OCRRepository:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self._db = db

    @property
    def db(self) -> AsyncIOMotorDatabase:
        return self._db if self._db is not None else get_db()

    @property
    def collection(self):
        return self.db["ocr_results"]

    async def upsert_ocr_result(
        self,
        document_id: str,
        pages: int = 1,
        extracted_text: str = "",
        language: str = "eng",
        processing_time: float = 0.0,
        ocr_engine: str = "PyMuPDF + Tesseract OCR",
        extra: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Insert or update OCR extraction result in MongoDB."""
        payload = {
            "documentId": document_id,
            "pages": pages,
            "extractedText": extracted_text,
            "language": language,
            "processingTime": processing_time,
            "ocrEngine": ocr_engine,
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

    async def get_ocr_result(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve OCR result for a document."""
        return await self.collection.find_one({"documentId": document_id}, {"_id": 0})

    async def delete_ocr_result(self, document_id: str) -> bool:
        res = await self.collection.delete_one({"documentId": document_id})
        return res.deleted_count > 0


def get_ocr_repository() -> OCRRepository:
    return OCRRepository()
