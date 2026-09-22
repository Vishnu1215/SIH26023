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

✅ **Phase 4 – OCR & Document Text Extraction Pipeline**

---

## Completed Phases

- ✅ Phase 1 – Project Setup
- ✅ Phase 2 – Authentication & Dashboard Foundation
- ✅ Phase 3 – Document Upload & Ingestion Pipeline
- ✅ Phase 4 – OCR & Document Text Extraction Pipeline

---

## Upcoming Phases

- ⏳ Phase 5 – Entity Extraction, Validation & Traceability
- ⏳ Phase 6 – Report Generation
- ⏳ Phase 7 – Topic Modeling
- ⏳ Phase 8 – Hybrid Q&A (SQL + RAG)
- ⏳ Phase 9 – AI Recommendations


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
FastAPI returns metadata only: { status, documentId, processingTime, pageCount, confidence, loaderUsed }
            │
            ▼
Express DocumentModel updated (status: OCR Complete / Failed)
            │
            ▼
Frontend Table displays Pages, Duration, Engine, Confidence, Status Badge & View Modal
```

If FastAPI or OCR encounters an error:
```
File Upload Succeeded (HTTP 201)
            │
            ▼
Document Status set to 'Failed' with errorCode and errorMessage logged
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