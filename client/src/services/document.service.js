import { getToken } from '../utils/storage.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Upload a document file to Express backend
 * @param {File} file - Selected file object
 * @param {string} [category='Unknown'] - Document category
 * @returns {Promise<Object>} Upload response with document metadata
 */
export async function uploadDocumentFile(file, category = 'Unknown') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const headers = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || `Upload failed (HTTP ${response.status})`);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Server unavailable. Please ensure the backend server is running.');
    }
    throw error;
  }
}

/**
 * Fetch all uploaded document metadata (sorted newest first)
 * @returns {Promise<Array>} List of document records
 */
export async function getDocumentList() {
  const headers = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      headers
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || `Failed to fetch documents (HTTP ${response.status})`);
    }

    return data.documents || [];
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Server unavailable. Unable to connect to backend.');
    }
    throw error;
  }
}

/**
 * Load representative sample dataset from sample-data/ for demonstration
 * @returns {Promise<Object>} Response with loaded documents
 */
export async function loadSampleDataset() {
  const headers = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/documents/load-sample`, {
      method: 'POST',
      headers
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || `Failed to load sample dataset (HTTP ${response.status})`);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Server unavailable. Unable to connect to backend.');
    }
    throw error;
  }
}

/**
 * Trigger structured information extraction explicitly for a document
 * @param {string} documentId
 * @returns {Promise<Object>} Updated document record
 */
export async function extractDocument(documentId) {
  const headers = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/extract`, {
      method: 'POST',
      headers
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || `Structured extraction failed (HTTP ${response.status})`);
    }

    return data.document;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Server unavailable. Unable to connect to backend.');
    }
    throw error;
  }
}

