import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { config } from '../config/index.js';
import documentModel from '../models/document.model.js';
import { DOCUMENT_STATUSES } from '../utils/documentMetadata.js';

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

    const payload = {
      documentId: document.documentId,
      filePath: absoluteFilePath,
      mimeType: document.mimeType,
      originalName: document.originalName,
      storedName: document.storedName,
      size: document.size,
      uploadedAt: document.uploadedAt
    };

    const response = await axios.post(`${config.aiServiceUrl}/ingest`, payload, {
      timeout: 120000 // 120s timeout for large multi-page PDFs / OCR
    });

    const isSuccess =
      response.data &&
      (response.data.status === 'OCR Complete' || response.data.status === 'completed');

    if (isSuccess) {
      const pageCount = response.data.pageCount || response.data.pages || 1;
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
        error: null
      });

      console.log(
        `[DocumentProcessing] Success for ${document.originalName} via ${response.data.loaderUsed} in ${response.data.processingTime}s (confidence: ${response.data.confidence})`
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
        processingCompletedAt: new Date().toISOString()
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
      processingCompletedAt: new Date().toISOString()
    });
  }
};


export default {
  processDocumentExtraction
};
