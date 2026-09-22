import os
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings
from app.services.document_loader import extract_document_text

router = APIRouter()
logger = logging.getLogger("ai_service.ingest")


class IngestRequest(BaseModel):
    documentId: str
    filePath: str
    mimeType: Optional[str] = ""
    originalName: Optional[str] = None
    storedName: Optional[str] = None
    size: Optional[int] = None
    uploadedAt: Optional[str] = None


class IngestResponse(BaseModel):
    status: str
    documentId: str
    processingTime: Optional[float] = None
    pageCount: Optional[int] = None
    confidence: Optional[float] = None
    loaderUsed: Optional[str] = None
    processingStartedAt: Optional[str] = None
    processingCompletedAt: Optional[str] = None
    language: Optional[str] = None
    textPreview: Optional[str] = None
    errorCode: Optional[str] = None
    errorMessage: Optional[str] = None


@router.post("/ingest", response_model=IngestResponse, tags=["Ingestion"])
async def ingest_document(payload: IngestRequest):
    """
    Phase 4: Document Ingestion & Text Extraction Endpoint.
    Extracts text, persists it to internal storage, and returns metadata only
    (omits full text from HTTP response per Phase 4 refinement specifications).
    """
    logger.info(f"Received ingest request for documentId: {payload.documentId}, path: {payload.filePath}")
    try:
        result = extract_document_text(
            document_id=payload.documentId,
            file_path=payload.filePath,
            mime_type=payload.mimeType or ""
        )
        return IngestResponse(
            status="OCR Complete",
            documentId=payload.documentId,
            processingTime=result.get("processingTime"),
            pageCount=result.get("pageCount"),
            confidence=result.get("confidence"),
            loaderUsed=result.get("loaderUsed"),
            processingStartedAt=result.get("processingStartedAt"),
            processingCompletedAt=result.get("processingCompletedAt"),
            language=result.get("language"),
            textPreview=result.get("textPreview"),
            errorCode=None,
            errorMessage=None
        )
    except Exception as exc:
        error_code = getattr(exc, "error_code", "UNKNOWN_ERROR")
        logger.error(f"Text extraction failed for documentId {payload.documentId} [{error_code}]: {str(exc)}", exc_info=True)
        return IngestResponse(
            status="Failed",
            documentId=payload.documentId,
            processingTime=None,
            pageCount=None,
            confidence=None,
            loaderUsed=None,
            errorCode=error_code,
            errorMessage=str(exc)
        )


@router.get("/ingest/{document_id}/text", tags=["Ingestion"])
async def get_extracted_text(document_id: str):
    """
    Internal retrieval endpoint for stored text.
    Used by downstream pipeline phases or preview components.
    """
    storage_path = os.path.join(settings.TEXT_STORAGE_DIR, f"{document_id}.txt")
    if not os.path.exists(storage_path):
        raise HTTPException(status_code=404, detail="Extracted text not found for this document.")

    with open(storage_path, "r", encoding="utf-8") as f:
        text = f.read()

    return {
        "documentId": document_id,
        "text": text,
        "preview": text[:500],
        "length": len(text)
    }


