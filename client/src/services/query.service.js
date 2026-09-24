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
 * Execute natural language query over documents and analytics
 */
export async function executeNaturalLanguageQuery({ query, documentId = null } = {}) {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, documentId })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Query execution failed');
  }
  return data;
}

/**
 * Fetch query history
 */
export async function getQueryHistory() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/query/history`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch query history');
  }
  return data.history || [];
}

/**
 * Clear query history
 */
export async function clearQueryHistory() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/query/history`, {
    method: 'DELETE',
    headers
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to clear query history');
  }
  return data;
}

/**
 * Fetch query suggestions
 */
export async function getQuerySuggestions() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/query/suggestions`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch suggestions');
  }
  return data.suggestions || [];
}
