import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  UploadCloud,
  Bot,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

/**
 * Enterprise Unified Activity Timeline Component (SIH Grand Finale Presentation)
 * Real-time multi-source audit and operational activity stream.
 */
export default function UnifiedActivityTimeline({ activities = [], maxItems = 7 }) {
  const [filter, setFilter] = useState('ALL');

  const getCategoryIcon = (category, action) => {
    const act = (action || '').toLowerCase();
    const cat = (category || '').toLowerCase();
    if (cat.includes('report') || act.includes('report')) return FileText;
    if (cat.includes('qa') || cat.includes('q&a') || act.includes('inquiry')) return Bot;
    if (cat.includes('valid') || act.includes('valid')) return ShieldCheck;
    if (cat.includes('upload') || act.includes('ingest')) return UploadCloud;
    return RefreshCw;
  };

  const getCategoryColor = (category, status) => {
    const stat = (status || '').toUpperCase();
    if (stat === 'ERROR' || stat === 'FAILED') return '#dc2626';
    if (category === 'Reports') return '#2563eb';
    if (category === 'Q&A') return '#0284c7';
    if (category === 'Validation') return '#16a34a';
    if (category === 'Administration') return '#ea580c';
    return '#475569';
  };

  const filtered = activities.filter((item) => {
    if (filter === 'ALL') return true;
    const cat = (item.category || item.module || '').toUpperCase();
    return cat.includes(filter);
  });

  const displayList = filtered.slice(0, maxItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Category Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: 'All Operations' },
          { key: 'REPORT', label: 'Reports' },
          { key: 'Q&A', label: 'Q&A Inquiries' },
          { key: 'VALIDATION', label: 'Validations' },
          { key: 'ADMIN', label: 'Audit & System' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              border: '1px solid',
              borderColor: filter === tab.key ? 'var(--gov-navy-800)' : 'var(--border-default)',
              backgroundColor: filter === tab.key ? 'var(--bg-card-subtle)' : 'transparent',
              color: filter === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity Timeline List */}
      {displayList.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '12px',
            backgroundColor: 'var(--bg-card-subtle)',
            borderRadius: '6px',
            border: '1px dashed var(--border-default)'
          }}
        >
          No recent operational activities recorded for selected filter.
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '18px' }}>
          {/* Continuous vertical line */}
          <div
            style={{
              position: 'absolute',
              left: '7px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              backgroundColor: 'var(--border-subtle)'
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayList.map((item, idx) => {
              const Icon = getCategoryIcon(item.category || item.module, item.action);
              const dotColor = getCategoryColor(item.category || item.module, item.status);
              const timestampFormatted = item.timestamp
                ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Just now';

              return (
                <div
                  key={item.id || idx}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  {/* Timeline Dot with Pulse */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-15px',
                      top: '4px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: dotColor,
                      boxShadow: `0 0 0 3px var(--bg-card)`
                    }}
                  />

                  {/* Activity Content Row */}
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div
                        style={{
                          color: dotColor,
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Icon size={14} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.action || item.category || 'Operational Event'}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.description || item.details || 'System operation processed'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {item.category || item.module || 'System'}
                      </span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {timestampFormatted}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
