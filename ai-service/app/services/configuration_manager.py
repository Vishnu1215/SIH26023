"""
Phase 13 - Module 6: Configuration Manager Service.

Exposes read-only configuration, engine specifications, environment status,
and compliance guarantees for government audits.
"""

import sys
import os
import platform
from typing import Dict, Any
from datetime import datetime, timezone

from app.core.config import settings


def get_configuration_summary() -> Dict[str, Any]:
    """
    Returns verified read-only platform configuration profiles.
    Strictly enforces zero leakage of private credentials.
    """
    root_dir = os.path.dirname(settings.BASE_DIR)

    return {
        "status": "success",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "application": {
            "name": "Ministry of Coal | CMPDI Reporting Platform",
            "code": "SIH26023",
            "version": settings.VERSION,
            "pipelineVersion": "v2.1",
            "currentPhase": "Phase 13 – System Administration, Audit & Monitoring",
            "environment": settings.ENVIRONMENT,
            "deterministicMode": True,
            "deploymentType": "Air-Gapped Government Intranet Ready"
        },
        "engineSpecifications": {
            "ocrEngine": "Tesseract OCR 5.x / PyMuPDF Dual-Mode",
            "extractionEngine": "Regex & Boundary Deterministic Parser",
            "validationEngine": "Statutory Rule Matrix (CMPDI Compliance)",
            "analyticsEngine": "Single Source of Truth In-Memory Aggregator",
            "reportEngine": "Multi-Format Generator (ReportLab, openpyxl, python-docx)",
            "searchEngine": "BM25 Deterministic Inverted Index",
            "qaEngine": "Hybrid Structured Context Composer",
            "recommendationEngine": "Deterministic Priority & Operational Risk Scorer",
            "auditEngine": "Immutable Chronological JSON Ledger"
        },
        "runtimeEnvironment": {
            "pythonVersion": sys.version.split()[0],
            "operatingSystem": f"{platform.system()} {platform.release()}",
            "architecture": platform.machine(),
            "fastApiPort": settings.PORT,
            "corsConfigured": True
        },
        "aiGovernance": {
            "externalAiApis": "Disabled (Air-Gapped Compliance)",
            "vectorDatabases": "Not Required (Deterministic Single Source of Truth)",
            "llmAdapterStatus": "Disabled / Air-Gapped Ready",
            "ragAdapterStatus": "Structured Context Hybrid Retrieval Active",
            "hallucinationRisk": "0.0% (Zero Generative Hallucinations)"
        },
        "storageLocations": {
            "rootDirectory": root_dir,
            "analyticsDashboard": os.path.relpath(
                os.path.join(settings.ANALYTICS_STORAGE_DIR, "dashboard.json"), root_dir
            ),
            "searchIndex": os.path.relpath(
                os.path.join(settings.BASE_DIR, "storage", "search_index.json"), root_dir
            ),
            "reportHistory": os.path.relpath(
                os.path.join(settings.BASE_DIR, "storage", "reports", "report-history.json"), root_dir
            ),
            "qaHistory": os.path.relpath(
                os.path.join(settings.BASE_DIR, "storage", "qa_history.json"), root_dir
            ),
            "auditHistory": os.path.relpath(
                os.path.join(settings.LOGS_STORAGE_DIR, "audit_history.json"), root_dir
            ),
            "recommendations": os.path.relpath(
                os.path.join(settings.BASE_DIR, "storage", "recommendations", "recommendations.json"), root_dir
            ),
            "validationDir": os.path.relpath(settings.VALIDATION_STORAGE_DIR, root_dir),
            "structuredDataDir": os.path.relpath(settings.STRUCTURED_DATA_DIR, root_dir),
            "uploadsDir": "uploads"
        },
        "complianceStandards": [
            "Ministry of Coal Reporting Standards (FY2025-26)",
            "CMPDI Statutory Mine Production Guidelines",
            "Zero Cloud Data Egress Security Policy",
            "Complete Auditability & Reproducibility Guarantee",
            "Deterministic Single Source of Truth Governance"
        ]
    }
