import os
import time
import logging
from datetime import datetime, timezone
from app.core.config import settings
from app.utils.ocr_logger import log_ocr_event
from app.services.pdf_loader import load_pdf_text
from app.services.image_loader import load_image_text
from app.services.docx_loader import load_docx_text
from app.services.excel_loader import load_excel_text
from app.services.csv_loader import load_csv_text

logger = logging.getLogger("ai_service.document_loader")

# Ensure internal text storage directory exists
os.makedirs(settings.TEXT_STORAGE_DIR, exist_ok=True)


def extract_document_text(document_id: str, file_path: str, mime_type: str = "") -> dict:
    """
    Dispatcher service that selects the appropriate extractor based on file extension / MIME type.
    Persists full extracted text to internal storage (storage/extracted_text/{document_id}.txt).
    Logs the extraction event to logs/ocr.log.
    Returns complete metadata according to Phase 4 refinement specifications.
    """
    processing_started_at = datetime.now(timezone.utc).isoformat()
    start_time = time.time()
    filename = os.path.basename(file_path)

    if not os.path.exists(file_path):
        err = FileNotFoundError(f"File not found on disk: {file_path}")
        err.error_code = "CORRUPTED_DOCUMENT"
        log_ocr_event(
            document_id=document_id,
            filename=filename,
            loader_used="UNKNOWN",
            page_count=0,
            processing_time=0.0,
            status="Failed",
            error_code=err.error_code
        )
        raise err

    if os.path.getsize(file_path) == 0:
        err = ValueError(f"Document file '{filename}' is empty (0 bytes).")
        err.error_code = "EMPTY_DOCUMENT"
        log_ocr_event(
            document_id=document_id,
            filename=filename,
            loader_used="UNKNOWN",
            page_count=0,
            processing_time=0.0,
            status="Failed",
            error_code=err.error_code
        )
        raise err

    ext = os.path.splitext(file_path)[1].lower().replace(".", "")
    logger.info(f"Dispatching document extraction for ID: {document_id}, Ext: .{ext}, MIME: {mime_type}")

    try:
        if ext == "pdf" or "pdf" in (mime_type or ""):
            res = load_pdf_text(file_path)
            extracted_text = res.get("text", "")
            pages = res.get("pages", 1)
            loader_used = res.get("loaderUsed", "PDF_TEXT_LAYER")
            confidence = res.get("confidence")
            language = res.get("language", "eng")

        elif ext in ("jpg", "jpeg", "png") or any(img_t in (mime_type or "") for img_t in ("image/jpeg", "image/png")):
            res = load_image_text(file_path)
            extracted_text = res.get("text", "")
            pages = res.get("pages", 1)
            loader_used = "IMAGE"
            confidence = res.get("confidence")
            language = res.get("language", "eng")

        elif ext == "docx" or "wordprocessingml" in (mime_type or ""):
            res = load_docx_text(file_path)
            extracted_text = res.get("text", "")
            pages = res.get("pages", 1)
            loader_used = "DOCX"
            confidence = None
            language = res.get("language", "eng")

        elif ext in ("xlsx", "xlsm") or "spreadsheetml" in (mime_type or ""):
            res = load_excel_text(file_path)
            extracted_text = res.get("text", "")
            pages = res.get("pages", 1)
            loader_used = "XLSX"
            confidence = None
            language = res.get("language", "eng")

        elif ext == "csv" or "csv" in (mime_type or ""):
            res = load_csv_text(file_path)
            extracted_text = res.get("text", "")
            pages = res.get("pages", 1)
            loader_used = "CSV"
            confidence = None
            language = res.get("language", "eng")

        else:
            err = ValueError(f"Unsupported document format: '.{ext}'")
            err.error_code = "UNSUPPORTED_FORMAT"
            raise err

        processing_completed_at = datetime.now(timezone.utc).isoformat()
        processing_time = round(time.time() - start_time, 2)

        # Persist full extracted text internally for future pipeline phases
        storage_path = os.path.join(settings.TEXT_STORAGE_DIR, f"{document_id}.txt")
        with open(storage_path, "w", encoding="utf-8") as f:
            f.write(extracted_text)

        logger.info(
            f"Extraction completed for {document_id} via {loader_used} in {processing_time}s "
            f"({len(extracted_text)} chars, stored at {storage_path})"
        )

        # Log OCR event to ocr.log
        log_ocr_event(
            document_id=document_id,
            filename=filename,
            loader_used=loader_used,
            page_count=pages,
            processing_time=processing_time,
            status="OCR Complete",
            error_code=None
        )

        return {
            "status": "OCR Complete",
            "documentId": document_id,
            "pageCount": pages,
            "processingStartedAt": processing_started_at,
            "processingCompletedAt": processing_completed_at,
            "processingTime": processing_time,
            "loaderUsed": loader_used,
            "language": language,
            "confidence": confidence,
            "textPreview": extracted_text[:500],
            "text": extracted_text,
            "errorCode": None,
            "errorMessage": None
        }

    except Exception as exc:
        processing_completed_at = datetime.now(timezone.utc).isoformat()
        processing_time = round(time.time() - start_time, 2)
        error_code = getattr(exc, "error_code", "UNKNOWN_ERROR")
        if "tesseract" in str(exc).lower():
            error_code = "OCR_ENGINE_NOT_FOUND"

        log_ocr_event(
            document_id=document_id,
            filename=filename,
            loader_used=locals().get("loader_used", "UNKNOWN"),
            page_count=locals().get("pages", 1),
            processing_time=processing_time,
            status="Failed",
            error_code=error_code
        )
        exc.error_code = error_code
        raise exc

