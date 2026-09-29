import { Router } from 'express';
import {
  processIntelligenceAction,
  getIntelligenceAction,
  searchDocumentsAction,
  reindexSearchAction,
  getWordCloudAction
} from '../controllers/intelligence.controller.js';

const router = Router();

// GET /api/intelligence/word-cloud - Dynamic word cloud from MongoDB
router.get('/word-cloud', getWordCloudAction);

// POST /api/intelligence/process - Generate intelligence for document
router.post('/process', processIntelligenceAction);

// GET /api/intelligence/:documentId - Get semantic metadata for document
router.get('/:documentId', getIntelligenceAction);

export default router;
