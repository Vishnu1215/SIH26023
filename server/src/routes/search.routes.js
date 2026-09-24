import { Router } from 'express';
import {
  searchDocumentsAction,
  reindexSearchAction
} from '../controllers/intelligence.controller.js';

const router = Router();

// GET /api/search - Deterministic multi-filter search
router.get('/', searchDocumentsAction);

// POST /api/search/reindex - Rebuild search index
router.post('/reindex', reindexSearchAction);

export default router;
