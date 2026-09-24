import { getToken } from '../utils/storage.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch real-time system health evaluation
 */
export async function fetchSystemHealth() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/health`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch system health');
  }
  return data;
}

/**
 * Fetch processing statistics and pipeline metrics
 */
export async function fetchProcessingStatistics() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/statistics`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch processing statistics');
  }
  return data;
}

/**
 * Fetch storage allocations, directory metrics, and largest files
 */
export async function fetchStorageMetrics() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/storage`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch storage metrics');
  }
  return data;
}

/**
 * Fetch runtime latency breakdown and throughput
 */
export async function fetchRuntimeMetrics() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/runtime`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch runtime metrics');
  }
  return data;
}

/**
 * Fetch read-only system configuration profiles
 */
export async function fetchConfiguration() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/configuration`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch system configuration');
  }
  return data;
}

/**
 * Fetch unified multi-source chronological activity stream
 */
export async function fetchActivityStream(limit = 25) {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/activity?limit=${limit}`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch activity stream');
  }
  return data.activities || [];
}

/**
 * Fetch government compliance audit events
 */
export async function fetchAuditEvents({ module = '', status = '', date = '', limit = 100 } = {}) {
  const headers = getAuthHeaders();
  const params = new URLSearchParams();
  if (module && module !== 'ALL') params.set('module', module);
  if (status && status !== 'ALL') params.set('status', status);
  if (date) params.set('date', date);
  params.set('limit', limit.toString());

  const url = `${API_BASE_URL}/admin/audit?${params.toString()}`;
  const response = await fetch(url, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch audit events');
  }
  return data.events || [];
}

/**
 * Clear audit log history
 */
export async function clearAuditHistory() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/audit`, {
    method: 'DELETE',
    headers
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to clear audit history');
  }
  return data;
}

/**
 * Trigger administrative cache and storage refresh
 */
export async function triggerSystemRefresh(user = 'System Administrator') {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/refresh`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to perform administrative refresh');
  }
  return data;
}
