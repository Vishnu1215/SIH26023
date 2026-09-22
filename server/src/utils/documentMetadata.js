import { v4 as uuidv4 } from 'uuid';

export const DOCUMENT_CATEGORIES = {
  UNKNOWN: 'Unknown',
  PRODUCTION: 'Production',
  SUBSIDIARY_PRODUCTION: 'Subsidiary Production',
  GEOLOGICAL_RESOURCES: 'Geological Resources',
  CMPDI_DOCUMENTS: 'CMPDI Documents',
  PARLIAMENTARY_QA: 'Parliamentary QA',
  MINISTRY_REPORTS: 'Ministry Reports',
  COAL_QUALITY: 'Coal Quality',
  OFFICIAL_CCO_EXCEL: 'Official CCO Excel',
  MINE_MASTER: 'Mine Master',
  HISTORICAL_DATA: 'Historical Data'
};

export const DOCUMENT_STATUSES = {
  UPLOADED: 'Uploaded',
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  OCR_COMPLETE: 'OCR Complete',
  FAILED: 'Failed',
  // Backward compatibility alias
  COMPLETED: 'OCR Complete',
  UPLOADED_PENDING_AI: 'Uploaded (Pending AI)'
};

/**
 * Generate standard document metadata object
 * @param {Object} file - Multer file object or file stats object
 * @param {string} [category=Unknown] - Document domain category
 * @param {string} [status=Uploaded] - Ingestion status
 * @param {Object} [extra={}] - Additional custom properties
 * @returns {Object} Standardized document metadata
 */
export const createDocumentMetadata = (
  file,
  category = DOCUMENT_CATEGORIES.UNKNOWN,
  status = DOCUMENT_STATUSES.UPLOADED,
  extra = {}
) => {
  return {
    documentId: uuidv4(),
    originalName: file.originalname || file.name,
    storedName: file.filename || file.storedName,
    filePath: file.path || extra.filePath || null,
    category: category || DOCUMENT_CATEGORIES.UNKNOWN,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.size,
    uploadedAt: new Date().toISOString(),
    status,
    pageCount: null,
    processingStartedAt: null,
    processingCompletedAt: null,
    processingTime: null,
    loaderUsed: null,
    language: 'eng',
    confidence: null,
    errorCode: null,
    errorMessage: null,
    textPreview: null,
    extractedText: null,
    ...extra
  };
};


