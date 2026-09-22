import os
import time
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.services.information_extractor import extract_structured_information
from app.services.json_storage import load_structured_data, structured_data_exists

router = APIRouter()
logger = logging.getLogger("ai_service.extract")


class ExtractRequest(BaseModel):
    documentId: str
    text: Optional[str] = None
    filename: Optional[str] = None


class ExtractResponse(BaseModel):
    status: str
    documentId: str
    structuredRecordCount: int
    structuredDataAvailable: bool
    extractionTime: float
    data: Optional[Dict[str, Any]] = None


@router.post("/extract", response_model=ExtractResponse, tags=["Structured Information Extraction"])
async def extract_fields(payload: ExtractRequest):
    """
    Phase 5: Structured Information Extraction & Normalization Endpoint.
    Converts extracted document text into normalized JSON mining records
    and persists output to storage/structured_data/{documentId}.json.
    """
    start_time = time.time()
    document_id = payload.documentId

    # Retrieve extracted text either from request body or internal storage
    text = payload.text
    if not text:
        text_file = os.path.join(settings.TEXT_STORAGE_DIR, f"{document_id}.txt")
        if os.path.exists(text_file):
            with open(text_file, "r", encoding="utf-8") as f:
                text = f.read()
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Extracted text not found for document '{document_id}'. Run OCR/Ingest first."
            )

    try:
        structured_data = extract_structured_information(
            document_id=document_id,
            text=text,
            filename=payload.filename or ""
        )
        extraction_time = round(time.time() - start_time, 3)

        return ExtractResponse(
            status="success",
            documentId=document_id,
            structuredRecordCount=1,
            structuredDataAvailable=True,
            extractionTime=extraction_time,
            data=structured_data
        )
    except Exception as exc:
        logger.error(f"Structured extraction failed for {document_id}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Information extraction failed: {str(exc)}"
        )


@router.get("/extract/{document_id}", tags=["Structured Information Extraction"])
async def get_structured_data(document_id: str):
    """
    Retrieve persisted structured JSON record from storage/structured_data/{documentId}.json.
    """
    data = load_structured_data(document_id)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Structured data not found for document '{document_id}'."
        )

    return {
        "status": "success",
        "documentId": document_id,
        "structuredDataAvailable": True,
        "data": data
    }
