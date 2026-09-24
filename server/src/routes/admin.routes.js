import { Router } from 'express';
import {
  getHealthAction,
  getStatisticsAction,
  getStorageAction,
  getRuntimeAction,
  getConfigurationAction,
  getActivityAction,
  getAuditAction,
  clearAuditAction,
  refreshSystemAction
} from '../controllers/admin.controller.js';

const router = Router();

router.get('/health', getHealthAction);
router.get('/statistics', getStatisticsAction);
router.get('/storage', getStorageAction);
router.get('/runtime', getRuntimeAction);
router.get('/configuration', getConfigurationAction);
router.get('/activity', getActivityAction);
router.get('/audit', getAuditAction);
router.delete('/audit', clearAuditAction);
router.post('/refresh', refreshSystemAction);

export default router;
