import { useState, useEffect, useCallback } from 'react';
import { loginUser, logoutUser, getCurrentUser, checkIsAuthenticated } from '../services/auth.service.js';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(checkIsAuthenticated());
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setAuthenticated(checkIsAuthenticated());
    setUser(getCurrentUser());
  }, []);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginUser(username, password);
      setAuthenticated(true);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setAuthenticated(false);
    setUser(null);
  }, []);

  return {
    authenticated,
    user,
    loading,
    error,
    login,
    logout
  };
}
