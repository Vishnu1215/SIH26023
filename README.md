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

✅ **Phase 3 – Document Upload & Ingestion Pipeline**

---

## Completed Phases

- ✅ Phase 1 – Project Setup
- ✅ Phase 2 – Authentication & Dashboard Foundation
- ✅ Phase 3 – Document Upload & Ingestion Pipeline

---

## Upcoming Phases

- ⏳ Phase 4 – OCR & AI Extraction
- ⏳ Phase 5 – Validation & Traceability
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

# Upload Workflow

```
User

↓

Documents Page

↓

Drag & Drop / Browse

↓

POST /api/documents/upload

↓

Express + Multer

↓

uploads/documents/

↓

Generate Metadata

↓

POST /ingest

↓

FastAPI

↓

Uploaded

↓

History Table
```

If FastAPI is offline

```
Uploaded

↓

Uploaded (Pending AI)
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

## Documents

### POST

```
/api/documents/upload
```

Upload a document.

---

### GET

```
/api/documents
```

Retrieve uploaded document metadata.

---

### GET

```
/api/documents/:documentId
```

Retrieve a single uploaded document.

---

### POST

```
/api/documents/load-sample
```

Load representative datasets.

---

## AI Service

### POST

```
/ingest
```

Mock ingestion endpoint.

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

The following features are intentionally **not implemented** yet:

- OCR
- AI Extraction
- OpenCV Processing
- Gemini Integration
- Data Validation
- Rule Engine
- MongoDB
- PostgreSQL
- Report Generation
- Topic Modeling
- Hybrid SQL + RAG
- AI Recommendations

---

# Roadmap

| Phase | Status |
|--------|--------|
| Phase 1 – Project Setup | ✅ |
| Phase 2 – Authentication & Dashboard | ✅ |
| Phase 3 – Document Upload & Ingestion | ✅ |
| Phase 4 – OCR & AI Extraction | ⏳ |
| Phase 5 – Validation & Traceability | ⏳ |
| Phase 6 – Report Generation | ⏳ |
| Phase 7 – Topic Modeling | ⏳ |
| Phase 8 – Hybrid Q&A | ⏳ |
| Phase 9 – AI Recommendations | ⏳ |

---

# License

This project is being developed as part of **Smart India Hackathon (SIH) 2026** for educational and research purposes.