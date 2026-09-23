"""
Master Report Generation Orchestrator for Phase 8.
Coordinates template data extraction, multi-format file synthesis (PDF, DOCX, XLSX, HTML),
and persistent metadata tracking in report-history.json.
Strictly deterministic with ZERO AI/LLM intervention.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from app.services.report_storage import (
    init_report_storage,
    save_report_record,
    get_report_by_id,
    get_report_file_path,
    get_report_history,
    delete_report
)
from app.services.report_templates import build_report_context
from app.services.html_generator import generate_html_report
from app.services.pdf_generator import generate_pdf_report
from app.services.docx_generator import generate_docx_report
from app.services.excel_generator import generate_excel_report


VALID_TYPES = ["executive", "production", "validation", "dashboard", "mine_performance", "custom"]
VALID_FORMATS = ["pdf", "docx", "xlsx", "excel", "html"]


def generate_report(
    report_type: str,
    export_format: str = "pdf",
    filters: Optional[Dict[str, Any]] = None,
    custom_sections: Optional[List[str]] = None,
    generated_by: str = "System Executive"
) -> Dict[str, Any]:
    """
    Generate a deterministic report document and persist in storage.
    Returns the report record metadata.
    """
    init_report_storage()

    clean_type = (report_type or "executive").strip().lower().replace(" ", "_").replace("-", "_")
    if clean_type not in VALID_TYPES:
        clean_type = "executive"

    fmt = (export_format or "pdf").strip().lower()
    if fmt == "excel":
        fmt = "xlsx"
    if fmt not in ["pdf", "docx", "xlsx", "html"]:
        fmt = "pdf"

    # Assemble context payload from dashboard.json
    context = build_report_context(clean_type, filters, custom_sections)

    report_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    file_ext = "xlsx" if fmt == "xlsx" else fmt
    base_name = f"{clean_type}_{timestamp}.{file_ext}"
    target_path = get_report_file_path(report_id, fmt, base_name)

    # Dispatch to appropriate generator
    if fmt == "html":
        html_content = generate_html_report(context)
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(html_content)
    elif fmt == "pdf":
        generate_pdf_report(context, target_path)
    elif fmt == "docx":
        generate_docx_report(context, target_path)
    elif fmt == "xlsx":
        generate_excel_report(context, target_path)

    # Compute file metadata
    file_size_bytes = os.path.getsize(target_path) if os.path.exists(target_path) else 0
    size_formatted = f"{file_size_bytes / 1024:.1f} KB" if file_size_bytes < 1048576 else f"{file_size_bytes / 1048576:.2f} MB"

    type_display_names = {
        "executive": "Executive Mining & Analytics Report",
        "production": "National Coal Production & Subsidiary Performance Report",
        "validation": "Deterministic Validation & Data Discrepancy Audit",
        "dashboard": "Executive Dashboard Comprehensive Snapshot",
        "mine_performance": "Mine Performance & Extraction Register",
        "custom": "Custom Analytical & Compliance Report"
    }

    record = {
        "reportId": report_id,
        "reportName": type_display_names.get(clean_type, "Statutory Report"),
        "reportType": clean_type,
        "format": fmt,
        "fileName": os.path.basename(target_path),
        "filePath": target_path,
        "fileSize": file_size_bytes,
        "fileSizeFormatted": size_formatted,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "generatedBy": generated_by,
        "sourceAnalyticsVersion": context.get("sourceAnalyticsVersion", 1),
        "totalRecordsAnalyzed": context.get("totalRecordsCount", 0),
        "parameters": {
            "filters": filters or {},
            "customSections": custom_sections or []
        }
    }

    # Save to history manifest
    save_report_record(record)
    return record


def preview_report(
    report_type: str,
    filters: Optional[Dict[str, Any]] = None,
    custom_sections: Optional[List[str]] = None
) -> str:
    """Generate and return inline HTML string for live preview."""
    clean_type = (report_type or "executive").strip().lower().replace(" ", "_").replace("-", "_")
    context = build_report_context(clean_type, filters, custom_sections)
    return generate_html_report(context)


def regenerate_report(report_id: str) -> Optional[Dict[str, Any]]:
    """Regenerate an existing report using its original configuration and fresh dashboard data."""
    existing = get_report_by_id(report_id)
    if not existing:
        return None

    report_type = existing.get("reportType", "executive")
    export_format = existing.get("format", "pdf")
    params = existing.get("parameters", {})
    filters = params.get("filters", {})
    custom_sections = params.get("customSections", [])
    generated_by = existing.get("generatedBy", "System Executive")

    # Generate new version
    return generate_report(
        report_type=report_type,
        export_format=export_format,
        filters=filters,
        custom_sections=custom_sections,
        generated_by=f"{generated_by} (Refreshed)"
    )
