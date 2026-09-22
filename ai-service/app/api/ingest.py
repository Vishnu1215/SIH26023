from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class IngestRequest(BaseModel):
    documentId: str
    originalName: str
    storedName: str
    mimeType: str
    size: int
    uploadedAt: str


class IngestResponse(BaseModel):
    status: str
    stage: str
    documentId: str


@router.post("/ingest", response_model=IngestResponse, tags=["Ingestion"])
async def ingest_document(payload: IngestRequest):
    """
    Mock ingest endpoint for Phase 3.
    Receives uploaded document metadata from Express server.
    (No OCR, No AI, No parsing per Phase 3 specifications)
    """
    return IngestResponse(
        status="received",
        stage="queued",
        documentId=payload.documentId
    )
