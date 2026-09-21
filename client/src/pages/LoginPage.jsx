import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight, Flame } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { isAuthenticated } from '../utils/storage.js';
import { ROUTES } from '../constants/routes.js';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect immediately to dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseMockCredentials = () => {
    setUsername('admin');
    setPassword('admin123');
    setErrorMessage('');
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Emblem & Branding Header */}
        <div className="login-header">
          <div className="login-logo-box">
            <Flame size={32} color="#ea580c" />
          </div>
          <span className="login-gov-tag">GOVERNMENT OF INDIA &bull; MINISTRY OF COAL</span>
          <h1 className="login-title">CMPDI / CIL Reporting System</h1>
          <p className="login-subtitle">
            AI-Powered Geological, Mining and Automated Reporting Solution
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-error-box">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <div className="input-container">
              <span className="input-icon">
                <User size={18} />
              </span>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Enter authorized username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-container">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Demo Credentials Quick-Fill Hint */}
        <div className="mock-credentials-card">
          <div className="mock-credentials-title">
            <ShieldCheck size={16} color="#0369a1" />
            <span>Demo Access Credentials</span>
          </div>
          <p className="mock-credentials-info">
            Username: <code>admin</code> &bull; Password: <code>admin123</code>
          </p>
          <button
            type="button"
            onClick={handleUseMockCredentials}
            className="mock-fill-btn"
          >
            Auto-fill demo credentials
          </button>
        </div>

        {/* Security Notice Footer */}
        <div className="login-footer-notice">
          <p>Restricted Official Use Only &bull; Role-Based Access Control (RBAC) Enforced</p>
        </div>
      </div>
    </div>
  );
}
