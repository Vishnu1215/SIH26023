const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const http = {
  get: async (url, options = {}) => {
    const res = await fetch(`${API_BASE_URL}${url}`, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  post: async (url, body, options = {}) => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body),
      ...options
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

export default http;