import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Sparkles,
  MessageSquareQuote,
  Lightbulb,
  Settings,
  Flame
} from 'lucide-react';
import { ROUTES } from '../../constants/routes.js';

const NAV_ITEMS = [
  {
    path: ROUTES.DASHBOARD,
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    path: ROUTES.DOCUMENTS,
    label: 'Documents',
    icon: FileText
  },
  {
    path: ROUTES.REPORTS,
    label: 'Report Generator',
    icon: ClipboardList
  },
  {
    path: ROUTES.TOPICS,
    label: 'Topic Modeling',
    icon: Sparkles
  },
  {
    path: ROUTES.QUERY,
    label: 'Natural Language Query',
    icon: MessageSquareQuote
  },
  {
    path: ROUTES.RECOMMENDATIONS,
    label: 'AI Recommendations',
    icon: Lightbulb
  },
  {
    path: ROUTES.SETTINGS,
    label: 'System & Audit',
    icon: Settings
  }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Flame size={24} color="#f97316" />
        </div>
        <div className="brand-text">
          <div className="brand-title">SIH26023</div>
          <div className="brand-subtitle">CMPDI / CIL AI Platform</div>
        </div>
      </div>

      <div className="sidebar-section-title">NAVIGATION</div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="build-version">v0.1.0 (Phase 2 Foundation)</div>
        <div className="build-target">Ministry of Coal &bull; CIL</div>
      </div>
    </aside>
  );
}
