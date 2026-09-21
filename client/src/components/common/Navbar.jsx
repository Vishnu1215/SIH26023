import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, Building2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { ROUTES } from '../../constants/routes.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <div className="portal-tag">
          <span className="portal-badge">GOVERNMENT OF INDIA</span>
          <span className="portal-title">Ministry of Coal | CMPDI Reporting Platform</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="subsidiary-badge">
          <Building2 size={15} />
          <span>Scope: {user?.subsidiary || 'ALL'}</span>
        </div>

        <div className="user-profile">
          <div className="user-avatar">
            <User size={16} />
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || user?.username || 'Administrator'}</span>
            <span className="user-role">
              <Shield size={12} /> {user?.role || 'Admin'}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="logout-btn"
          title="Sign out from session"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
