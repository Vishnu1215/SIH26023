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
 * Fetch semantic intelligence metadata for a specific document
 */
export async function getDocumentIntelligence(documentId) {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/intelligence/${documentId}`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to fetch document intelligence');
  }
  return data.data;
}

/**
 * Query search index with multi-attribute filters
 */
export async function searchDocuments({ query, mine, subsidiary, state, financialYear, category, topic, limit = 50 } = {}) {
  const headers = getAuthHeaders();
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (mine && mine !== 'All') params.append('mine', mine);
  if (subsidiary && subsidiary !== 'All') params.append('subsidiary', subsidiary);
  if (state && state !== 'All') params.append('state', state);
  if (financialYear && financialYear !== 'All') params.append('financialYear', financialYear);
  if (category && category !== 'All') params.append('category', category);
  if (topic && topic !== 'All') params.append('topic', topic);
  if (limit) params.append('limit', limit);

  const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to execute search');
  }
  return data.results || [];
}

/**
 * Trigger search index rebuild
 */
export async function reindexSearch() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/search/reindex`, {
    method: 'POST',
    headers
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Failed to reindex search');
  }
  return data;
}
