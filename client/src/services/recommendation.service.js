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
 * Fetch full recommendations payload with optional filters
 */
export async function fetchRecommendations({ category = '', priority = '', subsidiary = '' } = {}) {
  const headers = getAuthHeaders();
  const queryParams = new URLSearchParams();
  if (category) queryParams.set('category', category);
  if (priority) queryParams.set('priority', priority);
  if (subsidiary) queryParams.set('subsidiary', subsidiary);

  const url = `${API_BASE_URL}/recommendations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch recommendations');
  }
  return data;
}

/**
 * Fetch executive insights
 */
export async function fetchExecutiveInsights() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/recommendations/insights`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch insights');
  }
  return data.insights || [];
}

/**
 * Fetch operational alerts
 */
export async function fetchAlerts(severity = '') {
  const headers = getAuthHeaders();
  const url = `${API_BASE_URL}/recommendations/alerts${severity ? `?severity=${severity}` : ''}`;
  const response = await fetch(url, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch alerts');
  }
  return data.alerts || [];
}

/**
 * Fetch operational risk assessment
 */
export async function fetchRiskAssessment() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/recommendations/risk`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch risk assessment');
  }
  return data.risk || {};
}

/**
 * Fetch historical trend analysis
 */
export async function fetchTrendAnalysis() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/recommendations/trends`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch trend analysis');
  }
  return data.trends || {};
}

/**
 * Force recompute recommendations from single sources of truth
 */
export async function recomputeRecommendations() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/recommendations/recompute`, {
    method: 'POST',
    headers
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to recompute recommendations');
  }
  return data.data || data;
}

/**
 * Fetch recommendations history
 */
export async function fetchRecommendationsHistory() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/recommendations/history`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch recommendations history');
  }
  return data.history || [];
}
