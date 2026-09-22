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

✅ **Phase 5 – Structured Information Extraction & Normalization**

---

## Completed Phases

- ✅ Phase 1 – Project Setup
- ✅ Phase 2 – Authentication & Dashboard Foundation
- ✅ Phase 3 – Document Upload & Ingestion Pipeline
- ✅ Phase 4 – OCR & Document Text Extraction Pipeline
- ✅ Phase 5 – Structured Information Extraction & Normalization

---

## Upcoming Phases

- ⏳ Phase 6 – Validation Engine & Discrepancy Flagging
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

# Document Processing & Ingestion Workflow

```
User Upload (Documents Page)
            │
            ▼
POST /api/documents/upload (Express + Multer)
            │
            ├─► Save file to disk (uploads/documents/)
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
FastAPI returns OCR metadata + Structured Record to Express
            │
            ▼
Express DocumentModel updated (status: OCR Complete, structuredData, normalizationStatus)
            │
            ▼
Frontend Dashboard & Table updated:
- Dashboard: Validated Records count, Awaiting Validation count
- History Table: Structured Records badge, Normalization pill
- View Modal: Displays Normalized JSON side-by-side with OCR metadata & text preview
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
/api/documents/load-sample
```

Load representative datasets into memory.

---

## AI Service (FastAPI)

### POST

```
/ingest
```

Document Ingestion & Text Extraction endpoint.
- **Request**: `{ documentId, filePath, mimeType }`
- **Response**:
  ```json
  {
    "status": "OCR Complete",
    "documentId": "4a7c062c-633b-486a-bebf-5fafeea71d60",
    "processingTime": 0.42,
    "pageCount": 2,
    "confidence": null,
    "loaderUsed": "PDF_TEXT_LAYER",
    "language": "eng",
    "textPreview": "...",
    "errorCode": null,
    "errorMessage": null
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
- **Request**: `{ documentId, text, filename }`
- **Response**:
  ```json
  {
    "status": "success",
    "documentId": "4a7c062c-633b-486a-bebf-5fafeea71d60",
    "structuredRecordCount": 1,
    "structuredDataAvailable": true,
    "extractionTime": 0.05,
    "data": {
      "documentId": "4a7c062c-633b-486a-bebf-5fafeea71d60",
      "reportTitle": "Annual Coal Production Report",
      "reportType": "Ministry Report",
      "financialYear": "2023-24",
      "reportDate": "2024-04-15",
      "issuingOrganization": "BCCL",
      "subsidiary": "BCCL",
      "mineName": "Jharia",
      "mineType": "Opencast",
      "region": "Jharia Coalfield",
      "district": "Dhanbad",
      "state": "Jharkhand",
      "coalProduction": 142500,
      "overburdenRemoval": 320000,
      "targetProduction": 150000,
      "achievedProduction": 142500,
      "percentageAchievement": 95.0,
      "productionUnit": "MT",
      "extractedFieldsCount": 16,
      "extractedAt": "2026-09-22T14:15:00Z"
    }
  }
  ```

### GET

```
/extract/{document_id}
```

Retrieve stored structured JSON record from `ai-service/storage/structured_data/{documentId}.json`.



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

- Login using demo credentials
- Navigate to **Documents**
- Upload a supported file
- Verify upload success
- Verify upload history
- Verify files are stored in `uploads/documents`
- Test unsupported file types
- Test files larger than 20 MB
- Stop the AI service and verify upload fallback
- Load sample datasets

---

# Current Limitations

The following features are intentionally **not implemented** yet (scheduled for future phases):

- AI Entity Extraction (Named Entity Recognition)
- Multi-Source Cross-Validation & Validation Rules
- Discrepancy Flagging & Traceability Engine
- Database Integration (MongoDB / PostgreSQL)
- Report Generation (PDF / Excel)
- Topic Modeling (BERTopic / LDA)
- Hybrid SQL + RAG Conversational Assistant
- Predictive AI Recommendations

---

# Roadmap

| Phase | Status |
|--------|--------|
| Phase 1 – Project Setup | ✅ |
| Phase 2 – Authentication & Dashboard | ✅ |
| Phase 3 – Document Upload & Ingestion | ✅ |
| Phase 4 – OCR & Document Text Extraction | ✅ |
| Phase 5 – Entity Extraction, Validation & Traceability | ⏳ |
| Phase 6 – Report Generation | ⏳ |
| Phase 7 – Topic Modeling | ⏳ |
| Phase 8 – Hybrid Q&A | ⏳ |
| Phase 9 – AI Recommendations | ⏳ |


---

# License

This project is being developed as part of **Smart India Hackathon (SIH) 2026** for educational and research purposes.