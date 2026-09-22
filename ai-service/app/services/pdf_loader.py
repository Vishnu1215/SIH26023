import os
import logging
from PIL import Image
import pymupdf as fitz
from app.services.ocr_service import extract_text_and_confidence, is_tesseract_available

logger = logging.getLogger("ai_service.pdf_loader")


def load_pdf_text(file_path: str) -> dict:
    """
    Extract text from Digital and Scanned PDF documents.
    Optimized Flow:
    1. Checks if document contains searchable text via PyMuPDF.
       - If YES: Extracts directly using PyMuPDF. NEVER runs OCR on searchable PDFs.
       - Returns loaderUsed = "PDF_TEXT_LAYER", confidence = None.
    2. If NO (scanned or image-based PDF):
       - Rasterizes pages to high-res images and executes Tesseract OCR.
       - Returns loaderUsed = "OCR", confidence = average OCR confidence.
    """
    if not os.path.exists(file_path):
        err = FileNotFoundError(f"PDF file not found: {file_path}")
        err.error_code = "CORRUPTED_DOCUMENT"
        raise err

    logger.info(f"Opening PDF document: {file_path}")
    try:
        doc = fitz.open(file_path)
    except Exception as exc:
        logger.error(f"Failed to open PDF document: {exc}")
        err = RuntimeError(f"Corrupted or unreadable PDF document: {exc}")
        err.error_code = "CORRUPTED_DOCUMENT"
        raise err

    if doc.is_encrypted:
        doc.close()
        err = RuntimeError("PDF document is encrypted and password-protected.")
        err.error_code = "PASSWORD_PROTECTED"
        raise err

    total_pages = len(doc)
    if total_pages == 0:
        doc.close()
        err = RuntimeError("PDF document contains no pages.")
        err.error_code = "EMPTY_DOCUMENT"
        raise err

    # Step 1: Check for searchable digital text layer
    digital_page_texts = []
    total_digital_chars = 0

    for page_num in range(total_pages):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():
            digital_page_texts.append(text.strip())
            total_digital_chars += len(text.strip())

    # Document contains searchable text if text layer has substantial content
    # (Threshold: at least 30 characters or 10 chars per page on average)
    has_searchable_text = total_digital_chars >= max(30, total_pages * 10)

    if has_searchable_text:
        logger.info(
            f"Searchable text detected ({total_digital_chars} chars across {total_pages} pages). "
            f"Extracting directly with PyMuPDF. NEVER OCR searchable PDFs."
        )
        combined_text = "\n\n".join(digital_page_texts).strip()
        doc.close()
        return {
            "text": combined_text,
            "pages": total_pages,
            "loaderUsed": "PDF_TEXT_LAYER",
            "confidence": None,
            "language": "eng"
        }

    # Step 2: PDF is scanned or image-based -> Rasterize and run OCR
    logger.info(
        f"PDF lacks searchable text ({total_digital_chars} chars). "
        f"Rasterizing {total_pages} pages for OCR extraction."
    )

    if not is_tesseract_available():
        doc.close()
        err = RuntimeError("Tesseract OCR binary is not installed or not in PATH for scanned PDF.")
        err.error_code = "OCR_ENGINE_NOT_FOUND"
        raise err

    ocr_page_texts = []
    confidences = []
    detected_langs = set()

    for page_idx in range(total_pages):
        page = doc[page_idx]
        # Render page to high-res pixmap (2.0x zoom for sharp OCR)
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        try:
            ocr_res = extract_text_and_confidence(img)
            if ocr_res.get("text"):
                ocr_page_texts.append(f"--- Page {page_idx + 1} ---\n{ocr_res['text']}")
            if ocr_res.get("confidence") is not None:
                confidences.append(ocr_res["confidence"])
            if ocr_res.get("language"):
                detected_langs.add(ocr_res["language"])
        except Exception as ocr_err:
            logger.warning(f"OCR failed for page {page_idx + 1}: {ocr_err}")
            if hasattr(ocr_err, "error_code") and ocr_err.error_code == "OCR_ENGINE_NOT_FOUND":
                doc.close()
                raise ocr_err

    doc.close()
    combined_ocr_text = "\n\n".join(ocr_page_texts).strip()
    avg_confidence = round(sum(confidences) / len(confidences), 1) if confidences else None
    primary_lang = "eng+hin" if "eng+hin" in detected_langs else "eng"

    return {
        "text": combined_ocr_text,
        "pages": total_pages,
        "loaderUsed": "OCR",
        "confidence": avg_confidence,
        "language": primary_lang
    }

