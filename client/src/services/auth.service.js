import { saveToken, getToken, removeToken, isAuthenticated, getUser } from '../utils/storage.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function loginUser(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Authentication failed');
  }

  // Store token and user data via storage utility
  saveToken(data.token, data.user);

  return data;
}

export function logoutUser() {
  removeToken();
}

export function getCurrentUser() {
  return getUser();
}

export function checkIsAuthenticated() {
  return isAuthenticated();
}

export async function fetchProfile() {
  const token = getToken();
  if (!token) return null;

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    logoutUser();
    return null;
  }

  const data = await response.json();
  return data.user;
}
