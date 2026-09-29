from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class IngestRequestSchema(BaseModel):
    documentId: str
    filePath: str
    mimeType: Optional[str] = ""
    originalName: Optional[str] = None
    storedName: Optional[str] = None
    size: Optional[int] = None
    uploadedAt: Optional[str] = None
    fileHash: Optional[str] = None
    category: Optional[str] = None
    subsidiary: Optional[str] = None
    financialYear: Optional[str] = None
    mineName: Optional[str] = None
    existingDocuments: Optional[List[Dict[str, Any]]] = None

class DocumentCreateSchema(BaseModel):
    documentId: str
    fileName: str
    filePath: Optional[str] = None
    category: Optional[str] = "01_production"
    reportType: Optional[str] = "Report"
    financialYear: Optional[str] = "FY 2023-24"
    issuingOrganization: Optional[str] = "Ministry of Coal"
    subsidiary: Optional[str] = "CIL"
    mineName: Optional[str] = None
    mineType: Optional[str] = "Open Cast"
    state: Optional[str] = "National"
    district: Optional[str] = None
    status: Optional[str] = "Uploaded"
    sha256: Optional[str] = None
    size: Optional[int] = None
    mimeType: Optional[str] = "application/pdf"

class SearchQuerySchema(BaseModel):
    query: Optional[str] = ""
    mine: Optional[str] = ""
    subsidiary: Optional[str] = ""
    state: Optional[str] = ""
    financialYear: Optional[str] = ""
    category: Optional[str] = ""
    topic: Optional[str] = ""
    limit: Optional[int] = 30

class QAQueryRequestSchema(BaseModel):
    question: str = Field(..., description="Natural language prompt")
    useLLM: bool = Field(default=False)
    documentId: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None

class ReportReviewDraftSchema(BaseModel):
    title: Optional[str] = None
    executiveSummary: Optional[str] = None
    remarks: Optional[str] = None
    recommendations: Optional[str] = None
    reviewerName: Optional[str] = None
    reviewerDesignation: Optional[str] = None
    comments: Optional[str] = None

class ReportReviewDecisionSchema(BaseModel):
    reviewerName: Optional[str] = None
    reviewerDesignation: Optional[str] = None
    reviewerComments: Optional[str] = None
