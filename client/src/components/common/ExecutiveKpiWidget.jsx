import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Enterprise-grade Executive KPI Widget (Power BI / Bloomberg / Azure style)
 * High-density information widget with tabular numerals, spark indicators, and trend chips.
 */
export default function ExecutiveKpiWidget({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection = 'up',
  trendLabel,
  color = 'navy',
  badge,
  progressPct,
  onClick,
  className = ''
}) {
  const colorMap = {
    navy: {
      accent: 'var(--gov-navy-800)',
      bg: 'var(--bg-card-subtle)',
      border: 'var(--border-default)',
      barColor: '#0f2e5a'
    },
    emerald: {
      accent: 'var(--tri-green)',
      bg: 'var(--status-verified-bg)',
      border: 'var(--status-verified-border)',
      barColor: '#16a34a'
    },
    saffron: {
      accent: 'var(--tri-saffron)',
      bg: 'var(--status-review-bg)',
      border: 'var(--status-review-border)',
      barColor: '#ea580c'
    },
    blue: {
      accent: '#2563eb',
      bg: 'var(--status-validated-bg)',
      border: 'var(--status-validated-border)',
      barColor: '#2563eb'
    },
    amber: {
      accent: '#d97706',
      bg: 'var(--status-warning-bg)',
      border: 'var(--status-warning-border)',
      barColor: '#d97706'
    },
    rose: {
      accent: '#dc2626',
      bg: 'var(--status-rejected-bg)',
      border: 'var(--status-rejected-border)',
      barColor: '#dc2626'
    }
  };

  const scheme = colorMap[color] || colorMap.navy;

  return (
    <div
      onClick={onClick}
      className={`exec-kpi-card ${onClick ? 'cursor-pointer hover-clickable' : ''} ${className}`.trim()}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '8px',
        position: 'relative',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.18s ease',
        borderTop: `3px solid ${scheme.accent}`
      }}
    >
      {/* Header: Title + Icon Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={title}
        >
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: scheme.bg,
              color: scheme.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Icon size={13} />
          </div>
        )}
      </div>

      {/* Value & Badge Row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
        <div
          className="exec-kpi-value tabular-nums"
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
          }}
        >
          {value}
        </div>
        {badge && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '3px',
              backgroundColor: scheme.bg,
              color: scheme.accent,
              border: `1px solid ${scheme.border}`,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap'
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Micro-Progress Spark Bar */}
      {typeof progressPct === 'number' && (
        <div
          style={{
            height: '4px',
            width: '100%',
            backgroundColor: 'var(--border-subtle)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, progressPct))}%`,
              backgroundColor: scheme.barColor,
              borderRadius: '2px',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      )}

      {/* Footer: Trend & Subtitle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-muted)',
          gap: '6px',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '6px'
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '10.5px'
          }}
          title={subtitle}
        >
          {subtitle}
        </span>

        {trend && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontWeight: 700,
              fontSize: '10.5px',
              flexShrink: 0,
              color:
                trendDirection === 'down'
                  ? '#dc2626'
                  : trendDirection === 'neutral'
                  ? 'var(--text-muted)'
                  : '#16a34a'
            }}
          >
            {trendDirection === 'down' ? (
              <TrendingDown size={11} />
            ) : trendDirection === 'neutral' ? (
              <Minus size={11} />
            ) : (
              <TrendingUp size={11} />
            )}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
