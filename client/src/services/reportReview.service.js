/**
 * Report Review & Manual Editing Service
 * Supports review, title editing, executive summary refinement, remarks, recommendations,
 * reviewer comments, approval/rejection decisions, and maintains an audit trail of manual edits.
 * 
 * Strict Constraint: The original deterministic analytics/report data is never overwritten.
 * Edits and review states are stored separately in the review registry.
 */

const STORAGE_KEY = 'sih_coal_report_reviews';

function getReviewStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('[ReportReviewService] Failed to read reviews from localStorage:', err);
    return {};
  }
}

function saveReviewStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('[ReportReviewService] Failed to save reviews to localStorage:', err);
  }
}

/**
 * Get review record for a specific report
 * @param {string} reportId 
 * @returns {Object|null}
 */
export function getReportReview(reportId) {
  if (!reportId) return null;
  const store = getReviewStore();
  return store[reportId] || null;
}

/**
 * Save draft edits for a report
 * @param {string} reportId 
 * @param {Object} reviewData - { title, executiveSummary, remarks, recommendations, reviewerName, reviewerDesignation, comments }
 * @returns {Object} Updated review record
 */
export function saveReportDraft(reportId, reviewData) {
  if (!reportId) throw new Error('Report ID required');
  const store = getReviewStore();
  const existing = store[reportId] || {
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

  store[reportId] = record;
  saveReviewStore(store);
  return record;
}

/**
 * Approve report publication
 * @param {string} reportId 
 * @param {Object} reviewData 
 * @returns {Object}
 */
export function approveReport(reportId, reviewData) {
  if (!reportId) throw new Error('Report ID required');
  const store = getReviewStore();
  const existing = store[reportId] || {
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

  store[reportId] = record;
  saveReviewStore(store);
  return record;
}

/**
 * Reject report with revision requests
 * @param {string} reportId 
 * @param {Object} reviewData 
 * @returns {Object}
 */
export function rejectReport(reportId, reviewData) {
  if (!reportId) throw new Error('Report ID required');
  const store = getReviewStore();
  const existing = store[reportId] || {
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

  store[reportId] = record;
  saveReviewStore(store);
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
