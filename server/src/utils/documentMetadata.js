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
  UPLOADED_PENDING_AI: 'Uploaded (Pending AI)',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed'
};

/**
 * Generate standard document metadata object
 * @param {Object} file - Multer file object or file stats object
 * @param {string} [category=Unknown] - Document domain category
 * @param {string} [status=Uploaded] - Ingestion status
 * @returns {Object} Standardized document metadata
 */
export const createDocumentMetadata = (
  file,
  category = DOCUMENT_CATEGORIES.UNKNOWN,
  status = DOCUMENT_STATUSES.UPLOADED
) => {
  return {
    documentId: uuidv4(),
    originalName: file.originalname || file.name,
    storedName: file.filename || file.storedName,
    category: category || DOCUMENT_CATEGORIES.UNKNOWN,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.size,
    uploadedAt: new Date().toISOString(),
    status
  };
};
