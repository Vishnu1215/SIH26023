import os
import shutil
import logging
from PIL import Image
from app.core.config import settings

logger = logging.getLogger("ai_service.ocr")

try:
    import pytesseract
    from pytesseract import Output
except ImportError:
    pytesseract = None
    Output = None

# Configure Tesseract binary path from settings / environment if specified
def configure_tesseract():
    if not pytesseract:
        return

    configured_path = settings.TESSERACT_PATH or os.getenv("TESSERACT_PATH", "")
    if configured_path and os.path.exists(configured_path):
        pytesseract.pytesseract.tesseract_cmd = configured_path
        logger.info(f"Configured Tesseract binary from setting at: {configured_path}")
    elif shutil.which("tesseract"):
        logger.info(f"Using Tesseract found in system PATH: {shutil.which('tesseract')}")
    else:
        # Check standard default installation paths if on Windows as safe fallback
        for default_loc in [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
        ]:
            if os.path.exists(default_loc):
                pytesseract.pytesseract.tesseract_cmd = default_loc
                logger.info(f"Auto-detected Tesseract at: {default_loc}")
                break

configure_tesseract()


def is_tesseract_available() -> bool:
    """Check if Tesseract OCR binary is installed and callable."""
    if not pytesseract:
        return False
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def extract_text_from_image(image_input) -> str:
    """Backward-compatible helper returning text string."""
    result = extract_text_and_confidence(image_input)
    return result["text"]


def extract_text_and_confidence(image_input) -> dict:
    """
    Extracts text and recognition confidence from a PIL Image or image file path.
    Returns: {"text": str, "confidence": Optional[float], "language": str}
    """
    if not pytesseract or not is_tesseract_available():
        err = RuntimeError("Tesseract OCR binary is not installed or not in PATH.")
        err.error_code = "OCR_ENGINE_NOT_FOUND"
        raise err

    # Convert path to PIL Image if string
    if isinstance(image_input, (str, os.PathLike)):
        image = Image.open(image_input)
    else:
        image = image_input

    # Ensure RGB mode
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    lang_used = "eng"
    text = ""
    confidence = None

    try:
        # Attempt with bilingual model
        text = pytesseract.image_to_string(image, lang="eng+hin")
        lang_used = "eng+hin"
    except Exception:
        try:
            text = pytesseract.image_to_string(image, lang="eng")
            lang_used = "eng"
        except Exception as ocr_err:
            logger.error(f"Tesseract text extraction failed: {ocr_err}")
            err = RuntimeError(f"Tesseract OCR error: {ocr_err}")
            err.error_code = "OCR_ENGINE_NOT_FOUND"
            raise err

    # Calculate confidence from image_to_data
    try:
        data = pytesseract.image_to_data(image, lang=lang_used, output_type=Output.DICT)
        conf_values = [float(c) for c in data.get("conf", []) if int(c) >= 0]
        if conf_values:
            confidence = round(sum(conf_values) / len(conf_values), 1)
    except Exception as conf_err:
        logger.debug(f"Confidence score calculation failed: {conf_err}")
        confidence = None

    return {
        "text": text.strip(),
        "confidence": confidence,
        "language": lang_used
    }

