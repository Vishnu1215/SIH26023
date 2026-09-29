from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class FullDocumentResponse(BaseModel):
    documentId: str
    metadata: Dict[str, Any] = Field(..., description="Document metadata from documents collection")
    ocrInformation: Dict[str, Any] = Field(default_factory=dict, description="OCR details from ocr_results collection")
    structuredJson: Dict[str, Any] = Field(default_factory=dict, description="Normalized JSON and tables from structured_records")
    validationSummary: Dict[str, Any] = Field(default_factory=dict, description="Validation overview from validation_results")
    validationMessages: List[Dict[str, Any]] = Field(default_factory=list, description="Validation issues from validation_results")
    executiveSummary: str = Field(default="", description="Executive summary from structured_records or intelligence")
    analytics: Dict[str, Any] = Field(default_factory=dict, description="Document-level analytics metrics")
    productionSummary: Dict[str, Any] = Field(default_factory=dict, description="Production numbers and targets")
    dataQuality: Dict[str, Any] = Field(default_factory=dict, description="Data completeness and quality scores")
    topicClassification: List[str] = Field(default_factory=list, description="Topics classified for document")

class IngestResponseSchema(BaseModel):
    status: str
    documentId: str
    processingTime: Optional[float] = None
    pageCount: Optional[int] = None
    confidence: Optional[float] = None
    loaderUsed: Optional[str] = None
    processingStartedAt: Optional[str] = None
    processingCompletedAt: Optional[str] = None
    language: Optional[str] = None
    textPreview: Optional[str] = None
    errorCode: Optional[str] = None
    errorMessage: Optional[str] = None
    structuredDataAvailable: bool = False
    structuredRecordCount: int = 0
    structuredData: Optional[Dict[str, Any]] = None
    validationStatus: Optional[str] = "Pending"
    validationScore: Optional[int] = None
    validationSummary: Optional[str] = None
    validationMessages: Optional[List[Dict[str, Any]]] = None
    messages: Optional[List[Dict[str, Any]]] = None
    rulesTriggered: Optional[List[str]] = None
    errorCount: int = 0
    warningCount: int = 0
    infoCount: int = 0
    validationTime: Optional[float] = None
    validatedAt: Optional[str] = None
