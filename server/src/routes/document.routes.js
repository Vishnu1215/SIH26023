import { Router } from 'express';
import {
  uploadDocument,
  getDocuments,
  getDocument,
  loadSamples
} from '../controllers/document.controller.js';
import { handleUpload } from '../middleware/upload.middleware.js';

const router = Router();

// POST /api/documents/upload - Upload single document
router.post('/upload', handleUpload, uploadDocument);

// GET /api/documents - Retrieve all document metadata
router.get('/', getDocuments);

// POST /api/documents/load-sample - Register representative sample dataset into memory
router.post('/load-sample', loadSamples);

// GET /api/documents/:documentId - Retrieve single document by ID
router.get('/:documentId', getDocument);

export default router;
