# SIH26023 – AI-Assisted Geological, Mining & Production Monitoring System

> **Smart India Hackathon (SIH) 2026 Project**
>
> AI-powered platform for geological, mining, production monitoring, parliamentary reporting, and intelligent document processing for **CMPDI**, **Coal India Limited (CIL)**, and the **Ministry of Coal**.

---

# Project Overview

This project digitizes and automates the processing of geological, mining, and production documents.

The system allows authorized users to upload mining documents, process them through an AI pipeline, validate extracted information, generate reports, perform topic modeling, answer parliamentary queries, and provide AI-powered recommendations.

The implementation follows the SIH26023 PRD in incremental phases.

---

# Technology Stack

## Frontend

- React 18
- Vite
- React Router
- Lucide React

## Backend

- Node.js
- Express.js
- JWT Authentication
- Multer

## AI Service

- FastAPI
- Python

## Current Storage

- Local Upload Directory
- In-memory Metadata Storage

*(Database integration will be introduced in later phases.)*

---

# Project Structure

```
SIH26023/

├── ai-service/
│   ├── app/
│   ├── requirements.txt
│   └── README.md
│
├── client/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   ├── uploads/
│   ├── package.json
│   └── .env.example
│
├── sample-data/
│   ├── 01_Production/
│   ├── 02_Subsidiary_Production/
│   ├── 03_Geological_Resources/
│   ├── 04_CMPDI_Documents/
│   ├── 05_Parliamentary_QA/
│   ├── 06_Ministry_of_Coal_Reports/
│   ├── 07_Coal_Quality_Validation/
│   ├── 08_Official_CCO_Excel/
│   ├── 09_Mine_Master/
│   └── 10_Historical_Data/
│
├── uploads/
│   └── documents/
│
└── README.md
```

---

# Current Project Status

## Current Phase

✅ **Phase 6 – Validation Engine & Discrepancy Detection**

---

## Completed Phases

- ✅ Phase 1 – Project Setup
- ✅ Phase 2 – Authentication & Dashboard Foundation
- ✅ Phase 3 – Document Upload & Ingestion Pipeline
- ✅ Phase 4 – OCR & Document Text Extraction Pipeline
- ✅ Phase 5 – Structured Information Extraction & Normalization
- ✅ Phase 6 – Validation Engine & Discrepancy Detection

---

## Upcoming Phases

- ⏳ Phase 7 – Report Generation
- ⏳ Phase 8 – Topic Modeling
- ⏳ Phase 9 – Hybrid Q&A (SQL + RAG)
- ⏳ Phase 10 – AI Recommendations


---

# Features

## Phase 1

- Project architecture
- React frontend
- Express backend
- FastAPI AI service
- Health APIs
- Environment configuration

---

## Phase 2

- JWT Authentication
- Login page
- Protected routes
- Dashboard
- Sidebar navigation
- Navbar
- Dashboard layout
- Authentication middleware

---

## Phase 3

### Document Upload

- Drag & Drop Upload
- Browse Files
- File Preview
- Upload Button
- Clear Button

Supported Formats

- PDF
- JPG
- PNG
- DOCX
- XLSX
- CSV

Maximum File Size

20 MB

---

### Upload History

Displays

- Document Name
- File Type
- File Size
- Upload Time
- Status

Status values

- Uploaded
- Uploaded (Pending AI)

---

### Backend

- Multer File Upload
- Local File Storage
- Metadata Generation
- UUID Document IDs
- In-Memory Storage

---

### FastAPI Integration

Express automatically notifies the AI Service after every upload.

If AI Service is available

```
Uploaded
```

If AI Service is unavailable

```
Uploaded (Pending AI)
```

Uploads never fail because of AI service downtime.

---

### Sample Dataset Loader

Representative mining datasets can be loaded directly into the application.

Categories

- Production
- Subsidiary Production
- Geological Resources
- CMPDI Documents
- Parliamentary QA
- Ministry Reports
- Coal Quality
- Official CCO Excel
- Mine Master
- Historical Data

---

## Phase 4: OCR & Document Text Extraction Pipeline

### Supported Formats & Engines

- **Searchable PDF**: Native text layer extraction via PyMuPDF (`fitz`). Directly extracts clean digital text. **Never OCRs searchable PDFs**.
- **Scanned PDF**: Dual-mode fallback. When no searchable text layer is found, rasterizes pages into 200 DPI images and invokes Tesseract OCR per page.
- **Word Documents (`.docx`)**: Paragraph and table-cell extraction via `python-docx`.
- **Excel Spreadsheets (`.xlsx`, `.xlsm`)**: Multi-worksheet tabular data extraction via `openpyxl`.
- **CSV Data (`.csv`)**: Tabular parsing with automatic multi-encoding fallback (`utf-8`, `latin1`, `cp1252`) via `pandas`.
- **Scanned Images (`.jpg`, `.jpeg`, `.png`)**: Image loading and OCR extraction via Pillow and Tesseract.

### Searchable PDF Optimization

```
                      Upload PDF
                          │
                          ▼
            Does PDF contain searchable text?
                          │
            ┌─────────────┴─────────────┐
           YES                          NO
            │                            │
            ▼                            ▼
  Extract directly via PyMuPDF    Rasterize pages (200 DPI)
  (loaderUsed: PDF_TEXT_LAYER)           │
  (confidence: null)                     ▼
  (NEVER run OCR)                 Execute Tesseract OCR
                                  (loaderUsed: OCR)
                                  (confidence: avg OCR score)
```

### Comprehensive Document Metadata Model

Every processed document stores:
- `pageCount`: Total pages or sheet/section count
- `processingStartedAt`: ISO 8601 UTC start timestamp
- `processingCompletedAt`: ISO 8601 UTC completion timestamp
- `processingTime`: Duration in seconds
- `loaderUsed`: Engine identifier (`PDF_TEXT_LAYER`, `OCR`, `CSV`, `XLSX`, `DOCX`, `IMAGE`)
- `language`: Primary language model (`eng`, `eng+hin`)
- `confidence`: Average recognition confidence percentage or `null` if not applicable
- `errorCode`: Standardized failure code (`OCR_ENGINE_NOT_FOUND`, `UNSUPPORTED_FORMAT`, `CORRUPTED_DOCUMENT`, `PASSWORD_PROTECTED`, `EMPTY_DOCUMENT`, `UNKNOWN_ERROR`)
- `errorMessage`: Detailed human-readable error explanation
- `textPreview`: First 500 characters of extracted text for UI inspection

### Status Lifecycle

The document status progresses cleanly through:
1. **Uploaded**: Initial ingestion
2. **Queued**: Awaiting dispatch to AI Service
3. **Processing**: Active text extraction & OCR execution
4. **OCR Complete**: Text extracted successfully and stored internally
5. **Failed**: Extraction failed (with `errorCode` and `errorMessage` stored; upload never broken)

### Environment Configuration & Logging

- **Tesseract Configuration**: Configured via `TESSERACT_PATH` in `.env` (falls back to system `PATH` if unspecified). No hardcoded paths.
- **OCR Logging**: Processing events are automatically appended to `ai-service/logs/ocr.log` with `timestamp`, `documentId`, `filename`, `loaderUsed`, `pageCount`, `processingTime`, `status`, and `errorCode`.
- **Internal Text Storage**: Full extracted text is persisted to `ai-service/storage/extracted_text/{documentId}.txt` for downstream pipeline phases.

---

## Phase 5: Structured Information Extraction & Normalization

Converts raw extracted document text into clean, structured mining records without LLMs or heavy ML models. Uses deterministic regex patterns, dictionary lookup, and standard normalization routines.

### Extraction Capabilities

1. **Document Metadata**:
   - `reportTitle`: Extracted from document title headers or clean file names.
   - `reportType`: Categorized into Annual Report, Monthly Production Report, Geological Exploration, Parliamentary Q&A, Ministry Report, etc.
   - `financialYear`: Normalized into canonical `YYYY-YY` (e.g., `2023-24`).
   - `reportDate`: Normalized into ISO `YYYY-MM-DD`.
   - `issuingOrganization`: Mapped to CMPDIL, CIL, Ministry of Coal, CCO, etc.

2. **Mining Entities & Location**:
   - `subsidiary`: Identifies operating subsidiaries (BCCL, CCL, ECL, WCL, SECL, MCL, NCL, SCCL, NEC) or CMPDIL.
   - `mineName`: Matches against known Indian coal mines (e.g., Gevra, Kusmunda, Jharia, Jayant).
   - `mineType`: Classifies as `Opencast` or `Underground`.
   - `district` & `state`: Geographic mapping for major mining clusters (e.g. Korba -> Chhattisgarh, Dhanbad -> Jharkhand).
   - `region`: Coalfield identification (e.g., Jharia Coalfield, Korba Coalfield).

3. **Production Metrics**:
   - `coalProduction`: Actual or raw coal production value.
   - `targetProduction`: Prescribed production target.
   - `achievedProduction`: Realized production output.
   - `percentageAchievement`: Calculated or extracted achievement percentage.
   - `productionUnit`: Canonical unit representation (`MT`, `LT`, `T`).
   - `overburdenRemoval`: OBR volume in `M.Cu.M` or `Cu.M`.

### Normalization Pipeline

- **Number Normalization**: Strips comma separators (e.g., `1,25,000` ➔ `125000.0`).
- **Unit Normalization**: Standardizes `Million Tonnes` ➔ `MT`, `Cubic Metres` ➔ `Cu.M`, `Million Cu M` ➔ `M.Cu.M`, `Hectare` ➔ `ha`.
- **Date Normalization**: Converts dates into ISO `YYYY-MM-DD`.
- **Financial Year Normalization**: Transforms `2023-2024`, `FY 2023-24`, `FY24` into standard `2023-24`.
- **Whitespace Normalization**: Cleans non-breaking spaces, excessive spaces, and consecutive newlines.

### Structured JSON Storage

Normalized records are persisted as standalone JSON artifacts in:
```
ai-service/storage/structured_data/{documentId}.json
```

---

## Phase 6

### Validation Engine & Discrepancy Detection

Every structured mining record automatically passes through a deterministic validation engine immediately after extraction. The engine evaluates integrity, consistency, and completeness across 10 standardized validation rules.

#### Standardized Validation Rules

| Rule ID | Rule Name | Severity | Description |
| :--- | :--- | :--- | :--- |
| **VAL001** | Missing Mandatory Field | Error | Triggers if mandatory fields (`mineName`, `subsidiary`, `coalProduction`, `financialYear`) are missing. |
| **VAL002** | Invalid Numeric Value | Error | Triggers if numeric production or overburden removal fields are negative. |
| **VAL003** | Unknown Unit | Warning | Triggers if production or overburden unit is non-standard or missing. |
| **VAL004** | Invalid Date | Error | Triggers if `reportDate` is not in canonical `YYYY-MM-DD` format or is an invalid calendar date. |
| **VAL005** | Financial Year Format | Warning | Triggers if `financialYear` does not match the canonical `YYYY-YY` format. |
| **VAL006** | Percentage Mismatch | Warning | Triggers if `percentageAchievement` deviates by > 2% from `(achieved / target) * 100`. |
| **VAL007** | Duplicate Document | Error | Triggers if the file matches an existing record by documentId, original filename, or SHA-256 file hash. |
| **VAL008** | Production Inconsistency | Warning | Triggers if `achievedProduction` exceeds `targetProduction` by > 150% without commentary. |
| **VAL009** | Low OCR Confidence | Warning | Triggers if OCR average confidence score falls below 60%. |
| **VAL010** | Low Information Document | Warning | Triggers if the structured record contains fewer than 5 extracted non-empty fields. |

#### Scoring & Status Classification

- **Base Score**: 100
- **Deductions**:
  - `-20` points per **Error**
  - `-5` points per **Warning**
- **Score Range**: Clamped to `[0, 100]`
- **Status Classification**:
  - `Valid`: 0 Errors and Score $\ge 80$
  - `Warning`: 0 Errors and Score $< 80$
  - `Error`: 1 or more Errors (regardless of numeric score)

#### Traceability & History
- **Validation History**: Every validation run prepends a historical snapshot (`validationHistory`) containing `{ validatedAt, score, status, errorCount, warningCount, rulesTriggered, validationTime }`.
- **Execution Timing**: Each run records high-resolution runtime in seconds (`validationTime`).
- **Validation Storage**: Stored as persistent JSON artifacts in:
  ```
  ai-service/storage/validation/{documentId}.json
  ```

---

# Document Processing & Ingestion Workflow

```
User Upload (Documents Page)
            │
            ▼
POST /api/documents/upload (Express + Multer)
            │
            ├─► Save file to disk (uploads/documents/)
            ├─► Compute SHA-256 Content Hash
            ├─► Register DocumentModel (status: Queued -> Processing)
            │
            ▼
POST /ingest (FastAPI AI Service)
            │
            ▼
Document Loader Dispatcher (app/services/document_loader.py)
            ├── .pdf (Searchable) ──► PyMuPDF direct text (PDF_TEXT_LAYER)
            ├── .pdf (Scanned)    ──► Rasterize + Tesseract OCR (OCR)
            ├── .docx             ──► python-docx (DOCX)
            ├── .xlsx             ──► openpyxl (XLSX)
            ├── .csv              ──► pandas (CSV)
            └── .png/.jpg         ──► Pillow + Tesseract (IMAGE)
            │
            ├─► Persist full text: storage/extracted_text/{documentId}.txt
            ├─► Append event log: logs/ocr.log
            │
            ▼
Phase 5 Structured Extraction (app/services/information_extractor.py)
            │
            ├─► Regex & entity lookup (metadata, mine, location, production)
            ├─► Normalization (units, dates, numbers, financial years)
            ├─► Persist structured JSON: storage/structured_data/{documentId}.json
            │
            ▼
Phase 6 Validation Engine (app/services/validation_engine.py)
            │
            ├─► Runs 10 deterministic rules (VAL001 - VAL010)
            ├─► Computes validation score (0-100) & status (Valid/Warning/Error)
            ├─► Tracks validation history & execution time (validationTime)
            ├─► Persist validation JSON: storage/validation/{documentId}.json
            │
            ▼
FastAPI returns OCR metadata + Structured Data + Validation Report to Express
            │
            ▼
Express DocumentModel updated:
- status: "Validated" / "Validation Warning" / "Validation Error"
- validationStatus, validationScore, rulesTriggered, validationMessages, validationHistory
            │
            ▼
Frontend Dashboard & Table updated:
- 9 Executive KPI Cards: Total Docs, OCR Complete, Structured Records, Validated Docs,
  Docs with Errors, Docs with Warnings, Validation Accuracy, Average Validation Score, Awaiting Review
- History Table: Status Pill, Score Badge, Rule Trigger Chips, Error/Warning Counts, Validated At
- View Modal (6 Sequential Sections): 1. Document Metadata (SHA-256) ➔ 2. OCR Info ➔
  3. Structured JSON ➔ 4. Validation Summary ➔ 5. Validation Messages ➔ 6. Raw Extracted Text
- On-Demand Re-Validation: "Re-Validate" button in Table & Modal
```

---

# API Endpoints

## Authentication

### POST

```
/api/auth/login
```

### GET

```
/api/auth/me
```

---

## Documents (Express)

### POST

```
/api/documents/upload
```

Upload a document and trigger text extraction. Always returns HTTP 201.

### GET

```
/api/documents
```

Retrieve uploaded document metadata.

### GET

```
/api/documents/:documentId
```

Retrieve a single uploaded document.

### POST

```
/api/documents/:documentId/process
```

On-demand trigger for text extraction & OCR on an existing document.

### POST

```
/api/documents/:documentId/extract
```

On-demand trigger for structured information extraction & normalization on an existing document.

### POST

```
/api/documents/:documentId/validate
```

On-demand trigger for Phase 6 deterministic validation & discrepancy detection on an existing document.

### POST

```
/api/documents/load-sample
```

Load representative datasets into memory.

---

## AI Service (FastAPI)

### POST

```
/ingest
```

Document Ingestion & Text Extraction endpoint. Automatically chains Phase 5 extraction and Phase 6 validation when available.
- **Request**: `{ documentId, filePath, mimeType, fileHash, existingDocuments }`
- **Response**:
  ```json
  {
    "status": "Validated",
    "documentId": "4a7c062c-633b-486a-bebf-5fafeea71d60",
    "processingTime": 0.42,
    "pageCount": 2,
    "confidence": null,
    "loaderUsed": "PDF_TEXT_LAYER",
    "language": "eng",
    "textPreview": "...",
    "structuredDataAvailable": true,
    "validationStatus": "Valid",
    "validationScore": 100,
    "rulesTriggered": []
  }
  ```

### GET

```
/ingest/{document_id}/text
```

Internal endpoint to retrieve stored text for downstream pipeline phases.

### POST

```
/extract
```

Phase 5 Structured Information Extraction & Normalization endpoint.

### GET

```
/extract/{document_id}
```

Retrieve stored structured JSON record from `ai-service/storage/structured_data/{documentId}.json`.

### POST

```
/validate
```

Phase 6 Deterministic Validation & Discrepancy Detection endpoint.
- **Request**:
  ```json
  {
    "documentId": "4a7c062c-633b-486a-bebf-5fafeea71d60",
    "filename": "BCCL_Production_Report.pdf",
    "fileHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "structuredData": { ... },
    "ocrMetadata": { "confidence": 92.5 },
    "existingDocuments": []
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "documentId": "4a7c062c-633b-486a-bebf-5fafeea71d60",
    "validationStatus": "Valid",
    "validationScore": 100,
    "validationTime": 0.003,
    "validatedAt": "2026-09-22T14:30:00Z",
    "summary": {
      "errorCount": 0,
      "warningCount": 0,
      "infoCount": 0,
      "rulesTriggered": []
    },
    "messages": [],
    "validationHistory": [
      {
        "validatedAt": "2026-09-22T14:30:00Z",
        "score": 100,
        "status": "Valid",
        "errorCount": 0,
        "warningCount": 0,
        "rulesTriggered": [],
        "validationTime": 0.003
      }
    ]
  }
  ```

### GET

```
/validate/{document_id}
```

Retrieve stored validation report from `ai-service/storage/validation/{documentId}.json`.



---

### GET

```
/health
```

Health check.

---

# Sample Dataset

The repository includes representative datasets for demonstration.

```
sample-data/

01_Production

02_Subsidiary_Production

03_Geological_Resources

04_CMPDI_Documents

05_Parliamentary_QA

06_Ministry_of_Coal_Reports

07_Coal_Quality_Validation

08_Official_CCO_Excel

09_Mine_Master

10_Historical_Data
```

These datasets are used only for development and demonstration.

---

# Running the Project

## 1. Backend

```bash
cd server
npm install
npm start
```

Runs on

```
http://localhost:5000
```

---

## 2. AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Runs on

```
http://127.0.0.1:8000
```

---

## 3. Frontend

```bash
cd client
npm install
npm run dev
```

Runs on

```
http://localhost:5173
```

---

# Demo Credentials

Username

```
admin
```

Password

```
admin123
```

---

# Manual Testing

- Login using demo credentials (`admin` / `admin123`)
- Navigate to **Documents**
- Upload a supported mining report (PDF / XLSX / CSV / Image / DOCX)
- Verify automatic OCR text extraction, structured normalization, and validation engine execution
- Verify the document history table displays:
  - Validation Status pill (`Valid`, `Warning`, `Error`)
  - Validation Score badge (`0-100%`)
  - Triggered Rule chips (`VAL001` - `VAL010`)
  - Error and Warning counts
  - Execution timestamp
- Click **Re-Validate** button to test on-demand re-execution and verify `validationHistory` growth
- Click **View** to inspect the 6 sequential modal sections:
  1. Document Metadata (including SHA-256 hash)
  2. OCR Text Extraction Info
  3. Structured Mining Record (Normalized JSON)
  4. Validation Summary & Score Card
  5. Validation Messages & Discrepancies Table
  6. Raw Extracted Text Preview
- Navigate to **Dashboard** and verify the 9 dynamic KPI cards:
  - Total Ingested Documents
  - OCR Complete
  - Structured Records
  - Validated Documents
  - Documents with Errors
  - Documents with Warnings
  - Validation Accuracy (%)
  - Average Validation Score
  - Awaiting Review
- Upload a duplicate file to verify `VAL007` duplicate detection (matching SHA-256 hash or filename)

---

## Phase 7: Analytics Engine & Executive Dashboard Insights

The deterministic Analytics Engine aggregates all normalized mining records and validation outputs into a centralized, persistent dashboard single source of truth (`ai-service/storage/analytics/dashboard.json`).

### Key Analytical Modules

1. **Production Analytics**: Total Coal Production (MT), Target Production (MT), Achieved Production (MT), Average Production, Highest/Lowest Production, and Production Achievement Percentage `(Total Achieved / Total Target) * 100`.
2. **Subsidiary Analytics & Leaderboard**: Comprehensive aggregation across all coal subsidiaries (SECL, MCL, NCL, CCL, ECL, BCCL, WCL, CMPDI, SCCL) with document count, production, targets, and achievement percentage. Deterministically ranked by `Production (desc)` -> `Documents (desc)` -> `Alphabetical`.
3. **Geographical / State Analytics**: State-wise mining breakdown (Jharkhand, Odisha, Chhattisgarh, Madhya Pradesh, West Bengal, Maharashtra, Telangana) with active document counts, total production, and state rankings.
4. **Financial Year Trends**: Chronologically sorted multi-year production comparison (e.g., `2021-22`, `2022-23`, `2023-24`), target fulfillment rates, and validation quality trends.
5. **Validation Engine Health**: Live accuracy metrics, valid/warning/error distributions, and average discrepancy score tracking.
6. **Document Pipeline Analytics**: Aggregations across uploaded documents, processing stages, average OCR latency, and average validation duration.
7. **Top Performers Rankings**: Instant leaderboards for Top 5 Mines and Top 5 Subsidiaries.
8. **Data Quality & Integrity**: High / Medium / Low quality distribution, field completeness tracking, duplicate counts, and low-confidence OCR detection.

### Architecture: Single Source of Truth

```
structured_data/*.json
validation/*.json
        │
        ▼
analytics_engine.py ──► storage/analytics/dashboard.json (Single Source of Truth)
        │                                  │
        ▼                                  ▼
POST /analytics/recompute           GET /analytics/dashboard
(Auto-triggered on upload)          (Read directly by Express API & React Dashboard)
```

### Executive Visualizations & Presentation (Phase 7 Refinement)

The dashboard provides deterministic executive visualizations and layout refinements:
- **3-Row KPI Architecture**:
  - *Row 1: Pipeline & Quality Overview* (Processed, Clean Records, Quality Score, Accuracy %)
  - *Row 2: Ingestion & Verification Progress* (Total Ingested, Extracted, Errors, Warnings)
  - *Row 3: Mining Output & Operational Coverage* (Total Output, Target Achievement, Subsidiaries, States)
- **Production Equation Box**: Explicit visual representation `Achieved / Target = Achievement %` with high-contrast progress tracking.
- **Deterministic Inline SVG Visualizations** (pure React, zero external heavy chart libraries):
  - *Production Trend by FY* (Chronologically sorted start-year bar chart)
  - *Validation Health Status Donut* (Valid / Warning / Error proportional arcs with legend)
  - *Subsidiary Output Distribution* (Horizontal comparative bars)
  - *Geographical State Coverage* (Horizontal output bars with 'Not Available' fallback)
- **Synchronized Scoping**: Active in-memory document set scoped to eliminate orphaned historical test artifacts.
- **Consistent Number Formatting**: Indian numbering system (`142,787.01 MT`, `93.7%`, `0.36 s`, `1,245`).

---

# Verification & Testing

### Running Phase 7 Analytics Tests

```bash
# Test deterministic refinement suite (scoping, FY sort, state normalization, accuracy)
python scratch/test_phase7_refinements.py

# Test Phase 5 & Phase 6 regression suites
python scratch/test_phase5.py
python scratch/test_phase6_refinements.py

# Test React client production build
cd client && npm run build
```

---

# Current Limitations

The following features are intentionally **not implemented** yet (scheduled for future phases):

- LLM Integration & AI Entity Extraction (Named Entity Recognition via LLMs)
- RAG / Vector Databases (ChromaDB / FAISS / Pinecone)
- Semantic Search & Similarity Matching
- Text-to-SQL Query Generation
- Recommendation Engine
- Report Generation (Automated PDF / Excel export)
- Topic Modeling (BERTopic / LDA)
- AI Chat Assistant & Conversational Agent
- Database Integration (MongoDB / PostgreSQL)

---

# Roadmap

| Phase | Status |
|--------|--------|
| Phase 1 – Project Setup | ✅ |
| Phase 2 – Authentication & Dashboard Foundation | ✅ |
| Phase 3 – Document Upload & Ingestion Pipeline | ✅ |
| Phase 4 – OCR & Document Text Extraction Pipeline | ✅ |
| Phase 5 – Structured Information Extraction & Normalization | ✅ |
| Phase 6 – Validation Engine & Discrepancy Detection | ✅ |
| Phase 7 – Analytics Engine & Executive Dashboard Insights | ✅ |
| Phase 8 – Report Generation | ⏳ |
| Phase 9 – Topic Modeling | ⏳ |
| Phase 10 – Hybrid Q&A (SQL + RAG) | ⏳ |
| Phase 11 – AI Recommendations | ⏳ |


---

# License

This project is being developed as part of **Smart India Hackathon (SIH) 2026** for educational and research purposes.