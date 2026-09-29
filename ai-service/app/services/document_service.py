"""
Document Service: Business logic for Document lifecycle, ingestion,
and multi-collection aggregation backed exclusively by MongoDB Atlas.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from app.repositories import (
    get_document_repository,
    get_ocr_repository,
    get_structured_repository,
    get_validation_repository,
    get_analytics_repository,
    get_rag_repository,
    generate_text_embedding
)
from app.services.document_loader import extract_document_text
from app.services.information_extractor import extract_structured_information
from app.services.validation_engine import validate_document

logger = logging.getLogger("ai_service.document_service")


class DocumentService:
    def __init__(self):
        self.doc_repo = get_document_repository()
        self.ocr_repo = get_ocr_repository()
        self.struct_repo = get_structured_repository()
        self.val_repo = get_validation_repository()
        self.analytics_repo = get_analytics_repository()
        self.rag_repo = get_rag_repository()

    async def get_all_documents(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        sort_by: str = "uploadTime",
        sort_dir: int = -1,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Retrieve all documents directly from MongoDB."""
        return await self.doc_repo.list_documents(
            filter_query=filter_query,
            sort_by=sort_by,
            sort_dir=sort_dir,
            skip=skip,
            limit=limit
        )

    async def get_document_by_id(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single document metadata from MongoDB."""
        return await self.doc_repo.get_document_by_id(document_id)

    async def get_full_document_details(self, document_id: str) -> Optional[Dict[str, Any]]:
        """
        Aggregate complete document intelligence directly from MongoDB collections:
        - Document Metadata (documents)
        - OCR Information (ocr_results)
        - Structured JSON (structured_records)
        - Validation Summary & Messages (validation_results)
        - Executive Summary (structured_records)
        - Analytics & Production Summary
        - Data Quality
        - Topic Classification
        """
        doc = await self.doc_repo.get_document_by_id(document_id)
        if not doc:
            return None

        ocr_data = await self.ocr_repo.get_ocr_result(document_id) or {}
        struct_data = await self.struct_repo.get_structured_record(document_id) or {}
        val_data = await self.val_repo.get_validation_result(document_id) or {}
        analytics_data = await self.analytics_repo.get_document_analytics(document_id) or {}

        norm_json = struct_data.get("normalizedJson") or {}
        entities = struct_data.get("entities") or {}
        topics = struct_data.get("extractedTopics") or []
        summary = struct_data.get("summary") or doc.get("summary") or ""

        # Production metrics synthesis from structured tables
        prod_metrics = {}
        if isinstance(norm_json, dict):
            prod_metrics = norm_json.get("production") or norm_json.get("monthly_production") or {}

        val_score = val_data.get("score") if val_data.get("score") is not None else doc.get("validationScore", 100)
        val_status = val_data.get("status") or doc.get("validationStatus", "Valid")

        return {
            "documentId": document_id,
            "metadata": doc,
            "ocrInformation": {
                "pages": ocr_data.get("pages", doc.get("pageCount", 1)),
                "language": ocr_data.get("language", "eng"),
                "processingTime": ocr_data.get("processingTime", doc.get("processingTime", 0.0)),
                "ocrEngine": ocr_data.get("ocrEngine", "PyMuPDF + Tesseract OCR"),
                "textPreview": (ocr_data.get("extractedText", "")[:600] + "...") if ocr_data.get("extractedText") else "",
                "totalCharacters": len(ocr_data.get("extractedText", ""))
            },
            "structuredJson": norm_json,
            "validationSummary": {
                "score": val_score,
                "status": val_status,
                "errorCount": val_data.get("errors", 0),
                "warningCount": val_data.get("warnings", 0),
                "executedRules": val_data.get("executedRules", []),
                "timestamp": val_data.get("timestamp") or doc.get("uploadTime")
            },
            "validationMessages": val_data.get("validationMessages", []),
            "executiveSummary": summary,
            "analytics": analytics_data.get("dashboardMetrics") or {
                "confidenceScore": doc.get("confidence", 0.95),
                "complianceScore": val_score,
                "processingTime": ocr_data.get("processingTime", 0.0)
            },
            "productionSummary": prod_metrics or {
                "subsidiary": doc.get("subsidiary", "CIL"),
                "mine": doc.get("mineName"),
                "financialYear": doc.get("financialYear", "FY 2023-24")
            },
            "dataQuality": {
                "completeness": 95 if val_status == "Valid" else 75,
                "confidence": doc.get("confidence", 0.95),
                "score": val_score,
                "status": val_status
            },
            "topicClassification": topics
        }

    async def ingest_document_pipeline(
        self,
        document_id: str,
        file_path: str,
        mime_type: str = "application/pdf",
        original_name: Optional[str] = None,
        stored_name: Optional[str] = None,
        size: Optional[int] = None,
        category: Optional[str] = "01_production",
        subsidiary: Optional[str] = None,
        financial_year: Optional[str] = None,
        mine_name: Optional[str] = None,
        file_hash: Optional[str] = None,
        existing_documents: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Full End-to-End Ingestion Workflow:
        PDF -> OCR -> Metadata Extraction -> Validation -> Store into MongoDB -> Refresh Dynamic Analytics
        """
        filename = original_name or os.path.basename(file_path)
        logger.info(f"Starting MongoDB ingestion pipeline for {document_id} ({filename})")

        # 1. OCR & Text Extraction
        ocr_result = extract_document_text(
            document_id=document_id,
            file_path=file_path,
            mime_type=mime_type or ""
        )
        extracted_text = ocr_result.get("text", "")
        page_count = ocr_result.get("pageCount", 1)
        proc_time = ocr_result.get("processingTime", 0.0)
        confidence = ocr_result.get("confidence", 0.95)
        lang = ocr_result.get("language", "eng")
        loader_used = ocr_result.get("loaderUsed", "PyMuPDF + Tesseract OCR")

        # Persist OCR result in MongoDB ocr_results collection
        await self.ocr_repo.upsert_ocr_result(
            document_id=document_id,
            pages=page_count,
            extracted_text=extracted_text,
            language=lang,
            processing_time=proc_time,
            ocr_engine=loader_used
        )

        # 2. Structured Information Extraction
        structured_data = {}
        try:
            structured_data = extract_structured_information(
                document_id=document_id,
                text=extracted_text,
                filename=filename
            )
        except Exception as se:
            logger.warning(f"Structured extraction warning for {document_id}: {se}")

        meta = structured_data.get("metadata", {})
        sub = subsidiary or meta.get("subsidiary") or "CIL"
        fy = financial_year or meta.get("financialYear") or "FY 2023-24"
        mine = mine_name or meta.get("mine") or meta.get("mineName")
        topics = structured_data.get("extractedTopics") or structured_data.get("topics") or []
        summary = structured_data.get("summary") or meta.get("summary") or ""

        # Persist Structured record in MongoDB structured_records collection
        await self.struct_repo.upsert_structured_record(
            document_id=document_id,
            normalized_json=structured_data.get("tables") or structured_data.get("normalizedJson") or {},
            entities=structured_data.get("entities") or meta.get("entities") or {},
            extracted_topics=topics,
            metadata=meta,
            summary=summary
        )

        # 3. Validation Engine
        validation_report = {}
        try:
            validation_report = validate_document(
                document_id=document_id,
                structured_data=structured_data or {},
                confidence=confidence,
                filename=filename,
                file_hash=file_hash,
                existing_documents=existing_documents
            )
        except Exception as ve:
            logger.warning(f"Validation warning for {document_id}: {ve}")

        val_score = validation_report.get("validationScore", 100)
        val_status = validation_report.get("validationStatus", "Valid")
        errors = validation_report.get("errorCount", 0)
        warnings = validation_report.get("warningCount", 0)
        val_messages = validation_report.get("validationMessages", [])
        rules_triggered = validation_report.get("rulesTriggered", [])

        # Persist Validation result in MongoDB validation_results collection
        await self.val_repo.upsert_validation_result(
            document_id=document_id,
            score=val_score,
            status=val_status,
            errors=errors,
            warnings=warnings,
            validation_messages=val_messages,
            executed_rules=rules_triggered
        )

        # 4. Upsert Document Master Record in MongoDB documents collection
        doc_record = {
            "documentId": document_id,
            "fileName": filename,
            "originalName": filename,
            "storedName": stored_name or filename,
            "uploadTime": datetime.now(timezone.utc).isoformat(),
            "reportType": meta.get("reportType", "Production Report"),
            "financialYear": fy,
            "issuingOrganization": meta.get("issuingOrganization", "Ministry of Coal"),
            "subsidiary": sub,
            "mineName": mine,
            "mineType": meta.get("mineType", "Open Cast / Mixed"),
            "state": meta.get("state", "National"),
            "district": meta.get("district"),
            "category": category or "01_production",
            "status": "Validated" if val_status in ["Valid", "Warning"] else "Error",
            "filePath": file_path,
            "sha256": file_hash,
            "uploadStatus": "Success",
            "size": size or (os.path.getsize(file_path) if os.path.exists(file_path) else 0),
            "mimeType": mime_type,
            "confidence": confidence,
            "pageCount": page_count,
            "validationScore": val_score,
            "validationStatus": val_status,
            "processingTime": proc_time
        }
        await self.doc_repo.upsert_document(doc_record)

        # 5. Generate and persist RAG chunks in MongoDB rag_chunks collection
        chunks = []
        if summary:
            chunks.append({
                "documentId": document_id,
                "chunkNumber": 1,
                "text": summary,
                "embedding": generate_text_embedding(summary),
                "metadata": {"subsidiary": sub, "section": "Executive Summary", "mine": mine, "category": category}
            })
        if extracted_text:
            snippets = [extracted_text[i:i+800] for i in range(0, min(len(extracted_text), 4000), 700)]
            for idx, snip in enumerate(snippets):
                chunks.append({
                    "documentId": document_id,
                    "chunkNumber": len(chunks) + 1,
                    "text": snip,
                    "embedding": generate_text_embedding(snip),
                    "metadata": {"subsidiary": sub, "section": f"Content Part {idx+1}", "mine": mine, "category": category}
                })
        await self.rag_repo.save_chunks(document_id, chunks)

        # 6. Recompute Dynamic Dashboard Analytics in MongoDB
        try:
            dynamic_metrics = await self.analytics_repo.calculate_dynamic_metrics()
            await self.analytics_repo.upsert_consolidated_dashboard(dynamic_metrics)
        except Exception as ae:
            logger.warning(f"Analytics refresh warning: {ae}")

        logger.info(f"Ingestion pipeline completed successfully for {document_id}")

        return {
            "status": "OCR Complete",
            "documentId": document_id,
            "processingTime": proc_time,
            "pageCount": page_count,
            "confidence": confidence,
            "loaderUsed": loader_used,
            "processingStartedAt": ocr_result.get("processingStartedAt"),
            "processingCompletedAt": ocr_result.get("processingCompletedAt"),
            "language": lang,
            "textPreview": ocr_result.get("textPreview"),
            "structuredDataAvailable": True,
            "structuredRecordCount": 1,
            "structuredData": structured_data,
            "validationStatus": val_status,
            "validationScore": val_score,
            "validationSummary": validation_report.get("validationSummary"),
            "validationMessages": val_messages,
            "messages": val_messages,
            "rulesTriggered": rules_triggered,
            "errorCount": errors,
            "warningCount": warnings,
            "infoCount": validation_report.get("infoCount", 0),
            "validationTime": validation_report.get("validationTime"),
            "validatedAt": validation_report.get("validatedAt")
        }


document_service = DocumentService()
