import { Router } from 'express';
import {
  getRecommendationsAction,
  getInsightsAction,
  getAlertsAction,
  getRiskAction,
  getTrendsAction,
  recomputeRecommendationsAction,
  getHistoryAction
} from '../controllers/recommendation.controller.js';

const router = Router();

router.get('/', getRecommendationsAction);
router.get('/insights', getInsightsAction);
router.get('/alerts', getAlertsAction);
router.get('/risk', getRiskAction);
router.get('/trends', getTrendsAction);
router.post('/recompute', recomputeRecommendationsAction);
router.get('/history', getHistoryAction);

export default router;
