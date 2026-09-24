import { Router } from 'express';
import {
  executeQueryAction,
  getQueryHistoryAction,
  clearQueryHistoryAction,
  getQuerySuggestionsAction
} from '../controllers/query.controller.js';

const router = Router();

router.post('/', executeQueryAction);
router.get('/history', getQueryHistoryAction);
router.delete('/history', clearQueryHistoryAction);
router.get('/suggestions', getQuerySuggestionsAction);

export default router;
