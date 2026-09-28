import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { isAuthenticated } from '../utils/storage.js';
import { ROUTES } from '../constants/routes.js';
import Button from '../components/common/Button.jsx';

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
      setErrorMessage('Please enter both authorized username and password.');
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f4f6f9' }}>
      {/* Sovereign National Tri-Color Accent Banner */}
      <div className="national-tricolor-bar" />

      {/* Top Government Masthead Header */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #d1dce5', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Ashoka Stambh Seal */}
          <svg className="national-emblem-img" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '44px' }}>
            <circle cx="50" cy="50" r="46" fill="#f8fafc" stroke="#0f2e5a" strokeWidth="2.5" />
            <path d="M50 18C44 18 40 22 40 27C40 31 43 34 45 36C42 38 39 42 39 47C39 53 43 57 47 59L45 68H55L53 59C57 57 61 53 61 47C61 42 58 38 55 36C57 34 60 31 60 27C60 22 56 18 50 18Z" fill="#0f2e5a" />
            <circle cx="50" cy="27" r="4" fill="#ea580c" />
            <circle cx="50" cy="80" r="10" stroke="#0f2e5a" strokeWidth="2" fill="none" />
            <rect x="25" y="96" width="50" height="7" rx="2" fill="#0f2e5a" />
            <text x="50" y="102" fontSize="5" fill="#ffffff" textAnchor="middle" fontWeight="bold">सत्यमेव जयते</text>
          </svg>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0b1d3a', textTransform: 'uppercase' }}>भारत सरकार &bull; Government of India</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f2e5a' }}>कोयला मंत्रालय &bull; Ministry of Coal</div>
          </div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>
          <div>CMPDI Central Mine Planning & Design Institute Limited</div>
          <div style={{ color: '#15803d', fontWeight: 700 }}>National Coal Reporting & Analytics Portal</div>
        </div>
      </div>

      {/* Main Authentication Container */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #d1dce5',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(11, 29, 58, 0.08)',
            borderTop: '4px solid #0f2e5a',
            overflow: 'hidden'
          }}
        >
          {/* Card Header */}
          <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 800, color: '#0f2e5a', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', padding: '2px 8px', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
              <Shield size={12} /> Official Access Control
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0a192f', margin: 0 }}>
              Officer Sign In
            </h1>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
              Ministry of Coal &bull; CMPDI National Monitoring Portal
            </p>
          </div>

          <div style={{ padding: '24px 28px' }}>
            {/* Error Alert */}
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  marginBottom: '16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  color: '#991b1b',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }} htmlFor="username">
                  Official Username / Employee ID
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    id="username"
                    type="text"
                    className="form-input"
                    placeholder="Enter authorized username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="username"
                    style={{ width: '100%', paddingLeft: '36px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }} htmlFor="password">
                  Security Passcode
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    id="password"
                    type="password"
                    className="form-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    style={{ width: '100%', paddingLeft: '36px' }}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                icon={ArrowRight}
                iconPosition="right"
                style={{ width: '100%', marginTop: '6px', padding: '10px 16px' }}
              >
                {isSubmitting ? 'Authenticating...' : 'Secure Sign In'}
              </Button>
            </form>

            {/* Demo Credentials Quick-Fill Hint */}
            <div style={{ marginTop: '20px', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f2e5a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} color="#15803d" /> Demonstration Credentials
                </span>
                <button
                  type="button"
                  onClick={handleUseMockCredentials}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ea580c',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Auto-fill
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                User: <code style={{ backgroundColor: '#e2e8f0', padding: '1px 4px', borderRadius: '2px', color: '#0f172a' }}>admin</code> &bull; Password: <code style={{ backgroundColor: '#e2e8f0', padding: '1px 4px', borderRadius: '2px', color: '#0f172a' }}>admin123</code>
              </p>
            </div>
          </div>

          {/* Statutory Security Disclaimer */}
          <div style={{ padding: '12px 20px', backgroundColor: '#fafbfc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>
              Restricted to authorized officials of Ministry of Coal, CMPDI, and CIL subsidiaries. Protected under IT Act, 2000.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
