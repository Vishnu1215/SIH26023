# SIH26023 - AI Service

FastAPI service for the AI-Powered Geological, Mining and Reporting Solution.

## Folder Structure

```text
ai-service/
├── app/
│   ├── api/          # API endpoints & route handlers
│   │   ├── __init__.py
│   │   ├── health.py    # Health-check endpoint
│   │   ├── ingest.py    # Phase 4: Ingestion, OCR, and automated extraction/validation
│   │   ├── extract.py   # Phase 5: Structured extraction & normalization endpoint
│   │   └── validate.py  # Phase 6: Deterministic validation engine endpoint
│   ├── core/         # Core settings and configuration
│   │   ├── __init__.py
│   │   └── config.py
│   ├── models/       # Pydantic schemas and domain models
│   ├── services/     # AI/ML business logic, loaders, extractors & validators
│   │   ├── ocr_service.py           # Tesseract OCR engine wrapper
│   │   ├── pdf_loader.py            # Dual-mode (PyMuPDF digital + scanned OCR)
│   │   ├── docx_loader.py           # Word document paragraph & table parser
│   │   ├── excel_loader.py          # Openpyxl multi-sheet tabular parser
│   │   ├── csv_loader.py            # Pandas CSV reader with encoding fallback
│   │   ├── image_loader.py          # Pillow + OCR image loader
│   │   ├── document_loader.py       # Document loader dispatcher service
│   │   ├── normalizer.py            # Phase 5: Unit, date, number, FY normalizer
│   │   ├── json_storage.py          # Phase 5: Disk storage for structured JSON
│   │   ├── information_extractor.py # Phase 5: Rule & regex-based structured extractor
│   │   ├── validation_rules.py      # Phase 6: Reusable validation rules (VAL001-VAL010)
│   │   ├── validation_storage.py    # Phase 6: Disk storage for validation JSON & history
│   │   └── validation_engine.py     # Phase 6: Main validation engine & scoring orchestrator
│   ├── utils/        # Helper utility functions
│   ├── __init__.py
│   └── main.py       # FastAPI application entry point
├── logs/
│   └── ocr.log       # Extraction & OCR log audit trail
├── storage/
│   ├── extracted_text/  # Raw text files ({documentId}.txt)
│   ├── structured_data/ # Phase 5: Normalized JSON ({documentId}.json)
│   └── validation/      # Phase 6: Validation reports ({documentId}.json)
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
- **Ingestion Endpoint**: `POST /ingest` receives `{ documentId, filePath, mimeType }` and triggers extraction, normalization, and validation.

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

---

## Phase 6: Validation Engine & Discrepancy Detection

Evaluates extracted structured records through a deterministic validation engine to guarantee completeness, consistency, and compliance with CIL/CMPDI standards.

### Standardized Validation Rules

| Rule ID | Name | Description | Severity |
| :--- | :--- | :--- | :--- |
| **VAL001** | Missing Mandatory Field | Flags missing `financialYear`, `coalProduction`, `mineName`, `state`, `productionUnit`, `reportType`. | Error / Warning |
| **VAL002** | Invalid Numeric Value | Rejects negative values for coal production, targets, overburden removal, or achieved production. | Error |
| **VAL003** | Unknown Unit | Normalizes and validates against supported units (`MT`, `Tonnes`, `Cu.M`, `M.Cu.M`, `ha`, `LT`, `sq km`, etc.). | Warning |
| **VAL004** | Invalid Date | Verifies calendar validity (flags e.g. Feb 31st) and rejects future dates beyond the current year. | Error |
| **VAL005** | Financial Year Format | Checks standard `YYYY-YY` format and validates consecutive annual sequence (e.g. `2023-24`). | Error |
| **VAL006** | Percentage Mismatch | Recalculates `(achieved / target) * 100` and flags discrepancy if reported percentage differs by > 1%. | Warning |
| **VAL007** | Duplicate Document | Flags duplicate document IDs, identical filenames, or matching SHA-256 file content hashes. | Warning / Info |
| **VAL008** | Production Inconsistency | Detects zero targets with positive production, or discrepancies between coal and achieved production. | Warning |
| **VAL009** | OCR Confidence | Checks OCR confidence (<50% Warning, 50-80% Info/Medium, >80% or digital layer Info/High). | Warning / Info |
| **VAL010** | Low Information Document | Flags documents where fewer than 5 structured fields could be populated. | Warning |

### Scoring & Status Model

- **Base Score**: 100 points
- **Deductions**: -20 points per Error, -5 points per Warning
- **Status Classification**:
  - `Error`: If `errorCount > 0`
  - `Warning`: If `errorCount == 0` and `warningCount > 0`
  - `Valid`: If `errorCount == 0` and `warningCount == 0`
- **Validation History**: Every validation execution snapshot (`validatedAt`, `score`, `status`, `errorCount`, `warningCount`) is prepended to `validationHistory` in `storage/validation/{documentId}.json`.

### Phase 6 API Endpoints

- **`POST /validate`**:
  - Request: `{ "documentId": "...", "structuredData": { ... }, "confidence": 92.5, "filename": "...", "fileHash": "..." }`
  - Response: `{ "status": "success", "validationStatus": "Valid", "validationScore": 100, "validationMessages": [], "rulesTriggered": [], "validationTime": 0.005, "validationHistory": [...] }`
- **`GET /validate/{document_id}`**:
  - Retrieves persisted validation JSON report from `storage/validation/{documentId}.json`.

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
