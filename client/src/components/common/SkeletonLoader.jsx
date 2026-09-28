import React from 'react';

/**
 * Enterprise SkeletonLoader Component with smooth shimmer animations.
 */
export default function SkeletonLoader({
  type = 'card',
  count = 1,
  className = '',
  height,
  width
}) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'kpi') {
    return (
      <div className={`skeleton-kpi-grid ${className}`.trim()}>
        {items.map((key) => (
          <div key={key} className="skeleton-kpi-card">
            <div className="skeleton-line skeleton-title-sm" />
            <div className="skeleton-line skeleton-value-lg" />
            <div className="skeleton-line skeleton-subtitle" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table-row') {
    return (
      <>
        {items.map((key) => (
          <tr key={key} className="skeleton-tr">
            <td colSpan={10}>
              <div className="skeleton-row-bar" />
            </td>
          </tr>
        ))}
      </>
    );
  }

  if (type === 'chat-message') {
    return (
      <div className={`skeleton-chat-container ${className}`.trim()}>
        {items.map((key) => (
          <div key={key} className="skeleton-chat-bubble">
            <div className="skeleton-circle-sm" />
            <div className="skeleton-chat-lines">
              <div className="skeleton-line skeleton-chat-line-1" />
              <div className="skeleton-line skeleton-chat-line-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`skeleton-container ${className}`.trim()}>
      {items.map((key) => (
        <div
          key={key}
          className="skeleton-box"
          style={{
            height: height || '120px',
            width: width || '100%'
          }}
        />
      ))}
    </div>
  );
}
