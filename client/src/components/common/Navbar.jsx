import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  Shield,
  Building2,
  Bell,
  Clock,
  Search,
  Sun,
  Moon,
  CheckCircle2,
  FileText,
  Menu
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { ROUTES } from '../../constants/routes.js';
import { useTheme } from '../../utils/theme.js';

export default function Navbar({ onToggleSidebar, isSidebarCollapsed = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, isDark, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState('');
  const [globalQuery, setGlobalQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Live Indian Standard Time (IST) Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      };
      const formatted = new Intl.DateTimeFormat('en-IN', options).format(now);
      setCurrentTime(`${formatted} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    const q = globalQuery.trim();
    if (q) {
      navigate(`/topics?q=${encodeURIComponent(q)}`);
      setGlobalQuery('');
    }
  };

  return (
    <>
      {/* Sovereign National Tri-Color Accent Banner */}
      <div className="national-tricolor-bar" />

      <header className="top-navbar">
        <div className="navbar-left">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="navbar-sidebar-toggle"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                padding: '6px',
                color: 'var(--text-primary)',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-card-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Menu size={16} />
            </button>
          )}

          {/* Government of India State Emblem Area */}
          <div className="gov-identity-block">
            {/* Authentic State Emblem of India Silhouette / Seal */}
            <svg
              className="national-emblem-img"
              viewBox="0 0 100 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="State Emblem of India"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill={isDark ? '#0c1a36' : '#f8fafc'}
                stroke={isDark ? '#38bdf8' : '#0f2e5a'}
                strokeWidth="2.5"
              />
              {/* Ashoka Lion / Capital Motif */}
              <path
                d="M50 18C44 18 40 22 40 27C40 31 43 34 45 36C42 38 39 42 39 47C39 53 43 57 47 59L45 68H55L53 59C57 57 61 53 61 47C61 42 58 38 55 36C57 34 60 31 60 27C60 22 56 18 50 18Z"
                fill={isDark ? '#38bdf8' : '#0f2e5a'}
              />
              <circle cx="50" cy="27" r="4" fill="#ea580c" />
              {/* Ashoka Chakra in Pedestal */}
              <circle cx="50" cy="80" r="10" stroke={isDark ? '#38bdf8' : '#0f2e5a'} strokeWidth="2" fill="none" />
              <circle cx="50" cy="80" r="2" fill={isDark ? '#38bdf8' : '#0f2e5a'} />
              <line x1="50" y1="70" x2="50" y2="90" stroke={isDark ? '#38bdf8' : '#0f2e5a'} strokeWidth="1" />
              <line x1="40" y1="80" x2="60" y2="80" stroke={isDark ? '#38bdf8' : '#0f2e5a'} strokeWidth="1" />
              {/* Motto Banner: Satyameva Jayate */}
              <rect x="25" y="96" width="50" height="7" rx="2" fill={isDark ? '#1e3a8a' : '#0f2e5a'} />
              <text x="50" y="102" fill="#ffffff" textAnchor="middle" style={{ fontSize: '5px', fontWeight: 'bold' }}>
                सत्यमेव जयते
              </text>
            </svg>

            <div className="gov-title-stack">
              <div className="gov-hindi-title">भारत सरकार &bull; कोयला मंत्रालय</div>
              <div className="gov-eng-title">Government of India &bull; Ministry of Coal</div>
            </div>
          </div>

          <div className="gov-divider-vertical" />

          {/* CMPDI Branding Identity */}
          <div className="cmpdi-identity-block">
            <div className="cmpdi-title">CMPDI Ltd.</div>
            <div className="cmpdi-subtitle">Central Mine Planning &amp; Design Institute</div>
          </div>
        </div>

        {/* Global Search Bar (Middle Command) */}
        <div className="navbar-center" style={{ flex: '1', maxWidth: '420px', margin: '0 24px' }}>
          <form onSubmit={handleGlobalSearch} style={{ position: 'relative', width: '100%' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder="Search reports, mines, subsidiaries, topics... (Enter)"
              style={{
                width: '100%',
                padding: '6px 36px 6px 32px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-card-subtle)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
            />
            <kbd
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '3px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              ↵
            </kbd>
          </form>
        </div>

        <div className="navbar-right">
          {/* Live Indian Standard Time (IST) Clock */}
          <div className="navbar-clock-pill" title="Live Indian Standard Time">
            <Clock size={13} style={{ color: 'var(--gov-navy-800)' }} />
            <span>{currentTime || 'IST Local Time'}</span>
          </div>

          {/* Operational Status Pill */}
          <div className="navbar-status-pill" title="National Server Status">
            <span className="pulse-dot-green" />
            <span>Portal Online</span>
          </div>

          {/* Theme Toggle Button (Light / Dark Mode) */}
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Executive Dark Mode'}
            aria-label="Toggle Theme"
            style={{
              padding: '6px',
              color: 'var(--text-primary)',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-card-subtle)'
            }}
          >
            {isDark ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#0f2e5a" />}
          </button>

          {/* Notifications Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn btn-ghost btn-sm"
              title="Statutory Circulars and Audit Notifications"
              style={{
                padding: '6px',
                color: 'var(--text-primary)',
                position: 'relative',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-card-subtle)'
              }}
            >
              <Bell size={15} />
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  right: '3px',
                  width: '6px',
                  height: '6px',
                  backgroundColor: 'var(--tri-saffron)',
                  borderRadius: '50%'
                }}
              />
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div
                style={{
                  position: 'absolute',
                  top: '36px',
                  right: '0',
                  width: '320px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '12px 14px',
                  zIndex: 2000
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '8px',
                    marginBottom: '8px'
                  }}
                >
                  <span style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                    Statutory Alerts &amp; Audits
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--tri-green)', fontWeight: 600 }}>Active</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <CheckCircle2 size={13} color="var(--tri-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Deterministic rule validation operational across all 10 DGMS standards.</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <FileText size={13} color="var(--gov-blue-500)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Executive mining briefing synchronized with single source of truth.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Officer Profile */}
          <div className="user-profile">
            <div className="user-avatar-seal" title="Authenticated Government Official">
              <User size={14} />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || user?.username || 'Secretary / Officer'}</span>
              <span className="user-role">
                <Shield size={10} style={{ display: 'inline', marginRight: '3px' }} />
                {user?.role || 'Gov Admin'} &bull; MoC
              </span>
            </div>
          </div>

          {/* Secure Logout Action */}
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            title="Secure Sign Out"
            aria-label="Logout"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>
    </>
  );
}
