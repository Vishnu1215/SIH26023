"""
FastAPI Router for Document Lifecycle, Ingestion, and Full Aggregated Details.
All endpoints use Dependency Injection with Motor Async MongoDB Driver.
"""

import os
import shutil
import uuid
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from app.repositories import (
    get_document_repository,
    DocumentRepository,
    get_analytics_repository,
    AnalyticsRepository
)
from app.services.document_service import document_service
from app.schemas.requests import DocumentCreateSchema
from app.schemas.responses import FullDocumentResponse

router = APIRouter(prefix="/documents", tags=["Document Lifecycle & Intelligence"])
logger = logging.getLogger("ai_service.documents_router")


@router.get("", summary="Retrieve all documents from MongoDB")
async def list_documents(
    category: Optional[str] = Query(default=None),
    subsidiary: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Retrieve documents directly from MongoDB 'documents' collection."""
    filter_q: Dict[str, Any] = {}
    if category and category.lower() != "all":
        filter_q["category"] = category
    if subsidiary and subsidiary.lower() != "all":
        filter_q["subsidiary"] = {"$regex": f"^{subsidiary}$", "$options": "i"}
    if status and status.lower() != "all":
        filter_q["status"] = status

    repo = DocumentRepository(db)
    docs = await repo.list_documents(filter_query=filter_q, skip=skip, limit=limit)
    total = await repo.count_documents(filter_query=filter_q)
    return {
        "success": True,
        "count": len(docs),
        "total": total,
        "documents": docs
    }


@router.get("/{document_id}", summary="Retrieve single document metadata from MongoDB")
async def get_document(
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    repo = DocumentRepository(db)
    doc = await repo.get_document_by_id(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found in MongoDB.")
    return {
        "success": True,
        "document": doc
    }


@router.get("/{document_id}/full", response_model=FullDocumentResponse, summary="Retrieve complete document intelligence from MongoDB")
async def get_full_document(
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Every section reads directly from MongoDB:
    Document Metadata, OCR Information, Structured JSON, Validation Summary,
    Validation Messages, Executive Summary, Analytics, Production Summary, Data Quality, Topics.
    """
    full_data = await document_service.get_full_document_details(document_id)
    if not full_data:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found in MongoDB.")
    return full_data


@router.post("/upload", summary="Upload file and run end-to-end ingestion into MongoDB")
async def upload_document_api(
    file: UploadFile = File(...),
    category: Optional[str] = Form(default="01_production"),
    subsidiary: Optional[str] = Form(default=None),
    financialYear: Optional[str] = Form(default=None),
    mineName: Optional[str] = Form(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Upload PDF/file -> Save to uploads -> Trigger pipeline:
    OCR -> Metadata -> Validation -> MongoDB -> Return response.
    """
    try:
        doc_id = str(uuid.uuid4())
        filename = file.filename or f"doc_{doc_id}.pdf"
        
        # Save file to storage/uploads
        from app.core.config import settings
        upload_dir = os.path.join(settings.BASE_DIR, "storage", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{doc_id}_{filename}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Ingestion pipeline with MongoDB persistence
        result = await document_service.ingest_document_pipeline(
            document_id=doc_id,
            file_path=file_path,
            mime_type=file.content_type or "application/pdf",
            original_name=filename,
            stored_name=os.path.basename(file_path),
            size=os.path.getsize(file_path),
            category=category,
            subsidiary=subsidiary,
            financial_year=financialYear,
            mine_name=mineName
        )
        return {
            "success": True,
            "message": "Document uploaded, processed, and persisted to MongoDB Atlas successfully.",
            "documentId": doc_id,
            "result": result
        }
    except Exception as e:
        logger.error(f"Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload and ingestion failed: {str(e)}")


@router.post("/load-sample", summary="Load representative sample dataset into MongoDB")
async def load_sample_dataset_api(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Registers sample dataset into MongoDB documents collection."""
    from app.core.config import settings
    base_dir = os.path.dirname(settings.BASE_DIR)
    sample_dir = os.path.join(base_dir, "sample-data")

    if not os.path.exists(sample_dir):
        raise HTTPException(status_code=404, detail="sample-data directory not found.")

    repo = DocumentRepository(db)
    registered = []
    
    for root, dirs, files in os.walk(sample_dir):
        for f in files:
            if f.endswith(('.pdf', '.docx', '.xlsx', '.csv')):
                f_path = os.path.join(root, f)
                parent_folder = os.path.basename(root).lower()
                existing = await db["documents"].find_one({"fileName": f})
                if not existing:
                    new_id = str(uuid.uuid4())
                    doc_item = {
                        "documentId": new_id,
                        "fileName": f,
                        "originalName": f,
                        "storedName": f,
                        "uploadTime": os.path.getctime(f_path),
                        "reportType": "Statutory Sample Document",
                        "financialYear": "FY 2023-24",
                        "issuingOrganization": "Ministry of Coal",
                        "subsidiary": "CIL",
                        "mineName": "Sample Asset",
                        "mineType": "Mixed",
                        "state": "National",
                        "district": None,
                        "category": parent_folder,
                        "status": "Uploaded",
                        "filePath": f_path,
                        "uploadStatus": "Success",
                        "validationScore": 100,
                        "validationStatus": "Pending"
                    }
                    await repo.upsert_document(doc_item)
                    registered.append(doc_item)

    all_docs = await repo.list_documents(limit=500)
    return {
        "success": True,
        "message": f"Sample dataset synchronized with MongoDB Atlas ({len(registered)} new).",
        "loadedCount": len(registered),
        "totalCount": len(all_docs),
        "documents": all_docs
    }


@router.post("/{document_id}/process", summary="Trigger OCR text extraction and store to MongoDB")
async def process_document_api(
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    repo = DocumentRepository(db)
    doc = await repo.get_document_by_id(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found.")

    file_path = doc.get("filePath")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="Physical file path not found for processing.")

    result = await document_service.ingest_document_pipeline(
        document_id=document_id,
        file_path=file_path,
        mime_type=doc.get("mimeType", "application/pdf"),
        original_name=doc.get("fileName"),
        category=doc.get("category"),
        subsidiary=doc.get("subsidiary"),
        financial_year=doc.get("financialYear"),
        mine_name=doc.get("mineName")
    )
    return {
        "success": True,
        "message": "Document processed and updated in MongoDB.",
        "result": result
    }
