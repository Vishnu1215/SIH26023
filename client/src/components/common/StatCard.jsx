import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Official Government Executive StatCard for National KPIs and Production Metrics.
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  color = 'navy',
  trend,
  trendLabel,
  trendDirection,
  className = '',
  onClick
}) {
  const colorMap = {
    navy: {
      accent: 'var(--gov-navy-800)',
      bg: '#eff6ff',
      border: '#bfdbfe'
    },
    emerald: {
      accent: 'var(--tri-green)',
      bg: '#ecfdf5',
      border: '#a7f3d0'
    },
    saffron: {
      accent: 'var(--tri-saffron)',
      bg: '#fff7ed',
      border: '#fed7aa'
    },
    amber: {
      accent: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a'
    },
    slate: {
      accent: 'var(--text-secondary)',
      bg: '#f1f5f9',
      border: '#cbd5e1'
    },
    rose: {
      accent: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca'
    }
  };

  const scheme = colorMap[color] || colorMap.navy;

  return (
    <div
      className={`stat-card ${onClick ? 'cursor-pointer hover-clickable' : ''} ${className}`.trim()}
      onClick={onClick}
      style={{ borderTop: `3px solid ${scheme.accent}` }}
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div
            className="stat-card-icon"
            style={{
              backgroundColor: scheme.bg,
              color: scheme.accent,
              border: `1px solid ${scheme.border}`,
              borderRadius: '4px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="stat-card-body" style={{ marginTop: '8px', marginBottom: '8px' }}>
        <div className="stat-card-value tabular-nums">{value}</div>
        {badge && (
          <span
            className="badge-status badge-validated"
            style={{
              backgroundColor: scheme.bg,
              color: scheme.accent,
              borderColor: scheme.border,
              fontSize: '11px',
              fontWeight: 700
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="stat-card-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
        {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
        {trend && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              color: trendDirection === 'down' ? '#dc2626' : trendDirection === 'neutral' ? '#64748b' : '#15803d'
            }}
          >
            {trendDirection === 'down' ? (
              <TrendingDown size={13} />
            ) : trendDirection === 'neutral' ? (
              <Minus size={13} />
            ) : (
              <TrendingUp size={13} />
            )}
            <span>{trend}</span>
            {trendLabel && <span style={{ color: '#64748b', fontWeight: 500 }}>({trendLabel})</span>}
          </div>
        )}
      </div>
    </div>
  );
}
