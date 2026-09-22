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
 * Get all documents sorted newest first
 * GET /api/documents
 */
export const getDocuments = (req, res) => {
  try {
    const documents = getAllDocuments();
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
 * Get single document by ID
 * GET /api/documents/:documentId
 */
export const getDocument = (req, res) => {
  try {
    const { documentId } = req.params;
    const document = documentModel.getDocumentById(documentId);
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
 * Load representative sample dataset into in-memory store
 * POST /api/documents/load-sample
 */
export const loadSamples = (req, res, next) => {
  try {
    const loaded = loadSampleDataset();
    const allDocs = getAllDocuments();

    return res.status(200).json({
      success: true,
      message:
        loaded.length > 0
          ? `Loaded ${loaded.length} sample documents successfully.`
          : 'Sample dataset already loaded in memory.',
      loadedCount: loaded.length,
      totalCount: allDocs.length,
      documents: allDocs
    });
  } catch (error) {
    next(error);
  }
};
