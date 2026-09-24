import { Router } from 'express';
import {
  executeQAAction,
  getQAHistoryAction,
  clearQAHistoryAction,
  getQASuggestionsAction,
  explainQAAction,
  getQAStatusAction
} from '../controllers/qa.controller.js';

const router = Router();

router.post('/query', executeQAAction);
router.get('/history', getQAHistoryAction);
router.delete('/history', clearQAHistoryAction);
router.get('/suggestions', getQASuggestionsAction);
router.post('/explain', explainQAAction);
router.get('/status', getQAStatusAction);

export default router;
