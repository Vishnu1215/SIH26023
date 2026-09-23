import { getToken } from '../utils/storage.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders() {
  const headers = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Generate a new report
 */
export async function generateReport({ reportType, format, filters, customSections }) {
  const headers = {
    ...getAuthHeaders(),
    'Content-Type': 'application/json'
  };

  const response = await fetch(`${API_BASE_URL}/reports/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reportType,
      format,
      filters: filters || {},
      customSections: customSections || []
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to generate report');
  }
  return data;
}

/**
 * List all generated reports
 */
export async function getReportHistory() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/reports`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch reports');
  }
  return data.reports || [];
}

/**
 * Get single report details
 */
export async function getReportDetails(reportId) {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch report details');
  }
  return data.report;
}

/**
 * Download report file binary
 */
export async function downloadReportFile(reportId, fileName = 'report') {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/file`, { headers });

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Get live HTML preview for custom parameters
 */
export async function getReportPreview({ reportType, filters, customSections }) {
  const headers = {
    ...getAuthHeaders(),
    'Content-Type': 'application/json',
    'Accept': 'text/html'
  };

  const response = await fetch(`${API_BASE_URL}/reports/preview`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reportType,
      filters: filters || {},
      customSections: customSections || []
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to generate preview');
  }

  return await response.text();
}

/**
 * Get live HTML preview for existing saved report
 */
export async function getExistingReportPreview(reportId) {
  const headers = {
    ...getAuthHeaders(),
    'Accept': 'text/html'
  };

  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/preview`, { headers });
  if (!response.ok) {
    throw new Error('Failed to load report preview');
  }
  return await response.text();
}

/**
 * Regenerate existing report
 */
export async function regenerateReport(reportId) {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/regenerate`, {
    method: 'POST',
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to regenerate report');
  }
  return data;
}

/**
 * Delete report
 */
export async function deleteReport(reportId) {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
    method: 'DELETE',
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to delete report');
  }
  return data;
}
