# SIH26023 - AI Service

FastAPI service for the AI-Powered Geological, Mining and Reporting Solution.

## Folder Structure

```text
ai-service/
├── app/
│   ├── api/          # API endpoints & route handlers
│   │   ├── __init__.py
│   │   ├── health.py # Health-check endpoint
│   │   └── ingest.py # Phase 4: Document ingestion & text extraction endpoint
│   ├── core/         # Core settings and configuration
│   │   ├── __init__.py
│   │   └── config.py
│   ├── models/       # Pydantic schemas and domain models
│   ├── services/     # AI/ML business logic & loaders
│   │   ├── ocr_service.py      # Tesseract OCR engine wrapper
│   │   ├── pdf_loader.py       # Dual-mode (PyMuPDF digital + scanned OCR)
│   │   ├── docx_loader.py      # Word document paragraph & table parser
│   │   ├── excel_loader.py     # Openpyxl multi-sheet tabular parser
│   │   ├── csv_loader.py       # Pandas CSV reader with encoding fallback
│   │   ├── image_loader.py     # Pillow + OCR image loader
│   │   └── document_loader.py  # Dispatcher service
│   ├── utils/        # Helper utility functions
│   ├── __init__.py
│   └── main.py       # FastAPI application entry point
├── .env.example
├── requirements.txt
└── README.md
```

## Phase 4: Text Extraction Pipeline

- **Supported Document Formats**: Searchable PDF, Scanned PDF, JPG, JPEG, PNG, DOCX, XLSX, CSV.
- **Searchable PDF Optimization**: PyMuPDF direct text layer extraction (`loaderUsed: PDF_TEXT_LAYER`). Never runs OCR on searchable PDFs.
- **Scanned PDF Fallback**: Page rasterization + Tesseract OCR per page (`loaderUsed: OCR`) with recognition confidence scoring.
- **Internal Storage**: Full text is persisted to `storage/extracted_text/{documentId}.txt` for downstream phases.
- **File Logging**: Each extraction event is recorded in `logs/ocr.log` with timestamp, documentId, filename, loaderUsed, pageCount, duration, status, and errorCode.
- **Ingestion Endpoint**: `POST /ingest` receives `{ documentId, filePath, mimeType }` and returns metadata only (`status`, `documentId`, `processingTime`, `pageCount`, `confidence`, `loaderUsed`, `language`, `textPreview`, `errorCode`, `errorMessage`).



## Setup and Running

1. **Create and Activate Python Virtual Environment:**
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

4. **Start the Service:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Verify Health Endpoint:**
   * Health Check: `http://localhost:8000/health`
   * Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`
