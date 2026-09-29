import React from 'react';

/**
 * Lightweight, zero-dependency, pure React SVG visualizations for SIH26023 executive dashboard.
 * 100% deterministic, responsive, and styled with government-grade palettes.
 */

/**
 * Production Trend by Financial Year (SVG Bar Chart)
 */
export function ProductionTrendChart({ data = [], height = 220 }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart-box">
        <span>No multi-year production trend data available.</span>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.production || 0), 1);
  const chartHeight = height - 40; // reserve space for axis labels
  const barWidth = Math.min(48, Math.max(24, Math.floor(320 / Math.max(data.length, 1))));

  return (
    <div className="chart-container">
      <svg
        viewBox={`0 0 ${Math.max(400, data.length * 70)} ${height}`}
        className="executive-svg-chart"
        style={{ width: '100%', height: `${height}px` }}
      >
        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = chartHeight - (pct * (chartHeight - 30)) + 10;
          const labelVal = Math.round(pct * maxVal);
          return (
            <g key={idx}>
              <line x1="45" y1={y} x2="100%" y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
              <text x="38" y={y + 3} textAnchor="end" fill="#94a3b8" style={{ fontSize: '10px', fontFamily: 'system-ui' }}>
                {labelVal >= 1000 ? `${(labelVal / 1000).toFixed(1)}k` : labelVal}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const totalSlots = data.length;
          const slotWidth = (360 - 50) / totalSlots;
          const x = 55 + (idx * slotWidth) + (slotWidth - barWidth) / 2;
          const barH = Math.max(4, Math.round(((item.production || 0) / maxVal) * (chartHeight - 30)));
          const y = chartHeight - barH + 10;

          return (
            <g key={idx} className="chart-bar-group">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx="4"
                fill="#0f2e5a"
                className="chart-bar-rect"
              >
                <title>{`${item.financialYear}: ${item.production?.toLocaleString()} MT (${item.documents || 0} docs)`}</title>
              </rect>
              {/* Value label on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fill="#0f172a"
                style={{ fontSize: '10px', fontWeight: 600 }}
              >
                {item.production >= 1000 ? `${(item.production / 1000).toFixed(1)}k` : Math.round(item.production)}
              </text>
              {/* FY label below bar */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 25}
                textAnchor="middle"
                fill="#475569"
                style={{ fontSize: '11px', fontWeight: 500 }}
              >
                {item.financialYear}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Subsidiary / State Production Comparison (Horizontal Bar Chart)
 */
export function HorizontalBarChart({ data = [], unit = 'MT', maxItems = 6, height = 220 }) {
  const displayData = data.slice(0, maxItems);
  if (!displayData || displayData.length === 0) {
    return (
      <div className="empty-chart-box">
        <span>No distribution data available.</span>
      </div>
    );
  }

  const maxVal = Math.max(...displayData.map(d => d.production || 0), 1);
  const totalVal = displayData.reduce((acc, d) => acc + (d.production || 0), 0);

  return (
    <div className="horizontal-bars-container" style={{ minHeight: `${height}px` }}>
      {displayData.map((item, idx) => {
        const prod = item.production || 0;
        const barWidthPct = Math.min(100, Math.max(2, Math.round((prod / maxVal) * 100)));
        const contribPct = item.contributionPct != null
          ? item.contributionPct
          : (totalVal > 0 ? ((prod / totalVal) * 100).toFixed(1) : 0);

        // Medals for top 3
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;

        return (
          <div key={idx} className="h-bar-row">
            <div className="h-bar-header">
              <div className="h-bar-label-group">
                <span className="h-bar-rank">
                  {medal ? (
                    <span className="medal-icon" title={`Rank #${idx + 1}`}>{medal}</span>
                  ) : (
                    <span className="rank-num">#{idx + 1}</span>
                  )}
                </span>
                <span className="h-bar-name" title={item.name || item.subsidiary || item.state}>
                  {item.name || item.subsidiary || item.state}
                </span>
              </div>
              <div className="h-bar-val-group">
                <span className="h-bar-contrib">{contribPct}% share</span>
                <span className="h-bar-val">
                  {prod.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {unit}
                </span>
                <span className="h-bar-docs">({item.documents || 0} docs)</span>
              </div>
            </div>
            <div className="h-bar-track">
              <div
                className="h-bar-fill"
                style={{
                  width: `${barWidthPct}%`,
                  backgroundColor: idx === 0 ? '#0f2e5a' : idx === 1 ? '#1e3a8a' : idx === 2 ? '#2563eb' : '#475569'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Unified Validation Health Donut & Score Widget
 */
export function ValidationStatusDonut({ data = [], total = 0, accuracy = 0, score = 0, qualityRating = 'Good' }) {
  const valid = data.find(d => d.category === 'Valid')?.count || 0;
  const warning = data.find(d => d.category === 'Warning')?.count || 0;
  const error = data.find(d => d.category === 'Error')?.count || 0;
  const sumTotal = total > 0 ? total : (valid + warning + error);

  // Donut geometry
  const size = 170;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Segments calculation
  const validPct = sumTotal > 0 ? (valid / sumTotal) : 0;
  const warningPct = sumTotal > 0 ? (warning / sumTotal) : 0;
  const errorPct = sumTotal > 0 ? (error / sumTotal) : 0;

  const validDash = validPct * circumference;
  const warningDash = warningPct * circumference;
  const errorDash = errorPct * circumference;

  const validOffset = 0;
  const warningOffset = -validDash;
  const errorOffset = -(validDash + warningDash);

  const ratingClass =
    qualityRating === 'Excellent' ? 'rating-excellent'
    : qualityRating === 'Good' ? 'rating-good'
    : qualityRating === 'Average' ? 'rating-average'
    : 'rating-poor';

  return (
    <div className="donut-chart-wrapper">
      <div className="donut-svg-box">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Base track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {sumTotal > 0 && (
            <>
              {/* Valid segment (Forest Green) */}
              {validDash > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${validDash} ${circumference}`}
                  strokeDashoffset={validOffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              )}
              {/* Warning segment (Warm Amber) */}
              {warningDash > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${warningDash} ${circumference}`}
                  strokeDashoffset={warningOffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              )}
              {/* Error segment (Reserved Red) */}
              {errorDash > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${errorDash} ${circumference}`}
                  strokeDashoffset={errorOffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              )}
            </>
          )}

          {/* Center text */}
          <text x="50%" y="44%" textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: '20px', fontWeight: 800 }}>
            {accuracy}%
          </text>
          <text x="50%" y="58%" textAnchor="middle" fill="var(--text-muted)" style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
            Accuracy
          </text>
          <text x="50%" y="71%" textAnchor="middle" fill="#0284c7" style={{ fontSize: '11px', fontWeight: 700 }}>
            {score}/100
          </text>
        </svg>
      </div>

      {/* Legend & Count breakdown */}
      <div className="donut-legend">
        <div className="donut-legend-header">
          <span className="widget-label">System Quality Rating:</span>
          <span className={`quality-rating-badge ${ratingClass}`}>
            {qualityRating}
          </span>
        </div>

        <div className="donut-legend-item">
          <div className="legend-indicator" style={{ backgroundColor: '#16a34a' }} />
          <span className="legend-label">Valid Records:</span>
          <span className="legend-count">{valid.toLocaleString()} ({sumTotal > 0 ? ((valid / sumTotal) * 100).toFixed(1) : 0}%)</span>
        </div>
        <div className="donut-legend-item">
          <div className="legend-indicator" style={{ backgroundColor: '#d97706' }} />
          <span className="legend-label">Warning Records:</span>
          <span className="legend-count">{warning.toLocaleString()} ({sumTotal > 0 ? ((warning / sumTotal) * 100).toFixed(1) : 0}%)</span>
        </div>
        <div className="donut-legend-item">
          <div className="legend-indicator" style={{ backgroundColor: '#dc2626' }} />
          <span className="legend-label">Error Records:</span>
          <span className="legend-count">{error.toLocaleString()} ({sumTotal > 0 ? ((error / sumTotal) * 100).toFixed(1) : 0}%)</span>
        </div>
        <div className="donut-legend-footer">
          <span>Evaluated: <strong>{sumTotal.toLocaleString()} unique documents</strong></span>
        </div>
      </div>
    </div>
  );
}

/**
 * Enterprise Production Trend Line Chart (SVG Line with Gradient Fill)
 */
export function LineChart({
  data = [],
  xKey = 'financialYear',
  yKey = 'production',
  height = 220,
  strokeColor = '#1e3a8a',
  fillColor = '#3b82f6',
  unit = 'MT'
}) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart-box">
        <span>No trend time-series data available.</span>
      </div>
    );
  }

  const values = data.map(d => Number(d[yKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const minVal = 0;
  const paddingLeft = 50;
  const paddingRight = 25;
  const paddingTop = 20;
  const paddingBottom = 35;
  const width = Math.max(420, data.length * 75);
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = paddingTop + chartH - ((Number(d[yKey]) || 0) / maxVal) * chartH;
    return { x, y, label: d[xKey], val: Number(d[yKey]) || 0 };
  });

  const pathD = points.reduce((acc, p, i) => {
    return `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(paddingTop + chartH).toFixed(1)} Z`
    : '';

  return (
    <div className="chart-container" style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="executive-svg-chart"
        style={{ width: '100%', height: `${height}px`, minWidth: '320px' }}
      >
        <defs>
          <linearGradient id="areaGradientGov" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = paddingTop + chartH - pct * chartH;
          const labelVal = Math.round(pct * maxVal);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 3}
                textAnchor="end"
                fill="#64748b"
                style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}
              >
                {labelVal >= 1000 ? `${(labelVal / 1000).toFixed(1)}k` : labelVal}
              </text>
            </g>
          );
        })}

        {/* Area under curve */}
        {areaD && <path d={areaD} fill="url(#areaGradientGov)" />}

        {/* Main Line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="chart-point-group">
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth="2.5"
            >
              <title>{`${p.label}: ${p.val.toLocaleString()} ${unit}`}</title>
            </circle>
            {/* Value label */}
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fill="#0f172a"
              style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-sans)' }}
            >
              {p.val >= 1000 ? `${(p.val / 1000).toFixed(1)}k` : Math.round(p.val)}
            </text>
            {/* X-axis label */}
            <text
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              fill="#475569"
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * Minimalist Clean Progress Indicator
 */
export function ProgressBar({ value = 0, max = 100, label, color = 'emerald', height = 6 }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / (max || 1)) * 100)));
  const colorMap = {
    emerald: '#10b981',
    navy: '#0f2e5a',
    blue: '#2563eb',
    amber: '#f59e0b',
    rose: '#ef4444'
  };
  const activeColor = colorMap[color] || colorMap.emerald;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          <span>{label}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{pct}%</span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: '#e2e8f0',
          borderRadius: '9999px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: activeColor,
            borderRadius: '9999px',
            transition: 'width 250ms ease'
          }}
        />
      </div>
    </div>
  );
}

