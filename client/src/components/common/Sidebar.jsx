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
  Lock,
  ChevronLeft,
  ChevronRight
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

export default function Sidebar({ collapsed = false, onToggleCollapse }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Institutional Header */}
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: collapsed ? '16px 12px' : '20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
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
              color: '#f97316',
              flexShrink: 0
            }}
            title="Ministry of Coal &bull; CMPDI"
          >
            <Building size={18} />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div className="sidebar-brand-title">Coal Portal</div>
              <div className="sidebar-brand-subtitle">Govt. of India &bull; CMPDI</div>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {!collapsed ? (
        <div className="sidebar-section-title">EXECUTIVE NAVIGATION</div>
      ) : (
        <div style={{ height: '1px', background: '#132a4f', margin: '8px 12px' }} />
      )}

      <nav className="sidebar-nav" style={{ padding: collapsed ? '8px 6px' : '8px 12px' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`
              }
              title={collapsed ? `${item.label} — ${item.description}` : item.description}
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '9px 12px'
              }}
            >
              <Icon size={17} className="nav-icon" style={{ flexShrink: 0 }} />
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {!collapsed && item.badge && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Sovereign Footer */}
      <div className="sidebar-footer" style={{ padding: collapsed ? '12px 6px' : '16px 18px', textAlign: collapsed ? 'center' : 'left' }}>
        {!collapsed ? (
          <div className="sovereign-data-stamp">
            <strong>GOVERNMENT OF INDIA</strong>
            Ministry of Coal &bull; CMPDI
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#34d399', fontSize: '9px' }}>
              <Lock size={10} />
              <span>Air-Gapped &bull; Audit Compliant</span>
            </div>
          </div>
        ) : (
          <div title="Government of India • Ministry of Coal • CMPDI" style={{ color: '#34d399', display: 'flex', justifyContent: 'center' }}>
            <Lock size={14} />
          </div>
        )}
      </div>
    </aside>
  );
}
