import React from 'react';

/**
 * Enterprise Chart Card Wrapper for Sovereign Analytics
 */
export default function ChartCard({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  children,
  className = '',
  bodyStyle = {},
  accentColor = 'var(--gov-navy-800)'
}) {
  return (
    <div
      className={`card ${className}`.trim()}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderTop: `3px solid ${accentColor}`
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-card-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          {Icon && (
            <div
              style={{
                color: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon size={16} />
            </div>
          )}
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: '12.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-primary)',
                lineHeight: 1.2
              }}
            >
              {title}
            </h4>
            {subtitle && (
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.2
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {badge && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                letterSpacing: '0.02em'
              }}
            >
              {badge}
            </span>
          )}
          {actions}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: '18px 20px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          ...bodyStyle
        }}
      >
        {children}
      </div>
    </div>
  );
}
