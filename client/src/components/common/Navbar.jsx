import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, Building2, Bell, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { ROUTES } from '../../constants/routes.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState('');

  // Live IST Clock
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

  return (
    <>
      {/* Sovereign National Tri-Color Accent Banner */}
      <div className="national-tricolor-bar" />

      <header className="top-navbar">
        <div className="navbar-left">
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
              <circle cx="50" cy="50" r="46" fill="#f8fafc" stroke="#0f2e5a" strokeWidth="2.5" />
              {/* Ashoka Lion / Capital Motif */}
              <path
                d="M50 18C44 18 40 22 40 27C40 31 43 34 45 36C42 38 39 42 39 47C39 53 43 57 47 59L45 68H55L53 59C57 57 61 53 61 47C61 42 58 38 55 36C57 34 60 31 60 27C60 22 56 18 50 18Z"
                fill="#0f2e5a"
              />
              <circle cx="50" cy="27" r="4" fill="#ea580c" />
              {/* Ashoka Chakra in Pedestal */}
              <circle cx="50" cy="80" r="10" stroke="#0f2e5a" strokeWidth="2" fill="none" />
              <circle cx="50" cy="80" r="2" fill="#0f2e5a" />
              <line x1="50" y1="70" x2="50" y2="90" stroke="#0f2e5a" strokeWidth="1" />
              <line x1="40" y1="80" x2="60" y2="80" stroke="#0f2e5a" strokeWidth="1" />
              <line x1="43" y1="73" x2="57" y2="87" stroke="#0f2e5a" strokeWidth="1" />
              <line x1="43" y1="87" x2="57" y2="73" stroke="#0f2e5a" strokeWidth="1" />
              {/* Motto Banner: Satyameva Jayate representation */}
              <rect x="25" y="96" width="50" height="7" rx="2" fill="#0f2e5a" />
              <text x="50" y="102" fontSize="5" fill="#ffffff" textAnchor="middle" fontWeight="bold">सत्यमेव जयते</text>
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
            <div className="cmpdi-subtitle">Central Mine Planning & Design Institute</div>
          </div>
        </div>

        <div className="navbar-right">
          {/* Live Indian Standard Time (IST) Clock */}
          <div className="navbar-clock-pill" title="Live Indian Standard Time">
            <Clock size={13} style={{ color: '#0f2e5a' }} />
            <span>{currentTime || 'IST Local Time'}</span>
          </div>

          {/* Statutory Scope Badge */}
          <div className="navbar-scope-pill" title="Current Authority Domain">
            <Building2 size={13} />
            <span>Scope: {user?.subsidiary || 'All Subsidiaries'}</span>
          </div>

          {/* Operational Status Pill */}
          <div className="navbar-status-pill" title="National Server Status">
            <span className="pulse-dot-green" />
            <span>Portal Online</span>
          </div>

          {/* Notifications Trigger */}
          <button
            className="btn btn-ghost btn-sm"
            title="Statutory Circulars & Audit Notifications"
            style={{ padding: '6px', color: '#0f2e5a', position: 'relative' }}
          >
            <Bell size={17} />
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '7px',
                height: '7px',
                backgroundColor: 'var(--tri-saffron)',
                borderRadius: '50%'
              }}
            />
          </button>

          {/* Current Officer Profile */}
          <div className="user-profile">
            <div className="user-avatar-seal" title="Authenticated Government Official">
              <User size={15} />
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
