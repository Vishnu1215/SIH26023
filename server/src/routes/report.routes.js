import { Router } from 'express';
import {
  generateReport,
  getReports,
  getReportById,
  downloadReportFile,
  previewReport,
  previewExistingReport,
  regenerateReport,
  deleteReport
} from '../controllers/report.controller.js';

const router = Router();

// POST /api/reports/generate - Generate new report
router.post('/generate', generateReport);

// GET /api/reports - List report generation history
router.get('/', getReports);

// POST /api/reports/preview - Generate live HTML preview for given settings
router.post('/preview', previewReport);

// GET /api/reports/:reportId - Get report metadata
router.get('/:reportId', getReportById);

// GET /api/reports/:reportId/file - Download physical report binary
router.get('/:reportId/file', downloadReportFile);

// GET /api/reports/:reportId/preview - Preview existing report in HTML
router.get('/:reportId/preview', previewExistingReport);

// POST /api/reports/:reportId/regenerate - Refresh report with latest data
router.post('/:reportId/regenerate', regenerateReport);

// DELETE /api/reports/:reportId - Delete report file and history entry
router.delete('/:reportId', deleteReport);

export default router;
