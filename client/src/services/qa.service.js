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
 * Execute Hybrid QA query
 */
export async function askQAQuery({ question, useLLM = false, documentId = null, filters = null } = {}) {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/qa/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question, useLLM, documentId, filters })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'QA query execution failed');
  }
  return data;
}

/**
 * Fetch QA chat history
 */
export async function getQAHistory() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/qa/history`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch QA history');
  }
  return data.history || [];
}

/**
 * Clear QA chat history
 */
export async function clearQAHistory() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/qa/history`, {
    method: 'DELETE',
    headers
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to clear QA history');
  }
  return data;
}

/**
 * Fetch dynamic suggestions
 */
export async function getQASuggestions() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/qa/suggestions`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch QA suggestions');
  }
  return data.suggestions || [];
}

/**
 * Explain QA query reasoning and data sources
 */
export async function explainQAQuery({ question, documentId = null } = {}) {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/qa/explain`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question, documentId })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to explain query');
  }
  return data;
}

/**
 * Fetch QA engine status
 */
export async function getQAStatus() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/qa/status`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch QA status');
  }
  return data;
}
