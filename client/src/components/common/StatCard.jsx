import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, badge, color = 'blue' }) {
  const colorStyles = {
    blue: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    emerald: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    amber: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    purple: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
    rose: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    indigo: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' }
  }[color] || { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };

  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${colorStyles.text}` }}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className="stat-card-icon" style={{ backgroundColor: colorStyles.bg, color: colorStyles.text }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        {badge && (
          <span
            className="stat-card-badge"
            style={{ backgroundColor: colorStyles.bg, color: colorStyles.text, borderColor: colorStyles.border }}
          >
            {badge}
          </span>
        )}
      </div>

      {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
    </div>
  );
}
