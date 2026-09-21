# SIH26023 – AI-Assisted Geological, Mining & Reporting Platform

## Smart India Hackathon 2026

An AI-powered enterprise platform for **CMPDI (Central Mine Planning & Design Institute)** and **Coal India Limited (CIL)** subsidiaries to automate geological document processing, structured data extraction, validation, reporting, hybrid AI-based query answering, and policy recommendation generation.

---

# Problem Statement

CMPDI and CIL subsidiaries process large volumes of geological reports, borehole logs, production records, parliamentary replies, spreadsheets, scanned documents, and historical archives.

The current workflow is largely manual, resulting in:

- High dependence on domain experts
- Slow report generation
- Manual errors
- Difficult historical data retrieval
- Limited analytical capabilities

This project aims to build an AI-assisted platform that automates document processing while maintaining traceability, validation, and human review.

---

# Project Objectives

- Automate document ingestion
- Process PDFs, Images, DOCX, XLSX and CSV files
- OCR scanned documents
- Extract mining-domain entities
- Validate extracted information
- Generate automated reports
- Hybrid AI Query System (Text-to-SQL + RAG)
- Topic Modeling & Word Cloud
- AI-assisted Recommendations
- Human-in-the-loop review
- Complete Audit Trail

---

# Tech Stack

## Frontend

- React
- Vite
- React Router
- Lucide React
- CSS

## Backend

- Node.js
- Express.js
- JWT Authentication

## AI Service

- FastAPI
- Python

## Database (Upcoming)

- MongoDB
- FAISS / ChromaDB

## AI & NLP (Upcoming)

- Gemini API
- Sentence Transformers
- OCR
- OpenCV
- PaddleOCR
- BERTopic

---

# Project Structure

```text
SIH26023/

├── ai-service/
│
├── client/
│
├── server/
│
├── docs/
│   ├── api/
│   ├── architecture/
│   └── prompts/
│
├── uploads/
│
├── reports/
│
├── sample-data/
│
├── README.md
└── .gitignore
```

---

# Development Progress

- [x] Phase 1 – Project Foundation
- [x] Phase 2 – Authentication & Dashboard Foundation
- [ ] Phase 3 – Document Upload & Ingestion Pipeline
- [ ] Phase 4 – OCR & Entity Extraction
- [ ] Phase 5 – Validation & Traceability Engine
- [ ] Phase 6 – Report Generation
- [ ] Phase 7 – Topic Modeling & Word Cloud
- [ ] Phase 8 – Hybrid AI Query (Text-to-SQL + RAG)
- [ ] Phase 9 – AI Recommendations
- [ ] Phase 10 – Testing, Evaluation & Final Demo

---

# Completed Features

## Phase 1 – Project Foundation

### Project Setup

- Modular project architecture
- React + Vite frontend
- Express backend
- FastAPI AI service
- Git repository
- GitHub integration
- Professional folder structure

### Backend

- Express server
- Health APIs

### AI Service

- FastAPI
- Swagger documentation
- Health endpoint

### Documentation

- Project documentation folders
- Sample data folder
- Root README
- .gitignore

---

## Phase 2 – Authentication & Dashboard Foundation

### Authentication

- JWT Authentication
- Mock Admin Login
- Protected Routes
- Logout
- Session Persistence
- Authentication Middleware
- `/api/auth/login`
- `/api/auth/me`

### Dashboard

- Professional Government-style Login Page
- Dashboard Layout
- Sidebar Navigation
- Top Navigation Bar
- Responsive Layout
- Empty Workspace
- Dynamic Statistic Cards
- Empty-state Dashboard

### Dashboard Modules

- Dashboard
- Documents
- Report Generator
- Topic Modeling
- Hybrid Q&A
- AI Recommendations
- Settings

### UI Improvements

- Removed development module badges
- Replaced hardcoded statistics with dynamic placeholders
- Added professional empty-state message
- Upload button placeholder for future phases

---

# Current Dashboard Status

| Feature | Status |
|----------|--------|
| Authentication | ✅ |
| Dashboard | ✅ |
| Protected Routes | ✅ |
| Sidebar | ✅ |
| Navbar | ✅ |
| Statistics Cards | ✅ |
| Empty State | ✅ |
| Upload Module | ⏳ |
| OCR | ⏳ |
| Reports | ⏳ |
| Hybrid AI | ⏳ |

---

# API Endpoints

## Backend

| Method | Endpoint | Description |
|----------|----------|-------------|
| GET | `/health` | Backend Health |
| GET | `/api/health` | API Health |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Authenticated User |

## AI Service

| Method | Endpoint | Description |
|----------|----------|-------------|
| GET | `/health` | AI Service Health |
| GET | `/docs` | Swagger Documentation |

---

# Running the Project

## Backend

```bash
cd server
npm install
npm start
```

---

## Frontend

```bash
cd client
npm install
npm run dev
```

---

## AI Service

```bash
cd ai-service

py -m venv .venv

.venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

---

# Demo Credentials

## Administrator

```
Username : admin
Password : admin123
```

---

# Upcoming Features

## Phase 3

- Document Upload
- File Validation
- Upload History
- Metadata Generation
- Express ↔ FastAPI Integration

## Phase 4

- OCR Pipeline
- PDF Parsing
- Image Processing
- Table Detection
- Hindi OCR
- Entity Extraction

## Phase 5

- Validation Rules Engine
- Traceability
- Confidence Scores
- Source Mapping

## Phase 6

- Automated Report Generation
- PDF Export
- DOCX Export
- XLSX Export

## Phase 7

- Topic Modeling
- BERTopic
- TF-IDF
- Word Cloud
- Trend Analysis

## Phase 8

- Hybrid AI Query
- Text-to-SQL
- RAG
- Parliamentary Query Support

## Phase 9

- AI Recommendations
- Trend Detection
- Policy Suggestions
- Human Review Workflow

---

# Future Enhancements

- MongoDB Integration
- OCR Optimization
- Local LLM Support (Ollama)
- Cloud Deployment
- Role-Based Access Control (RBAC)
- Audit Logging
- Analytics Dashboard
- Multi-language Support
- Performance Optimization

---

# Team

**Smart India Hackathon 2026**

Problem Statement: **SIH26023**

---

# Project Status

**Current Version:** Phase 2 Complete ✅

Next Milestone: **Phase 3 – Document Upload & Ingestion Pipeline**