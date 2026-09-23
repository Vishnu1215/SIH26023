"""
FastAPI Router for Phase 8 Report Generation & Management.
Exposes endpoints to generate, preview, download, regenerate, and delete statutory reports.
"""

import os
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field

from app.services.report_storage import (
    get_report_history,
    get_report_by_id,
    delete_report as remove_report
)
from app.services.report_generator import (
    generate_report,
    preview_report,
    regenerate_report
)

router = APIRouter(prefix="/reports", tags=["Reports"])


class GenerateReportRequest(BaseModel):
    reportType: str = Field(default="executive", description="Type: executive, production, validation, dashboard, mine_performance, custom")
    format: str = Field(default="pdf", description="Format: pdf, docx, xlsx, html")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Deterministic filters")
    customSections: Optional[List[str]] = Field(default_factory=list, description="Sections to include if reportType is custom")
    generatedBy: Optional[str] = Field(default="System Executive", description="User or role creating report")


class PreviewReportRequest(BaseModel):
    reportType: str = Field(default="executive")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    customSections: Optional[List[str]] = Field(default_factory=list)


@router.post("/generate", summary="Generate a new statutory report")
async def api_generate_report(req: GenerateReportRequest):
    try:
        record = generate_report(
            report_type=req.reportType,
            export_format=req.format,
            filters=req.filters,
            custom_sections=req.customSections,
            generated_by=req.generatedBy or "System Executive"
        )
        return {
            "status": "success",
            "message": "Report generated successfully.",
            "report": record
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")


@router.get("", summary="List all generated reports")
async def api_get_reports():
    try:
        history = get_report_history()
        return {
            "status": "success",
            "count": len(history),
            "reports": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch report history: {str(e)}")


@router.get("/{report_id}", summary="Get metadata for a specific report")
async def api_get_report_by_id(report_id: str):
    record = get_report_by_id(report_id)
    if not record:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "status": "success",
        "report": record
    }


@router.get("/{report_id}/file", summary="Download report file binary")
async def api_download_report_file(report_id: str):
    record = get_report_by_id(report_id)
    if not record:
        raise HTTPException(status_code=404, detail="Report record not found")
    
    file_path = record.get("filePath")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    fmt = record.get("format", "pdf").lower()
    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "html": "text/html"
    }

    return FileResponse(
        path=file_path,
        media_type=media_types.get(fmt, "application/octet-stream"),
        filename=record.get("fileName", f"report.{fmt}")
    )


@router.post("/preview", summary="Generate inline HTML preview for custom parameters")
async def api_preview_report(req: PreviewReportRequest):
    try:
        html = preview_report(
            report_type=req.reportType,
            filters=req.filters,
            custom_sections=req.customSections
        )
        return HTMLResponse(content=html, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")


@router.get("/{report_id}/preview", summary="Preview existing report in HTML format")
async def api_preview_existing_report(report_id: str):
    record = get_report_by_id(report_id)
    if not record:
        raise HTTPException(status_code=404, detail="Report not found")

    params = record.get("parameters", {})
    html = preview_report(
        report_type=record.get("reportType", "executive"),
        filters=params.get("filters", {}),
        custom_sections=params.get("customSections", [])
    )
    return HTMLResponse(content=html, status_code=200)


@router.post("/{report_id}/regenerate", summary="Regenerate an existing report with latest data")
async def api_regenerate_report(report_id: str):
    record = regenerate_report(report_id)
    if not record:
        raise HTTPException(status_code=404, detail="Original report not found to regenerate")
    return {
        "status": "success",
        "message": "Report regenerated successfully with latest analytics.",
        "report": record
    }


@router.delete("/{report_id}", summary="Delete report and associated file")
async def api_delete_report(report_id: str):
    success = remove_report(report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found or could not be deleted")
    return {
        "status": "success",
        "message": "Report deleted successfully.",
        "reportId": report_id
    }
