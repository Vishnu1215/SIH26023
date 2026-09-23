import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "SIH26023 AI Service"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    TESSERACT_PATH: str = os.getenv("TESSERACT_PATH", "")

    # Storage paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    TEXT_STORAGE_DIR: str = os.getenv(
        "TEXT_STORAGE_DIR",
        os.path.join(BASE_DIR, "storage", "extracted_text")
    )
    STRUCTURED_DATA_DIR: str = os.getenv(
        "STRUCTURED_DATA_DIR",
        os.path.join(BASE_DIR, "storage", "structured_data")
    )
    VALIDATION_STORAGE_DIR: str = os.getenv(
        "VALIDATION_STORAGE_DIR",
        os.path.join(BASE_DIR, "storage", "validation")
    )
    LOGS_STORAGE_DIR: str = os.getenv(
        "LOGS_STORAGE_DIR",
        os.path.join(BASE_DIR, "storage", "logs")
    )
    OCR_LOG_FILE: str = os.getenv(
        "OCR_LOG_FILE",
        os.path.join(BASE_DIR, "logs", "ocr.log")
    )


settings = Settings()

# Ensure storage directories exist
os.makedirs(settings.TEXT_STORAGE_DIR, exist_ok=True)
os.makedirs(settings.STRUCTURED_DATA_DIR, exist_ok=True)
os.makedirs(settings.VALIDATION_STORAGE_DIR, exist_ok=True)
os.makedirs(settings.LOGS_STORAGE_DIR, exist_ok=True)
os.makedirs(os.path.dirname(settings.OCR_LOG_FILE), exist_ok=True)

