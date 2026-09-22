import {
  uploadDocument,
  getDocuments,
  getDocument,
  processDocument,
  extractDocumentStructured,
  loadSamples
} from '../controllers/document.controller.js';
import { handleUpload } from '../middleware/upload.middleware.js';
import express, { Router } from "express";

const router = Router();

// POST /api/documents/upload - Upload single document
router.post('/upload', handleUpload, uploadDocument);

// GET /api/documents - Retrieve all document metadata
router.get('/', getDocuments);

// POST /api/documents/load-sample - Register representative sample dataset into memory
router.post('/load-sample', loadSamples);

// GET /api/documents/:documentId - Retrieve single document by ID
router.get('/:documentId', getDocument);

// POST /api/documents/:documentId/process - Process / extract text from document
router.post('/:documentId/process', processDocument);

// POST /api/documents/:documentId/extract - Trigger structured information extraction explicitly
router.post('/:documentId/extract', extractDocumentStructured);

export default router;


