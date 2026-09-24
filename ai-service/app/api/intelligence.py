"""
FastAPI Router for Phase 9: Document Intelligence & Search Indexing.
Exposes endpoints for document intelligence processing, metadata retrieval,
and fast deterministic multi-attribute search.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.document_intelligence import (
    process_document_intelligence,
    batch_process_all_documents
)
from app.services.search_index import (
    get_document_intelligence,
    search_documents,
    rebuild_search_index,
    get_all_document_intelligence
)

router = APIRouter(tags=["Document Intelligence"])


class ProcessIntelligenceRequest(BaseModel):
    documentId: str = Field(..., description="Document identifier or 'all' to batch process")
    extractedText: Optional[str] = Field(default="", description="Optional OCR text content")
    filename: Optional[str] = Field(default="", description="Original file name")


@router.post("/intelligence/process", summary="Process document intelligence and update search index")
async def api_process_intelligence(req: ProcessIntelligenceRequest):
    try:
        if req.documentId.strip().lower() == "all":
            result = batch_process_all_documents()
            return {
                "status": "success",
                "message": f"Batch processed intelligence for {result['processedCount']} documents.",
                "data": result
            }

        payload = process_document_intelligence(
            document_id=req.documentId,
            extracted_text=req.extractedText or "",
            filename=req.filename or ""
        )
        return {
            "status": "success",
            "message": "Document intelligence generated successfully.",
            "data": payload
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intelligence processing failed: {str(e)}")


@router.get("/intelligence/{document_id}", summary="Get semantic intelligence metadata for document")
async def api_get_intelligence(document_id: str):
    data = get_document_intelligence(document_id)
    if not data:
        # Fallback: attempt to generate on-the-fly if structured record exists
        try:
            data = process_document_intelligence(document_id=document_id)
        except Exception:
            raise HTTPException(status_code=404, detail=f"Intelligence record for '{document_id}' not found.")
    
    return {
        "status": "success",
        "data": data
    }


@router.get("/search", summary="Search documents via inverted JSON index and deterministic scoring")
async def api_search(
    query: Optional[str] = Query(default="", description="Search keywords, mine names, entities"),
    mine: Optional[str] = Query(default="", description="Filter by mine name"),
    subsidiary: Optional[str] = Query(default="", description="Filter by subsidiary (SECL, MCL, etc.)"),
    state: Optional[str] = Query(default="", description="Filter by state"),
    financialYear: Optional[str] = Query(default="", description="Filter by financial year"),
    category: Optional[str] = Query(default="", description="Filter by document category"),
    topic: Optional[str] = Query(default="", description="Filter by mining topic"),
    limit: Optional[int] = Query(default=30, ge=1, le=100)
):
    try:
        results = search_documents(
            query=query or "",
            mine=mine or "",
            subsidiary=subsidiary or "",
            state=state or "",
            financial_year=financialYear or "",
            category=category or "",
            topic=topic or "",
            limit=limit or 30
        )
        return {
            "status": "success",
            "count": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/search/reindex", summary="Rebuild pure JSON search index across all documents")
async def api_reindex_search():
    try:
        index_data = rebuild_search_index()
        return {
            "status": "success",
            "message": "Search index successfully rebuilt.",
            "totalDocuments": index_data.get("totalDocuments", 0),
            "lastIndexedAt": index_data.get("lastIndexedAt")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search reindex failed: {str(e)}")
