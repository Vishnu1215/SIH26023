import path from 'path';
import {
  createDocumentMetadata,
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES
} from '../utils/documentMetadata.js';
import documentModel from '../models/document.model.js';
import {
  saveDocument,
  getAllDocuments,
  loadSampleDataset
} from '../services/document.service.js';
import { processDocumentExtraction } from '../services/documentProcessing.service.js';

/**
 * Handle document upload & trigger text extraction
 * POST /api/documents/upload
 */
export const uploadDocument = async (req, res, next) => {
  try {
    const category = req.body?.category || DOCUMENT_CATEGORIES.UNKNOWN;
    const absPath = path.resolve(req.file.path);

    // Create metadata initially marked as Queued
    const metadata = createDocumentMetadata(
      req.file,
      category,
      DOCUMENT_STATUSES.QUEUED,
      { filePath: absPath }
    );

    // Save initial record to in-memory DocumentModel
    const initialDoc = saveDocument(metadata);

    // Trigger text extraction pipeline via AI service
    const processedDoc = await processDocumentExtraction(initialDoc);

    const isSuccess = processedDoc.status === DOCUMENT_STATUSES.OCR_COMPLETE;
    return res.status(201).json({
      success: true,
      message: isSuccess
        ? 'Document uploaded and OCR complete.'
        : `Document uploaded successfully, but OCR processing encountered an issue: ${processedDoc.errorMessage || 'Failed'}.`,
      document: processedDoc
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Trigger text extraction for an existing registered document
 * POST /api/documents/:documentId/process
 */
export const processDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const document = documentModel.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.'
      });
    }

    const processedDoc = await processDocumentExtraction(document);
    const isSuccess = processedDoc.status === DOCUMENT_STATUSES.OCR_COMPLETE;
    return res.status(200).json({
      success: true,
      message: isSuccess
        ? 'Text extraction and structured information extraction completed successfully.'
        : 'Text extraction failed.',
      document: processedDoc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger structured information extraction explicitly
 * POST /api/documents/:documentId/extract
 */
export const extractDocumentStructured = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const document = documentModel.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.'
      });
    }

    const { processStructuredExtraction } = await import('../services/documentProcessing.service.js');
    const updated = await processStructuredExtraction(documentId);
    return res.status(200).json({
      success: true,
      message: 'Structured information extraction completed.',
      document: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger validation engine explicitly
 * POST /api/documents/:documentId/validate
 */
export const validateDocumentAction = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const document = documentModel.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.'
      });
    }

    const { processDocumentValidation } = await import('../services/documentProcessing.service.js');
    const updated = await processDocumentValidation(documentId);
    return res.status(200).json({
      success: true,
      message: 'Document validation completed successfully.',
      document: updated
    });
  } catch (error) {
    next(error);
  }
};



/**
 * Get all documents sorted newest first from MongoDB
 * GET /api/documents
 */
export const getDocuments = async (req, res) => {
  try {
    const documents = await getAllDocuments();
    return res.status(200).json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents.'
    });
  }
};

/**
 * Get single document by ID from MongoDB
 * GET /api/documents/:documentId
 */
export const getDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    let document = await getDocumentById(documentId);
    if (!document) {
      document = documentModel.getDocumentById(documentId);
    }
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.'
      });
    }
    return res.status(200).json({
      success: true,
      document
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve document.'
    });
  }
};

/**
 * Load representative sample dataset into MongoDB
 * POST /api/documents/load-sample
 */
export const loadSamples = async (req, res, next) => {
  try {
    const loaded = await loadSampleDataset();
    const allDocs = await getAllDocuments();

    return res.status(200).json({
      success: true,
      message:
        loaded.length > 0
          ? `Loaded ${loaded.length} sample documents successfully.`
          : 'Sample dataset synchronized with MongoDB Atlas.',
      loadedCount: loaded.length,
      totalCount: allDocs.length,
      documents: allDocs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve aggregated executive dashboard analytics (Phase 7).
 * Reads the single source of truth from AI Service analytics engine.
 * GET /api/dashboard/analytics
 */
export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const { fetchDashboardAnalytics } = await import('../services/documentProcessing.service.js');
    const analytics = await fetchDashboardAnalytics();
    return res.status(200).json({
      success: true,
      analytics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete document and all associated records
 * DELETE /api/documents/:documentId
 */
export const deleteDocumentAction = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { deleteDocument } = await import('../services/document.service.js');
    const result = await deleteDocument(documentId);
    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully.',
      result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Re-run deterministic validation engine on document
 * POST /api/documents/:documentId/revalidate
 */
export const revalidateDocumentAction = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { revalidateDocument } = await import('../services/document.service.js');
    const result = await revalidateDocument(documentId);
    return res.status(200).json({
      success: true,
      message: 'Document revalidated successfully.',
      result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve related documents based on vector embedding similarity
 * GET /api/documents/:documentId/related
 */
export const getRelatedDocumentsAction = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { getRelatedDocuments } = await import('../services/document.service.js');
    const result = await getRelatedDocuments(documentId);
    return res.status(200).json({
      success: true,
      documentId,
      relatedDocuments: result.relatedDocuments || []
    });
  } catch (error) {
    next(error);
  }
};

