import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { config } from '../config/index.js';
import documentModel from '../models/document.model.js';
import { DOCUMENT_STATUSES } from '../utils/documentMetadata.js';
import { computeFileSha256 } from '../utils/fileHash.js';

/**
 * Trigger text extraction and OCR processing pipeline via FastAPI AI service.
 * @param {Object} document - Document metadata record from DocumentModel
 * @returns {Promise<Object>} Updated document record
 */
export const processDocumentExtraction = async (document) => {
  if (!document || !document.documentId) {
    throw new Error('Invalid document object provided for text extraction.');
  }

  const { documentId } = document;

  // Resolve absolute file path
  let absoluteFilePath = document.filePath;
  if (!absoluteFilePath && document.storedName) {
    absoluteFilePath = path.resolve(config.upload.directory, document.storedName);
  }

  const startedAt = new Date().toISOString();

  // Update status to Processing
  documentModel.updateDocument(documentId, {
    status: DOCUMENT_STATUSES.PROCESSING,
    processingStartedAt: startedAt,
    filePath: absoluteFilePath
  });

  // Verify file exists on disk before dispatching
  if (!absoluteFilePath || !fs.existsSync(absoluteFilePath)) {
    const errorMsg = `File not found on disk at: ${absoluteFilePath}`;
    console.error(`[DocumentProcessing] ${errorMsg}`);
    return documentModel.updateDocument(documentId, {
      status: DOCUMENT_STATUSES.FAILED,
      errorCode: 'CORRUPTED_DOCUMENT',
      errorMessage: errorMsg,
      error: errorMsg,
      processingCompletedAt: new Date().toISOString()
    });
  }

  try {
    console.log(`[DocumentProcessing] Dispatching text extraction for: ${document.originalName} (${documentId})`);

    const fileHash = computeFileSha256(absoluteFilePath);
    const existingDocs = documentModel.getAllDocuments().map((d) => ({
      documentId: d.documentId,
      filename: d.originalName,
      fileHash: d.fileHash
    }));

    const payload = {
      documentId: document.documentId,
      filePath: absoluteFilePath,
      mimeType: document.mimeType,
      originalName: document.originalName,
      storedName: document.storedName,
      size: document.size,
      uploadedAt: document.uploadedAt,
      fileHash,
      existingDocuments: existingDocs
    };

    const response = await axios.post(`${config.aiServiceUrl}/ingest`, payload, {
      timeout: 120000 // 120s timeout for large multi-page PDFs / OCR
    });

    const isSuccess =
      response.data &&
      (response.data.status === 'OCR Complete' || response.data.status === 'completed');

    if (isSuccess) {
      const pageCount = response.data.pageCount || response.data.pages || 1;
      const structuredDataAvailable = response.data.structuredDataAvailable || (response.data.structuredData ? true : false);
      const structuredRecordCount = response.data.structuredRecordCount || (structuredDataAvailable ? 1 : 0);

      const validationStatus = response.data.validationStatus || 'Pending';
      const validationScore = response.data.validationScore !== undefined ? response.data.validationScore : null;
      const validatedAt = response.data.validatedAt || new Date().toISOString();

      const existingHistory = document.validationHistory || [];
      const historyItem = {
        validatedAt,
        score: validationScore,
        status: validationStatus,
        errorCount: response.data.errorCount || 0,
        warningCount: response.data.warningCount || 0
      };
      const updatedHistory = validationScore !== null ? [historyItem, ...existingHistory] : existingHistory;

      const updated = documentModel.updateDocument(documentId, {
        status: DOCUMENT_STATUSES.OCR_COMPLETE,
        pageCount,
        processingStartedAt: response.data.processingStartedAt || startedAt,
        processingCompletedAt: response.data.processingCompletedAt || new Date().toISOString(),
        processingTime: response.data.processingTime || 0,
        loaderUsed: response.data.loaderUsed || 'UNKNOWN',
        language: response.data.language || 'eng',
        confidence: response.data.confidence !== undefined ? response.data.confidence : null,
        textPreview: response.data.textPreview || null,
        errorCode: null,
        errorMessage: null,
        // Backward-compatible properties
        pages: pageCount,
        error: null,
        // Phase 5 Structured Information fields
        structuredDataAvailable,
        structuredRecordCount,
        extractionCompletedAt: new Date().toISOString(),
        normalizationStatus: structuredDataAvailable ? 'Normalized' : 'Pending',
        structuredData: response.data.structuredData || null,
        // Phase 6 Validation fields
        fileHash,
        validationStatus,
        validationScore,
        validationSummary: response.data.validationSummary || null,
        validationMessages: response.data.validationMessages || response.data.messages || [],
        messages: response.data.validationMessages || response.data.messages || [],
        rulesTriggered: response.data.rulesTriggered || [],
        errorCount: response.data.errorCount || 0,
        warningCount: response.data.warningCount || 0,
        infoCount: response.data.infoCount || 0,
        validationTime: response.data.validationTime || null,
        validatedAt,
        validationHistory: updatedHistory
      });

      console.log(
        `[DocumentProcessing] Success for ${document.originalName} via ${response.data.loaderUsed} in ${response.data.processingTime}s (Structured Data: ${structuredDataAvailable ? 'Extracted & Normalized' : 'None'})`
      );
      return updated;
    } else {
      const errorCode = response.data?.errorCode || 'UNKNOWN_ERROR';
      const errorMessage =
        response.data?.errorMessage || response.data?.error || 'Extraction returned failed status from AI service.';

      console.warn(`[DocumentProcessing] AI service reported failure [${errorCode}]: ${errorMessage}`);
      return documentModel.updateDocument(documentId, {
        status: DOCUMENT_STATUSES.FAILED,
        errorCode,
        errorMessage,
        error: errorMessage,
        processingCompletedAt: new Date().toISOString(),
        normalizationStatus: 'Failed'
      });
    }
  } catch (error) {
    const errorCode =
      error.response?.data?.errorCode ||
      (error.code === 'ECONNREFUSED' ? 'OCR_ENGINE_NOT_FOUND' : 'UNKNOWN_ERROR');

    const errorMessage =
      error.response?.data?.errorMessage ||
      error.response?.data?.error ||
      error.message ||
      'Failed to communicate with AI Service OCR pipeline.';

    console.error(`[DocumentProcessing] Extraction pipeline error for ${documentId} [${errorCode}]:`, errorMessage);

    return documentModel.updateDocument(documentId, {
      status: DOCUMENT_STATUSES.FAILED,
      errorCode,
      errorMessage,
      error: errorMessage,
      processingCompletedAt: new Date().toISOString(),
      normalizationStatus: 'Failed'
    });
  }
};

/**
 * Explicit on-demand structured information extraction trigger.
 * POST /api/documents/:documentId/extract
 * @param {string} documentId
 * @returns {Promise<Object>} Updated document record
 */
export const processStructuredExtraction = async (documentId) => {
  const document = documentModel.getDocumentById(documentId);
  if (!document) {
    throw new Error(`Document '${documentId}' not found.`);
  }

  try {
    const payload = {
      documentId: document.documentId,
      filename: document.originalName
    };

    const response = await axios.post(`${config.aiServiceUrl}/extract`, payload, {
      timeout: 30000
    });

    if (response.data && response.data.status === 'success') {
      const structuredData = response.data.data;
      return documentModel.updateDocument(documentId, {
        structuredDataAvailable: true,
        structuredRecordCount: response.data.structuredRecordCount || 1,
        extractionCompletedAt: new Date().toISOString(),
        normalizationStatus: 'Normalized',
        structuredData
      });
    }
    return document;
  } catch (err) {
    console.error(`[DocumentProcessing] Structured extraction on-demand error for ${documentId}:`, err.message);
    return document;
  }
};

/**
 * Explicit on-demand validation trigger.
 * POST /api/documents/:documentId/validate
 * @param {string} documentId
 * @returns {Promise<Object>} Updated document record
 */
export const processDocumentValidation = async (documentId) => {
  const document = documentModel.getDocumentById(documentId);
  if (!document) {
    throw new Error(`Document '${documentId}' not found.`);
  }

  // Ensure fileHash
  let fileHash = document.fileHash;
  if (!fileHash && document.filePath) {
    fileHash = computeFileSha256(document.filePath);
  }

  const existingDocs = documentModel.getAllDocuments().map((d) => ({
    documentId: d.documentId,
    filename: d.originalName,
    fileHash: d.fileHash
  }));

  try {
    const payload = {
      documentId: document.documentId,
      structuredData: document.structuredData,
      confidence: document.confidence,
      filename: document.originalName,
      fileHash,
      existingDocuments: existingDocs
    };

    const response = await axios.post(`${config.aiServiceUrl}/validate`, payload, {
      timeout: 30000
    });

    if (response.data && response.data.status === 'success') {
      const valData = response.data;
      const existingHistory = document.validationHistory || [];
      const historyItem = {
        validatedAt: valData.validatedAt || new Date().toISOString(),
        score: valData.validationScore,
        status: valData.validationStatus,
        errorCount: valData.errorCount || 0,
        warningCount: valData.warningCount || 0
      };
      const updatedHistory = [historyItem, ...existingHistory];

      return documentModel.updateDocument(documentId, {
        fileHash,
        validationStatus: valData.validationStatus,
        validationScore: valData.validationScore,
        validationSummary: valData.validationSummary,
        validationMessages: valData.validationMessages || valData.messages || [],
        messages: valData.validationMessages || valData.messages || [],
        rulesTriggered: valData.rulesTriggered || [],
        errorCount: valData.errorCount || 0,
        warningCount: valData.warningCount || 0,
        infoCount: valData.infoCount || 0,
        validationTime: valData.validationTime || null,
        validatedAt: valData.validatedAt || new Date().toISOString(),
        validationHistory: valData.validationHistory || updatedHistory
      });
    }
    return document;
  } catch (err) {
    console.error(`[DocumentProcessing] Validation on-demand error for ${documentId}:`, err.message);
    throw err;
  }
};

export default {
  processDocumentExtraction,
  processStructuredExtraction,
  processDocumentValidation
};

