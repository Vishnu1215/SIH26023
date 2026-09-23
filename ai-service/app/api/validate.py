import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.validation_engine import validate_document
from app.services.validation_storage import load_validation_report
from app.services.json_storage import load_structured_data

router = APIRouter()
logger = logging.getLogger("ai_service.validate")


class ValidateRequest(BaseModel):
    documentId: str
    structuredData: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    filename: Optional[str] = None
    fileHash: Optional[str] = None
    existingDocuments: Optional[List[Dict[str, Any]]] = None


class ValidateResponse(BaseModel):
    status: str
    documentId: str
    validationStatus: str
    validationScore: int
    validationSummary: str
    validationMessages: List[Dict[str, Any]]
    messages: Optional[List[Dict[str, Any]]] = None
    rulesTriggered: List[str]
    errorCount: int
    warningCount: int
    infoCount: int
    validationTime: float
    validatedAt: str
    validationHistory: Optional[List[Dict[str, Any]]] = None


@router.post("/validate", response_model=ValidateResponse, tags=["Validation Engine"])
async def validate_document_endpoint(payload: ValidateRequest):
    """
    Phase 6: Deterministic Validation Engine & Discrepancy Detection.
    Evaluates rules VAL001 to VAL010, calculates score & status,
    and returns complete discrepancy report with validation history.
    """
    document_id = payload.documentId

    # If structured data was not supplied directly in request, retrieve from storage
    structured_data = payload.structuredData
    if not structured_data:
        structured_data = load_structured_data(document_id)

    try:
        report = validate_document(
            document_id=document_id,
            structured_data=structured_data or {},
            confidence=payload.confidence,
            filename=payload.filename or "",
            file_hash=payload.fileHash,
            existing_documents=payload.existingDocuments
        )

        # Load updated report with history
        persisted = load_validation_report(document_id)
        history = persisted.get("validationHistory", []) if persisted else []

        return ValidateResponse(
            status="success",
            documentId=document_id,
            validationStatus=report["validationStatus"],
            validationScore=report["validationScore"],
            validationSummary=report["validationSummary"],
            validationMessages=report["validationMessages"],
            messages=report["validationMessages"],
            rulesTriggered=report["rulesTriggered"],
            errorCount=report["errorCount"],
            warningCount=report["warningCount"],
            infoCount=report["infoCount"],
            validationTime=report["validationTime"],
            validatedAt=report["validatedAt"],
            validationHistory=history
        )
    except Exception as exc:
        logger.error(f"Validation failed for document {document_id}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Validation execution failed: {str(exc)}"
        )


@router.get("/validate/{document_id}", tags=["Validation Engine"])
async def get_validation_report_endpoint(document_id: str):
    """
    Retrieve stored validation report JSON from storage/validation/{documentId}.json.
    """
    report = load_validation_report(document_id)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Validation report not found for document '{document_id}'."
        )

    return {
        "status": "success",
        "documentId": document_id,
        "data": report
    }
