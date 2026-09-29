import os
import logging
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.document_service import document_service
from app.repositories import get_ocr_repository

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
    fileHash: Optional[str] = None
    category: Optional[str] = None
    subsidiary: Optional[str] = None
    financialYear: Optional[str] = None
    mineName: Optional[str] = None
    existingDocuments: Optional[List[Dict[str, Any]]] = None


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

    structuredDataAvailable: bool = False
    structuredRecordCount: int = 0
    structuredData: Optional[Dict[str, Any]] = None

    validationStatus: Optional[str] = "Pending"
    validationScore: Optional[int] = None
    validationSummary: Optional[str] = None
    validationMessages: Optional[List[Dict[str, Any]]] = None
    messages: Optional[List[Dict[str, Any]]] = None
    rulesTriggered: Optional[List[str]] = None
    errorCount: int = 0
    warningCount: int = 0
    infoCount: int = 0
    validationTime: Optional[float] = None
    validatedAt: Optional[str] = None


@router.post("/ingest", response_model=IngestResponse, tags=["Ingestion"])
async def ingest_document(payload: IngestRequest):
    """
    Ingest Document via MongoDB Pipeline:
    PDF -> OCR -> Metadata Extraction -> Validation -> Store into MongoDB Atlas -> Return Response.
    MongoDB is the single source of truth.
    """
    logger.info(f"Ingesting document {payload.documentId} into MongoDB Atlas...")
    try:
        res = await document_service.ingest_document_pipeline(
            document_id=payload.documentId,
            file_path=payload.filePath,
            mime_type=payload.mimeType or "application/pdf",
            original_name=payload.originalName,
            stored_name=payload.storedName,
            size=payload.size,
            category=payload.category,
            subsidiary=payload.subsidiary,
            financial_year=payload.financialYear,
            mine_name=payload.mineName,
            file_hash=payload.fileHash,
            existing_documents=payload.existingDocuments
        )
        return IngestResponse(**res)
    except Exception as exc:
        logger.error(f"Ingestion pipeline failed for {payload.documentId}: {exc}", exc_info=True)
        return IngestResponse(
            status="Failed",
            documentId=payload.documentId,
            processingTime=None,
            pageCount=None,
            confidence=None,
            loaderUsed=None,
            processingStartedAt=None,
            processingCompletedAt=None,
            language=None,
            textPreview=None,
            errorCode="INGESTION_ERROR",
            errorMessage=str(exc)
        )


@router.get("/ingest/{document_id}/text", tags=["Ingestion"])
async def get_extracted_text(document_id: str):
    """Retrieve extracted OCR text directly from MongoDB 'ocr_results' collection."""
    ocr_repo = get_ocr_repository()
    ocr = await ocr_repo.get_ocr_result(document_id)
    if not ocr or not ocr.get("extractedText"):
        raise HTTPException(
            status_code=404,
            detail="Extracted text not found in MongoDB for this document."
        )

    text = ocr["extractedText"]
    return {
        "documentId": document_id,
        "text": text,
        "preview": text[:500],
        "length": len(text)
    }