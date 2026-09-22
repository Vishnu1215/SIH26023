# SIH26023 - AI Service

FastAPI service for the AI-Powered Geological, Mining and Reporting Solution.

## Folder Structure

```text
ai-service/
├── app/
│   ├── api/          # API endpoints & route handlers
│   │   ├── __init__.py
│   │   ├── health.py  # Health-check endpoint
│   │   ├── ingest.py  # Phase 4: Ingestion & OCR pipeline endpoint
│   │   └── extract.py # Phase 5: Structured extraction & normalization endpoint
│   ├── core/         # Core settings and configuration
│   │   ├── __init__.py
│   │   └── config.py
│   ├── models/       # Pydantic schemas and domain models
│   ├── services/     # AI/ML business logic, loaders & extractors
│   │   ├── ocr_service.py           # Tesseract OCR engine wrapper
│   │   ├── pdf_loader.py            # Dual-mode (PyMuPDF digital + scanned OCR)
│   │   ├── docx_loader.py           # Word document paragraph & table parser
│   │   ├── excel_loader.py          # Openpyxl multi-sheet tabular parser
│   │   ├── csv_loader.py            # Pandas CSV reader with encoding fallback
│   │   ├── image_loader.py          # Pillow + OCR image loader
│   │   ├── document_loader.py       # Document loader dispatcher service
│   │   ├── normalizer.py            # Phase 5: Unit, date, number, FY normalizer
│   │   ├── json_storage.py          # Phase 5: Disk storage for structured JSON
│   │   └── information_extractor.py # Phase 5: Rule & regex-based structured extractor
│   ├── utils/        # Helper utility functions
│   ├── __init__.py
│   └── main.py       # FastAPI application entry point
├── logs/
│   └── ocr.log       # Extraction & OCR log audit trail
├── storage/
│   ├── extracted_text/  # Raw text files ({documentId}.txt)
│   └── structured_data/ # Phase 5: Normalized JSON ({documentId}.json)
├── .env.example
├── requirements.txt
└── README.md
```

---

## Phase 4: Text Extraction Pipeline

- **Supported Document Formats**: Searchable PDF, Scanned PDF, JPG, JPEG, PNG, DOCX, XLSX, CSV.
- **Searchable PDF Optimization**: PyMuPDF direct text layer extraction (`loaderUsed: PDF_TEXT_LAYER`). Never runs OCR on searchable PDFs.
- **Scanned PDF Fallback**: Page rasterization + Tesseract OCR per page (`loaderUsed: OCR`) with recognition confidence scoring.
- **Raw Text Storage**: Full extracted text is persisted to `storage/extracted_text/{documentId}.txt`.
- **File Logging**: Each extraction event is recorded in `logs/ocr.log` with timestamp, documentId, filename, loaderUsed, pageCount, duration, status, and errorCode.
- **Ingestion Endpoint**: `POST /ingest` receives `{ documentId, filePath, mimeType }` and triggers extraction and initial normalization.

---

## Phase 5: Structured Information Extraction & Normalization

Converts raw extracted document text into clean, normalized JSON mining records using deterministic regex patterns, dictionary lookups, and normalization routines.

### Extraction Capabilities

1. **Document Metadata**:
   - `reportTitle`: Extracted from explicit document title headers or clean file names.
   - `reportType`: Categorized into Annual Report, Monthly Production Report, Geological Exploration, Parliamentary Q&A, Ministry Report, Coal Quality, etc.
   - `financialYear`: Normalized to canonical `YYYY-YY` format (e.g., `2023-24`).
   - `reportDate`: Normalized into ISO `YYYY-MM-DD`.
   - `issuingOrganization`: Mapped to CMPDIL, CIL, Ministry of Coal, CCO, etc.

2. **Mining Entities & Location**:
   - `subsidiary`: Identifies operating subsidiaries (SECL, MCL, NCL, WCL, CCL, BCCL, ECL, SCCL, NEC) or CMPDIL.
   - `mineName`: Matches against known Indian coal mines (e.g. Gevra, Kusmunda, Jharia, Jayant).
   - `mineType`: Classifies as `Opencast` or `Underground`.
   - `district` & `state`: Geographic mapping for major mining clusters (e.g. Korba -> Chhattisgarh, Dhanbad -> Jharkhand).
   - `region`: Coalfield identification (e.g. Jharia Coalfield, Korba Coalfield).

3. **Production Metrics**:
   - `coalProduction`: Actual or raw coal production value.
   - `targetProduction`: Prescribed production target.
   - `achievedProduction`: Realized production output.
   - `percentageAchievement`: Calculated or extracted achievement percentage.
   - `productionUnit`: Canonical unit representation (`MT`, `LT`, `T`).
   - `overburdenRemoval`: OBR volume in `M.Cu.M` or `Cu.M`.

### Normalization Rules

- **Number Normalization**: Strips comma separators (e.g., `1,25,000` -> `125000.0`).
- **Unit Normalization**: Standardizes `Million Tonnes` / `MT` -> `MT`, `Cubic Metres` -> `Cu.M`, `Million Cu M` -> `M.Cu.M`, `Hectare` -> `ha`.
- **Date Normalization**: Converts various Indian and international date formats (`DD/MM/YYYY`, `DD-MM-YYYY`, `31 March 2025`, `March 31, 2025`) into standard `YYYY-MM-DD`.
- **Financial Year Normalization**: Transforms `2023-2024`, `FY 2023-24`, `FY24` into standard `2023-24`.
- **Whitespace Normalization**: Cleans non-breaking spaces, excessive spaces, and consecutive newlines.

### Structured JSON Storage

Normalized records are persisted as standalone JSON artifacts in:
```
ai-service/storage/structured_data/{documentId}.json
```

### Phase 5 API Endpoints

- **`POST /extract`**:
  - Request: `{ "documentId": "...", "text": "...", "filename": "..." }`
  - Response: `{ "status": "success", "documentId": "...", "structuredRecordCount": 1, "structuredDataAvailable": true, "data": { ... } }`
- **`GET /extract/{document_id}`**:
  - Retrieves persisted structured JSON for a given document.

---

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

5. **Verify Endpoints:**
   * Health Check: `http://localhost:8000/health`
   * Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`
