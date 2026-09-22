import os
import logging
import pandas as pd

logger = logging.getLogger("ai_service.csv_loader")


def load_csv_text(file_path: str) -> dict:
    """
    Extract raw text from CSV files.
    Reads tabular rows and converts them into structured readable text.
    Returns: {"text": str, "pages": int, "confidence": None, "language": str, "loaderUsed": "CSV"}
    """
    if not os.path.exists(file_path):
        err = FileNotFoundError(f"CSV file not found: {file_path}")
        err.error_code = "CORRUPTED_DOCUMENT"
        raise err

    logger.info(f"Reading CSV dataset: {file_path}")

    # Handle various common encodings gracefully
    df = None
    for encoding in ("utf-8", "latin1", "cp1252", "iso-8859-1"):
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            break
        except Exception:
            continue

    if df is None:
        try:
            df = pd.read_csv(file_path, encoding="utf-8", errors="replace")
        except Exception as exc:
            logger.error(f"Failed to parse CSV: {exc}")
            err = RuntimeError(f"Corrupted or unreadable CSV dataset: {exc}")
            err.error_code = "CORRUPTED_DOCUMENT"
            raise err

    # Header line
    headers = [str(col).strip() for col in df.columns]
    lines = [" | ".join(headers)]

    # Row lines
    for _, row in df.iterrows():
        row_values = [str(val).strip() if pd.notna(val) else "" for val in row]
        if any(row_values):
            lines.append(" | ".join(row_values))

    combined_text = "\n".join(lines).strip()
    page_estimate = max(1, len(df) // 50)

    return {
        "text": combined_text,
        "pages": page_estimate,
        "confidence": None,
        "language": "eng",
        "loaderUsed": "CSV"
    }

