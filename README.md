# SIH26023 – Ministry of Coal | CMPDI Intelligent Document Intelligence & Decision Support Platform

An end-to-end AI-powered platform developed for **Smart India Hackathon (SIH)** to automate document processing, validation, analytics, statutory reporting, document intelligence, intelligent search, hybrid question answering, executive recommendations, and system monitoring for the **Ministry of Coal** and **Central Mine Planning & Design Institute (CMPDI)**.

The platform transforms unstructured mining documents into structured, searchable, explainable, and decision-ready information while maintaining deterministic, auditable, and government-compliant processing.

---

# Overview

The Ministry of Coal and CMPDI process thousands of statutory reports, production statements, geological reports, safety documents, environmental clearances, circulars, and financial records every year.

Traditional manual processing is

- Time consuming
- Error-prone
- Difficult to audit
- Difficult to search
- Hard to analyze across subsidiaries and financial years

SIH26023 provides a unified platform that

- Extracts information from multiple document formats
- Validates statutory data
- Generates executive analytics
- Produces official reports
- Builds document intelligence
- Enables intelligent search
- Answers natural language questions
- Generates executive recommendations
- Monitors complete system health and audit history

---

# Key Features

## Multi-format Document Processing

Supports

- PDF
- DOCX
- XLSX
- CSV
- Images
- Scanned documents

with automatic OCR and structured information extraction.

---

## OCR & Information Extraction

- Digital PDF parsing
- Tesseract OCR for scanned documents
- Metadata extraction
- Mining entity extraction
- Production figures
- Mine information
- Subsidiary information
- Financial year extraction
- Location identification
- Normalization of extracted values

---

## Deterministic Validation Engine

Automatically validates extracted data using predefined statutory validation rules.

Features

- Rule-based validation
- Quality scoring
- Field completeness
- Missing value detection
- Duplicate detection
- Compliance verification
- Explainable validation results

---

## Executive Analytics Dashboard

Automatically computes

- National production
- Subsidiary performance
- Mine rankings
- Financial year summaries
- State-wise production
- Validation quality
- Operational KPIs
- Interactive visualizations

All analytics are stored inside

```
storage/analytics/dashboard.json
```

which serves as the **Single Source of Truth** across the platform.

---

## Government Report Generator

Generate official reports in

- PDF
- Microsoft Word
- Excel
- HTML

Available reports include

- Executive Report
- Production Report
- Validation Audit
- Dashboard Snapshot
- Mine Performance Register
- Custom Analytical Report

Reports follow Government of India formatting standards.

---

## Intelligent Document Understanding

Automatically enriches every processed document with

- Document Classification
- Topic Modeling
- Keyword Extraction
- Named Entity Recognition
- Executive Summary
- Related Documents
- Semantic Metadata

---

## Intelligent Search

Fast deterministic search across

- Mines
- Subsidiaries
- Financial Years
- Topics
- Keywords
- States
- Categories
- Organizations

Supports advanced filtering and cross-document discovery.

---

## Hybrid AI Question Answering

Evidence-backed conversational interface capable of answering questions about

- Coal production
- Subsidiary performance
- Validation
- Reports
- Documents
- Trends
- Mine statistics

Every response includes

- Supporting evidence
- Confidence score
- Citations
- Explainability
- Follow-up suggestions

The architecture is designed to support future RAG and Text-to-SQL integration while remaining fully deterministic by default.

---

## Executive Recommendations

Automatically generates

- Executive insights
- Operational recommendations
- Risk assessments
- Alerts
- Trend analysis
- Decision support

Recommendations are explainable, evidence-backed, and derived solely from verified platform data.

---

## Administration & Audit Dashboard

Provides administrators with

- System health
- Processing statistics
- Audit logs
- Runtime metrics
- Storage monitoring
- Configuration details
- Activity timeline
- API monitoring

---

# System Architecture

```
                 Upload Documents

                        │

                        ▼

             OCR & Text Extraction

                        │

                        ▼

          Structured Information Extraction

                        │

                        ▼

            Validation & Quality Checks

                        │

                        ▼

            Executive Analytics Engine

                        │

                        ▼

         Government Report Generation

                        │

                        ▼

      Intelligent Document Understanding

                        │

                        ▼

         Semantic Search & Discovery

                        │

                        ▼

       Hybrid AI Question Answering

                        │

                        ▼

      Executive Recommendations Engine

                        │

                        ▼

     System Monitoring & Audit Dashboard
```

---

# Technology Stack

## Frontend

- React 18
- Vite
- JavaScript
- Axios
- Recharts
- Tailwind CSS
- Custom Government UI

---

## Backend

- Node.js
- Express.js
- FastAPI
- Python 3
- REST APIs

---

## Document Processing

- PyMuPDF
- python-docx
- openpyxl
- pandas
- csv
- Tesseract OCR
- Pillow

---

## Report Generation

- ReportLab
- python-docx
- openpyxl
- HTML Templates

---

## Storage

File-based JSON architecture

```
storage/

├── extracted_text/
├── structured_data/
├── validation/
├── analytics/
├── reports/
├── document_intelligence/
├── recommendations/
├── logs/
├── search_index.json
├── query_history.json
├── qa_history.json
```

No external database is required.

---

# Project Structure

```
SIH26023/

├── ai-service/
│   ├── app/
│   ├── storage/
│   └── requirements.txt
│
├── server/
│
├── client/
│
├── uploads/
│
├── sample-data/
│
├── docs/
│
└── README.md
```

---

# Core Modules

- Document Ingestion
- OCR Pipeline
- Information Extraction
- Validation Engine
- Analytics Engine
- Report Generator
- Document Intelligence
- Intelligent Search
- Hybrid AI Question Answering
- Executive Recommendation Engine
- Administration & Audit

---

# API Overview

### Documents

- Upload Documents
- Process Documents
- Extract Information
- Validate Documents

### Analytics

- Dashboard
- Production Statistics
- Financial Year Analysis
- Validation Statistics

### Reports

- Generate Reports
- Preview Reports
- Download Reports
- Report History

### Intelligence

- Process Intelligence
- Document Intelligence
- Intelligent Search
- Search Reindex

### Hybrid QA

- Ask Questions
- Explain Answers
- Suggestions
- History

### Recommendations

- Executive Recommendations
- Alerts
- Risk Assessment
- Insights
- Trend Analysis

### Administration

- System Health
- Processing Statistics
- Runtime Metrics
- Storage Monitoring
- Audit History
- Configuration

---

# Design Principles

The platform is designed around the following principles.

- Deterministic Processing
- Explainable Results
- Zero Hallucinations
- Government Audit Compliance
- Single Source of Truth
- Modular Architecture
- High Performance
- Extensible Design

---

# Performance

Typical processing performance

| Operation | Average Time |
|------------|-------------|
| OCR | <100 ms |
| Validation | <20 ms |
| Analytics | <20 ms |
| Search | <15 ms |
| Question Answering | <50 ms |
| Recommendation Generation | <20 ms |

---

# Single Source of Truth

The platform strictly follows a Single Source of Truth architecture.

```
storage/analytics/dashboard.json
```

All executive dashboards, reports, recommendations, question answering, and insights consume analytics from this consolidated dataset rather than recomputing values.

---

# Future Enhancements

- Enterprise Authentication
- Role-Based Access Control (RBAC)
- Watch Folder Automation
- Real-time Notifications
- Cloud Deployment
- Multi-language OCR Improvements
- Plug-in LLM Support
- Enterprise Search Scaling
- Database-backed Storage
- Production Monitoring

---

# Getting Started

## Clone Repository

```bash
git clone https://github.com/<your-username>/SIH26023.git
```

---

## Backend

```bash
cd server
npm install
npm run dev
```

---

## AI Service

```bash
cd ai-service

python -m venv .venv

source .venv/bin/activate
```

Windows

```bash
.venv\Scripts\activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Run

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Frontend

```bash
cd client

npm install

npm run dev
```

---

# Contributors

Developed for **Smart India Hackathon (SIH)**

Problem Statement: **Ministry of Coal | CMPDI Intelligent Document Intelligence & Decision Support Platform**

---

# License

This project is developed for educational, research, and Smart India Hackathon purposes.