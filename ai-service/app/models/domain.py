"""
Domain Models representing MongoDB Collections for Coal Portal.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class DocumentModel(BaseModel):
    documentId: str = Field(..., description="Unique document UUID")
    fileName: str = Field(..., description="Original or display file name")
    uploadTime: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    reportType: Optional[str] = "Report"
    financialYear: Optional[str] = "FY 2023-24"
    issuingOrganization: Optional[str] = "Ministry of Coal"
    subsidiary: Optional[str] = "CIL"
    mineName: Optional[str] = None
    mineType: Optional[str] = "Open Cast / Mixed"
    state: Optional[str] = "National"
    district: Optional[str] = None
    category: str = Field(default="01_production", description="Category classification code")
    status: str = Field(default="Uploaded", description="Workflow state (e.g. Uploaded, OCR Complete, Validated, Error)")
    filePath: Optional[str] = None
    sha256: Optional[str] = None
    uploadStatus: Optional[str] = "Success"
    
    # Interoperability fields
    originalName: Optional[str] = None
    storedName: Optional[str] = None
    size: Optional[int] = None
    mimeType: Optional[str] = "application/pdf"
    uploadedAt: Optional[str] = None
    confidence: Optional[float] = None
    pageCount: Optional[int] = None
    validationScore: Optional[int] = None
    validationStatus: Optional[str] = "Pending"
    processingTime: Optional[float] = None


class OCRResultModel(BaseModel):
    documentId: str = Field(..., description="Foreign key to document")
    pages: int = Field(default=1, description="Total number of scanned/read pages")
    extractedText: str = Field(default="", description="Complete raw text extracted via OCR/text loaders")
    language: str = Field(default="eng", description="Detected primary document language")
    processingTime: float = Field(default=0.0, description="Processing duration in seconds")
    ocrEngine: str = Field(default="PyMuPDF + Tesseract OCR", description="Extraction engine used")
    extractedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StructuredRecordModel(BaseModel):
    documentId: str = Field(..., description="Foreign key to document")
    normalizedJson: Dict[str, Any] = Field(default_factory=dict, description="Normalized factual tables and schema")
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted named entities (mines, subsidiaries, metrics)")
    extractedTopics: List[str] = Field(default_factory=list, description="Extracted classification and domain topics")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Standardized report header and tabular metadata")
    summary: str = Field(default="", description="Executive concise factual summary")
    extractedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ValidationResultModel(BaseModel):
    documentId: str = Field(..., description="Foreign key to document")
    score: int = Field(default=100, ge=0, le=100, description="Quality and statutory compliance score")
    status: str = Field(default="Valid", description="Status: Valid, Warning, Error, Pending")
    errors: int = Field(default=0, description="Total critical validation errors")
    warnings: int = Field(default=0, description="Total warning notices")
    validationMessages: List[Dict[str, Any]] = Field(default_factory=list, description="Detailed validation breakdown")
    executedRules: List[str] = Field(default_factory=list, description="List of rule IDs evaluated")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AnalyticsModel(BaseModel):
    documentId: Optional[str] = Field(default=None, description="Document ID or 'consolidated_dashboard'")
    type: str = Field(default="document", description="'document' or 'consolidated'")
    productionSummary: Optional[Dict[str, Any]] = None
    compliance: Optional[Dict[str, Any]] = None
    qualityScore: Optional[float] = None
    dashboardMetrics: Optional[Dict[str, Any]] = None
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RAGChunkModel(BaseModel):
    documentId: str = Field(..., description="Foreign key to document")
    chunkNumber: int = Field(..., description="Sequence number of chunk")
    text: str = Field(..., description="Chunk text content")
    embedding: List[float] = Field(default_factory=list, description="Dense vector embedding")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata tags for chunk filtering")
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ChatHistoryModel(BaseModel):
    documentId: Optional[str] = Field(default=None, description="Document context ID or null for global")
    question: str = Field(..., description="User query / prompt")
    answer: str = Field(..., description="AI response backed by citations")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    queryType: Optional[str] = "rag"
    confidence: Optional[float] = 1.0
    evidence: Optional[List[Dict[str, Any]]] = None
    responseTimeMs: Optional[float] = None


class ReportReviewModel(BaseModel):
    reportId: str = Field(..., description="Unique report ID")
    status: str = Field(default="Draft", description="Draft, Approved, Revision Requested")
    title: Optional[str] = None
    executiveSummary: Optional[str] = None
    remarks: Optional[str] = None
    recommendations: Optional[str] = None
    reviewerName: Optional[str] = None
    reviewerDesignation: Optional[str] = None
    comments: Optional[str] = None
    approvedBy: Optional[str] = None
    approvedAt: Optional[str] = None
    rejectedBy: Optional[str] = None
    rejectedAt: Optional[str] = None
    auditTrail: List[Dict[str, Any]] = Field(default_factory=list)
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
