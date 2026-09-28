import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Sparkles,
  MessageSquareQuote,
  Bot,
  Lightbulb,
  ShieldCheck,
  Building,
  Lock
} from 'lucide-react';
import { ROUTES } from '../../constants/routes.js';

const NAV_ITEMS = [
  {
    path: ROUTES.DASHBOARD,
    label: 'Command Centre',
    description: 'National Mining Dashboard',
    icon: LayoutDashboard,
    badge: 'Live'
  },
  {
    path: ROUTES.DOCUMENTS,
    label: 'Geological Archives',
    description: 'Borehole & Mine Plans',
    icon: FileText
  },
  {
    path: ROUTES.REPORTS,
    label: 'Statutory Reports',
    description: 'Gazette & Official Exports',
    icon: ClipboardList
  },
  {
    path: ROUTES.TOPICS,
    label: 'Intelligence & Search',
    description: 'Inverted Multi-Index',
    icon: Sparkles
  },
  {
    path: ROUTES.QUERY,
    label: 'Deterministic Query',
    description: 'Rule-Based NL Parser',
    icon: MessageSquareQuote
  },
  {
    path: ROUTES.QA,
    label: 'Decision Support Q&A',
    description: 'Verified Evidence Engine',
    icon: Bot,
    badge: 'Verified'
  },
  {
    path: ROUTES.RECOMMENDATIONS,
    label: 'Operational Advisory',
    description: 'Risk Matrix & Discrepancies',
    icon: Lightbulb
  },
  {
    path: ROUTES.SETTINGS,
    label: 'Administration & Audit',
    description: 'Compliance & IT Logs',
    icon: ShieldCheck
  }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Sidebar Institutional Header */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#132a4f',
              borderRadius: '4px',
              border: '1px solid #1f4277',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f97316'
            }}
          >
            <Building size={18} />
          </div>
          <div>
            <div className="sidebar-brand-title">Coal Portal</div>
            <div className="sidebar-brand-subtitle">Govt. of India &bull; CMPDI</div>
          </div>
        </div>
      </div>

      <div className="sidebar-section-title">EXECUTIVE NAVIGATION</div>

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
              title={item.description}
            >
              <Icon size={16} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Sovereign Footer */}
      <div className="sidebar-footer">
        <div className="sovereign-data-stamp">
          <strong>GOVERNMENT OF INDIA</strong>
          Ministry of Coal &bull; CMPDI
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#34d399', fontSize: '9px' }}>
            <Lock size={10} />
            <span>Air-Gapped &bull; Audit Compliant</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
