import { Router } from 'express';
import {
  processIntelligenceAction,
  getIntelligenceAction,
  searchDocumentsAction,
  reindexSearchAction
} from '../controllers/intelligence.controller.js';

const router = Router();

// POST /api/intelligence/process - Generate intelligence for document
router.post('/process', processIntelligenceAction);

// GET /api/intelligence/:documentId - Get semantic metadata for document
router.get('/:documentId', getIntelligenceAction);

export default router;
