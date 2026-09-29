import { Router } from 'express';
import axios from 'axios';
import { config } from '../config/index.js';

const router = Router();
const aiBaseUrl = config.aiServiceUrl || 'http://127.0.0.1:8000';

// In-memory fallback if AI service is temporarily unreachable
const memoryReviews = {};

// GET /api/reviews/:reportId
router.get('/:reportId', async (req, res) => {
  const { reportId } = req.params;
  try {
    const response = await axios.get(`${aiBaseUrl}/reviews/${reportId}`, { timeout: 8000 });
    return res.status(200).json(response.data);
  } catch (error) {
    const fallback = memoryReviews[reportId] || null;
    return res.status(200).json({
      success: true,
      reportId,
      exists: Boolean(fallback),
      review: fallback
    });
  }
});

// POST /api/reviews/:reportId/draft
router.post('/:reportId/draft', async (req, res) => {
  const { reportId } = req.params;
  try {
    const response = await axios.post(`${aiBaseUrl}/reviews/${reportId}/draft`, req.body, { timeout: 8000 });
    memoryReviews[reportId] = response.data?.review;
    return res.status(200).json(response.data);
  } catch (error) {
    const record = {
      reportId,
      ...req.body,
      status: 'Draft',
      updatedAt: new Date().toISOString()
    };
    memoryReviews[reportId] = record;
    return res.status(200).json({
      success: true,
      message: 'Draft saved (local fallback).',
      review: record
    });
  }
});

// POST /api/reviews/:reportId/approve
router.post('/:reportId/approve', async (req, res) => {
  const { reportId } = req.params;
  try {
    const response = await axios.post(`${aiBaseUrl}/reviews/${reportId}/approve`, req.body, { timeout: 8000 });
    memoryReviews[reportId] = response.data?.review;
    return res.status(200).json(response.data);
  } catch (error) {
    const record = {
      reportId,
      ...req.body,
      status: 'Approved',
      approvedAt: new Date().toISOString()
    };
    memoryReviews[reportId] = record;
    return res.status(200).json({
      success: true,
      message: 'Report approved (local fallback).',
      review: record
    });
  }
});

// POST /api/reviews/:reportId/reject
router.post('/:reportId/reject', async (req, res) => {
  const { reportId } = req.params;
  try {
    const response = await axios.post(`${aiBaseUrl}/reviews/${reportId}/reject`, req.body, { timeout: 8000 });
    memoryReviews[reportId] = response.data?.review;
    return res.status(200).json(response.data);
  } catch (error) {
    const record = {
      reportId,
      ...req.body,
      status: 'Revision Requested',
      rejectedAt: new Date().toISOString()
    };
    memoryReviews[reportId] = record;
    return res.status(200).json({
      success: true,
      message: 'Revision requested (local fallback).',
      review: record
    });
  }
});

// GET /api/reviews/:reportId/audit
router.get('/:reportId/audit', async (req, res) => {
  const { reportId } = req.params;
  try {
    const response = await axios.get(`${aiBaseUrl}/reviews/${reportId}/audit`, { timeout: 8000 });
    return res.status(200).json(response.data);
  } catch (error) {
    const fallback = memoryReviews[reportId]?.auditTrail || [];
    return res.status(200).json({
      success: true,
      reportId,
      count: fallback.length,
      auditTrail: fallback
    });
  }
});

export default router;
