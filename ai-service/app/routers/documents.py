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


@router.delete("/{document_id}", summary="Delete document and all associated records from MongoDB")
async def delete_document_api(
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc_repo = DocumentRepository(db)
    doc = await doc_repo.get_document_by_id(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found.")

    file_path = doc.get("filePath")
    if file_path and os.path.exists(file_path) and "uploads" in file_path:
        try:
            os.remove(file_path)
        except Exception as fe:
            logger.warning(f"Could not remove physical file {file_path}: {fe}")

    await db["documents"].delete_one({"documentId": document_id})
    await db["ocr_results"].delete_one({"documentId": document_id})
    await db["structured_records"].delete_one({"documentId": document_id})
    await db["validation_results"].delete_one({"documentId": document_id})
    await db["rag_chunks"].delete_many({"documentId": document_id})
    await db["report_reviews"].delete_many({"documentId": document_id})

    analytics_repo = AnalyticsRepository(db)
    try:
        metrics = await analytics_repo.calculate_dynamic_metrics()
        await analytics_repo.upsert_consolidated_dashboard(metrics)
    except Exception as ae:
        logger.warning(f"Failed to refresh analytics after deletion: {ae}")

    return {
        "success": True,
        "message": f"Document '{document_id}' deleted successfully from MongoDB."
    }


@router.post("/{document_id}/revalidate", summary="Re-run deterministic validation engine on document")
async def revalidate_document_api(
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = await db["documents"].find_one({"documentId": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found.")

    struct_rec = await db["structured_records"].find_one({"documentId": document_id}, {"_id": 0}) or {}
    ocr_rec = await db["ocr_results"].find_one({"documentId": document_id}, {"_id": 0}) or {}

    from app.services.validation_engine import validate_document
    existing_docs = await db["documents"].find({}, {"_id": 0, "documentId": 1, "fileName": 1, "sha256": 1}).to_list(1000)

    val_report = validate_document(
        document_id=document_id,
        structured_data=struct_rec,
        confidence=ocr_rec.get("confidence") or doc.get("confidence") or 0.95,
        filename=doc.get("fileName", "document.pdf"),
        file_hash=doc.get("sha256"),
        existing_documents=existing_docs
    )

    val_score = val_report.get("validationScore", 100)
    val_status = val_report.get("validationStatus", "Valid")

    from app.repositories import ValidationRepository
    val_repo = ValidationRepository(db)
    await val_repo.upsert_validation_result(
        document_id=document_id,
        score=val_score,
        status=val_status,
        errors=val_report.get("errorCount", 0),
        warnings=val_report.get("warningCount", 0),
        validation_messages=val_report.get("validationMessages", []),
        executed_rules=val_report.get("rulesTriggered", [])
    )

    await db["documents"].update_one(
        {"documentId": document_id},
        {"$set": {"validationScore": val_score, "validationStatus": val_status, "status": "Validated" if val_status in ["Valid", "Warning"] else "Error"}}
    )

    analytics_repo = AnalyticsRepository(db)
    try:
        metrics = await analytics_repo.calculate_dynamic_metrics()
        await analytics_repo.upsert_consolidated_dashboard(metrics)
    except Exception as ae:
        logger.warning(f"Failed to refresh analytics after revalidation: {ae}")

    updated_doc = await db["documents"].find_one({"documentId": document_id}, {"_id": 0})
    return {
        "success": True,
        "message": f"Document '{document_id}' revalidated successfully.",
        "validation": val_report,
        "document": updated_doc
    }


@router.get("/{document_id}/related", summary="Find related documents based on vector embedding similarity and topics")
async def get_related_documents_api(
    document_id: str,
    limit: int = Query(default=4, ge=1, le=20),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    target_chunks = await db["rag_chunks"].find({"documentId": document_id}, {"_id": 0}).to_list(100)
    target_doc = await db["documents"].find_one({"documentId": document_id}, {"_id": 0})
    if not target_doc:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found.")

    target_sub = target_doc.get("subsidiary", "")
    target_cat = target_doc.get("category", "")
    target_mine = target_doc.get("mineName", "")

    other_chunks = await db["rag_chunks"].find({"documentId": {"$ne": document_id}}, {"_id": 0}).to_list(1000)

    from app.services.rag_adapter import cosine_similarity, generate_embedding

    target_embs = [c.get("embedding") for c in target_chunks if c.get("embedding")]
    if not target_embs:
        target_embs = [generate_embedding(target_doc.get("reportTitle") or target_doc.get("fileName", ""))]

    doc_scores: Dict[str, Dict[str, Any]] = {}
    for ch in other_chunks:
        other_id = ch.get("documentId")
        if not other_id or other_id == document_id:
            continue
        ch_emb = ch.get("embedding", [])
        sims = [cosine_similarity(t_emb, ch_emb) for t_emb in target_embs if ch_emb]
        max_sim = max(sims) if sims else 0.0

        if other_id not in doc_scores:
            doc_scores[other_id] = {
                "maxSimilarity": max_sim,
                "title": ch.get("metadata", {}).get("fileName") or other_id,
                "subsidiary": ch.get("metadata", {}).get("subsidiary", "Unknown"),
                "category": ch.get("metadata", {}).get("category", "General"),
                "mine": ch.get("metadata", {}).get("mine", "N/A")
            }
        else:
            if max_sim > doc_scores[other_id]["maxSimilarity"]:
                doc_scores[other_id]["maxSimilarity"] = max_sim

    if len(doc_scores) < limit:
        all_others = await db["documents"].find({"documentId": {"$ne": document_id}}, {"_id": 0}).to_list(50)
        for od in all_others:
            oid = od.get("documentId")
            if oid not in doc_scores:
                bonus = 0.5
                if od.get("subsidiary") == target_sub:
                    bonus += 0.25
                if od.get("category") == target_cat:
                    bonus += 0.15
                doc_scores[oid] = {
                    "maxSimilarity": bonus,
                    "title": od.get("reportTitle") or od.get("fileName"),
                    "subsidiary": od.get("subsidiary", "Unknown"),
                    "category": od.get("category", "General"),
                    "mine": od.get("mineName", "N/A")
                }

    sorted_docs = sorted(doc_scores.items(), key=lambda x: x[1]["maxSimilarity"], reverse=True)[:limit]

    related = []
    for oid, info in sorted_docs:
        sim_pct = int(min(99, max(65, round(info["maxSimilarity"] * 100))))
        reasons = []
        if info["subsidiary"] == target_sub:
            reasons.append(f"Same Subsidiary ({target_sub})")
        if info["category"] == target_cat:
            reasons.append(f"Matching Category ({target_cat})")
        if not reasons:
            reasons.append("Semantic Vector Alignment")

        related.append({
            "documentId": oid,
            "title": info["title"],
            "subsidiary": info["subsidiary"],
            "category": info["category"],
            "mine": info["mine"],
            "similarity": f"{sim_pct}%",
            "similarityScore": round(sim_pct / 100.0, 2),
            "reasons": reasons
        })

    return {
        "success": True,
        "documentId": document_id,
        "count": len(related),
        "relatedDocuments": related
    }
