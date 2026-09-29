/**
 * Report Review & Manual Editing Service backed by MongoDB Atlas.
 * Supports review, title editing, executive summary refinement, remarks, recommendations,
 * reviewer comments, approval/rejection decisions, and maintains an audit trail of manual edits.
 * 
 * Strict Constraint: The original deterministic analytics/report data is never overwritten.
 * Edits and review states are stored separately in MongoDB collection 'report_reviews'.
 * LocalStorage has been completely removed.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// In-memory cache for ultra-fast synchronous UI access
const _reviewStore = {};

/**
 * Fetch review record from MongoDB API
 * @param {string} reportId
 */
export async function fetchReportReview(reportId) {
  if (!reportId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/reviews/${reportId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.review) {
        _reviewStore[reportId] = data.review;
        return data.review;
      }
    }
  } catch (err) {
    console.warn(`[ReportReviewService] Error fetching review for ${reportId} from MongoDB:`, err);
  }
  return _reviewStore[reportId] || null;
}

/**
 * Get review record for a specific report (synchronous read from memory cache)
 * @param {string} reportId 
 * @returns {Object|null}
 */
export function getReportReview(reportId) {
  if (!reportId) return null;
  // Trigger background fetch if not present
  if (!_reviewStore[reportId]) {
    fetchReportReview(reportId).catch(() => {});
  }
  return _reviewStore[reportId] || null;
}

/**
 * Save draft edits for a report into MongoDB Atlas
 * @param {string} reportId 
 * @param {Object} reviewData - { title, executiveSummary, remarks, recommendations, reviewerName, reviewerDesignation, comments }
 * @returns {Object} Updated review record
 */
export function saveReportDraft(reportId, reviewData) {
  if (!reportId) throw new Error('Report ID required');
  
  const existing = _reviewStore[reportId] || {
    reportId,
    status: 'Draft',
    auditTrail: [],
    createdAt: new Date().toISOString()
  };

  const timestamp = new Date().toISOString();
  const changes = [];
  if (reviewData.title !== undefined && reviewData.title !== existing.title) {
    changes.push(`Updated title to "${reviewData.title}"`);
  }
  if (reviewData.executiveSummary !== undefined && reviewData.executiveSummary !== existing.executiveSummary) {
    changes.push('Modified executive briefing summary');
  }
  if (reviewData.remarks !== undefined && reviewData.remarks !== existing.remarks) {
    changes.push('Updated operational remarks');
  }
  if (reviewData.recommendations !== undefined && reviewData.recommendations !== existing.recommendations) {
    changes.push('Refined strategic recommendations');
  }

  const updatedAuditTrail = [...(existing.auditTrail || [])];
  if (changes.length > 0) {
    updatedAuditTrail.push({
      timestamp,
      action: 'DRAFT_SAVED',
      officer: reviewData.reviewerName || 'Reviewing Officer',
      designation: reviewData.reviewerDesignation || 'Under Secretary, Coal Division',
      changes
    });
  }

  const record = {
    ...existing,
    ...reviewData,
    status: existing.status === 'Approved' ? 'Approved (Edited)' : 'Draft',
    updatedAt: timestamp,
    auditTrail: updatedAuditTrail
  };

  _reviewStore[reportId] = record;

  // Persist directly to MongoDB via API
  fetch(`${API_BASE_URL}/reviews/${reportId}/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  }).then(async (r) => {
    if (r.ok) {
      const resp = await r.json();
      if (resp && resp.review) {
        _reviewStore[reportId] = resp.review;
      }
    }
  }).catch((err) => {
    console.warn('[ReportReviewService] Background MongoDB draft save error:', err);
  });

  return record;
}

/**
 * Approve report publication in MongoDB Atlas
 * @param {string} reportId 
 * @param {Object} reviewData 
 * @returns {Object}
 */
export function approveReport(reportId, reviewData) {
  if (!reportId) throw new Error('Report ID required');
  
  const existing = _reviewStore[reportId] || {
    reportId,
    auditTrail: [],
    createdAt: new Date().toISOString()
  };

  const timestamp = new Date().toISOString();
  const updatedAuditTrail = [
    ...(existing.auditTrail || []),
    {
      timestamp,
      action: 'REPORT_APPROVED',
      officer: reviewData.reviewerName || 'Under Secretary, Ministry of Coal',
      designation: reviewData.reviewerDesignation || 'Under Secretary, Coal Division',
      decision: 'Approved for Statutory Publication',
      comments: reviewData.reviewerComments || 'Verified against single sources of truth. Cleared for publication.'
    }
  ];

  const record = {
    ...existing,
    ...reviewData,
    status: 'Approved',
    approvedAt: timestamp,
    approvedBy: reviewData.reviewerName || 'Under Secretary, Ministry of Coal',
    updatedAt: timestamp,
    auditTrail: updatedAuditTrail
  };

  _reviewStore[reportId] = record;

  // Persist to MongoDB via API
  fetch(`${API_BASE_URL}/reviews/${reportId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  }).then(async (r) => {
    if (r.ok) {
      const resp = await r.json();
      if (resp && resp.review) {
        _reviewStore[reportId] = resp.review;
      }
    }
  }).catch((err) => {
    console.warn('[ReportReviewService] Background MongoDB approve error:', err);
  });

  return record;
}

/**
 * Reject report with revision requests in MongoDB Atlas
 * @param {string} reportId 
 * @param {Object} reviewData 
 * @returns {Object}
 */
export function rejectReport(reportId, reviewData) {
  if (!reportId) throw new Error('Report ID required');
  
  const existing = _reviewStore[reportId] || {
    reportId,
    auditTrail: [],
    createdAt: new Date().toISOString()
  };

  const timestamp = new Date().toISOString();
  const updatedAuditTrail = [
    ...(existing.auditTrail || []),
    {
      timestamp,
      action: 'REVISION_REQUESTED',
      officer: reviewData.reviewerName || 'Under Secretary, Ministry of Coal',
      designation: reviewData.reviewerDesignation || 'Under Secretary, Coal Division',
      decision: 'Revision Requested',
      comments: reviewData.reviewerComments || 'Discrepancy found. Revision requested prior to publication.'
    }
  ];

  const record = {
    ...existing,
    ...reviewData,
    status: 'Revision Requested',
    rejectedAt: timestamp,
    rejectedBy: reviewData.reviewerName || 'Under Secretary, Ministry of Coal',
    updatedAt: timestamp,
    auditTrail: updatedAuditTrail
  };

  _reviewStore[reportId] = record;

  // Persist to MongoDB via API
  fetch(`${API_BASE_URL}/reviews/${reportId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  }).then(async (r) => {
    if (r.ok) {
      const resp = await r.json();
      if (resp && resp.review) {
        _reviewStore[reportId] = resp.review;
      }
    }
  }).catch((err) => {
    console.warn('[ReportReviewService] Background MongoDB reject error:', err);
  });

  return record;
}

/**
 * Get audit trail for a report
 * @param {string} reportId 
 * @returns {Array}
 */
export function getReportAuditTrail(reportId) {
  const review = getReportReview(reportId);
  return review?.auditTrail || [];
}
