import os
import logging
from PIL import Image
from app.services.ocr_service import extract_text_and_confidence

logger = logging.getLogger("ai_service.image_loader")


def load_image_text(file_path: str) -> dict:
    """
    Extract raw text and confidence from JPG, JPEG, or PNG images using OCR.
    Returns: {"text": str, "confidence": Optional[float], "language": str, "pages": int}
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Image file not found: {file_path}")

    logger.info(f"Extracting text from image file: {file_path}")
    try:
        with Image.open(file_path) as img:
            res = extract_text_and_confidence(img)
            return {
                "text": res["text"],
                "confidence": res.get("confidence"),
                "language": res.get("language", "eng"),
                "pages": 1
            }
    except Exception as e:
        if not hasattr(e, "error_code"):
            e.error_code = "CORRUPTED_DOCUMENT" if "cannot identify image file" in str(e).lower() else "UNKNOWN_ERROR"
        raise e

