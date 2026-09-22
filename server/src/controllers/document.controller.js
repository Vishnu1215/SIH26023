import {
  createDocumentMetadata,
  DOCUMENT_CATEGORIES
} from '../utils/documentMetadata.js';
import documentModel from '../models/document.model.js';
import {
  saveDocument,
  getAllDocuments,
  notifyAiService,
  loadSampleDataset
} from '../services/document.service.js';

/**
 * Handle document upload
 * POST /api/documents/upload
 */
export const uploadDocument = async (req, res, next) => {
  try {
    const category = req.body?.category || DOCUMENT_CATEGORIES.UNKNOWN;
    const metadata = createDocumentMetadata(req.file, category);

    // Notify FastAPI service
    const finalStatus = await notifyAiService(metadata);
    metadata.status = finalStatus;

    // Save to in-memory DocumentModel
    const savedDoc = saveDocument(metadata);

    return res.status(201).json({
      success: true,
      message:
        finalStatus === 'Uploaded'
          ? 'Document uploaded and registered successfully.'
          : 'Document uploaded successfully (FastAPI notification pending).',
      document: savedDoc
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
