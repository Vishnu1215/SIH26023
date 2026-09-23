import os
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings
from app.services.document_loader import extract_document_text
from app.services.information_extractor import extract_structured_information
from app.services.validation_engine import validate_document

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
    # Phase 5 Structured Information fields
    structuredDataAvailable: bool = False
    structuredRecordCount: int = 0
    structuredData: Optional[Dict[str, Any]] = None
    # Phase 6 Validation fields
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
    Phase 4 & 5: Document Ingestion, Text Extraction & Structured Information Pipeline.
    Extracts text, persists it to internal storage, automatically normalizes structured records,
    and returns complete metadata and structured data summary.
    """
    logger.info(f"Received ingest request for documentId: {payload.documentId}, path: {payload.filePath}")
    try:
        result = extract_document_text(
            document_id=payload.documentId,
            file_path=payload.filePath,
            mime_type=payload.mimeType or ""
        )

        # Phase 5: Automatically extract and normalize structured information
        structured_data = None
        structured_data_available = False
        structured_record_count = 0

        try:
            structured_data = extract_structured_information(
                document_id=payload.documentId,
                text=result.get("text", ""),
                filename=payload.originalName or ""
            )
            structured_data_available = True
            structured_record_count = 1
            logger.info(f"Structured information extracted successfully for {payload.documentId}")
        except Exception as struct_err:
            logger.warning(f"Structured extraction warning for {payload.documentId}: {struct_err}")

        # Phase 6: Automatically trigger Validation Engine & Discrepancy Detection
        validation_report = None
        try:
            validation_report = validate_document(
                document_id=payload.documentId,
                structured_data=structured_data or {},
                confidence=result.get("confidence"),
                filename=payload.originalName or "",
                file_hash=payload.fileHash,
                existing_documents=payload.existingDocuments
            )
            logger.info(f"Validation completed for {payload.documentId} with status: {validation_report['validationStatus']}, score: {validation_report['validationScore']}")
        except Exception as val_err:
            logger.warning(f"Validation warning for {payload.documentId}: {val_err}")

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
            errorMessage=None,
            structuredDataAvailable=structured_data_available,
            structuredRecordCount=structured_record_count,
            structuredData=structured_data,
            # Phase 6 Validation outputs
            validationStatus=validation_report.get("validationStatus") if validation_report else "Pending",
            validationScore=validation_report.get("validationScore") if validation_report else None,
            validationSummary=validation_report.get("validationSummary") if validation_report else None,
            validationMessages=validation_report.get("validationMessages") if validation_report else [],
            messages=validation_report.get("validationMessages") if validation_report else [],
            rulesTriggered=validation_report.get("rulesTriggered") if validation_report else [],
            errorCount=validation_report.get("errorCount", 0) if validation_report else 0,
            warningCount=validation_report.get("warningCount", 0) if validation_report else 0,
            infoCount=validation_report.get("infoCount", 0) if validation_report else 0,
            validationTime=validation_report.get("validationTime") if validation_report else None,
            validatedAt=validation_report.get("validatedAt") if validation_report else None
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


