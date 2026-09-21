import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, FileCheck, Layers } from 'lucide-react';
import StatCard from '../components/common/StatCard.jsx';

export default function DashboardPage() {
  const stats = [
    {
      title: 'Total Ingested Documents',
      value: '42',
      subtitle: 'Across 8 CIL Subsidiaries & CMPDI',
      icon: FileText,
      badge: '+12 this week',
      color: 'blue'
    },
    {
      title: 'Validated Structured Records',
      value: '1,480',
      subtitle: 'Normalized to canonical units (Tonnes)',
      icon: CheckCircle2,
      badge: '98.2% valid',
      color: 'emerald'
    },
    {
      title: 'Flagged Discrepancies',
      value: '14',
      subtitle: 'Requiring review (Rules V1–V13)',
      icon: AlertTriangle,
      badge: 'Action required',
      color: 'amber'
    },
    {
      title: 'Approved Reports & Briefs',
      value: '9',
      subtitle: 'Parliamentary Q&A & Monthly production',
      icon: FileCheck,
      badge: 'Ready for export',
      color: 'purple'
    }
  ];

  return (
    <div className="dashboard-view">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Executive Overview & Analytics</h2>
          <p className="page-subtitle">
            AI-Assisted Geological, Mining and Production Monitoring System
          </p>
        </div>
      </div>

      {/* Four Statistic Cards */}
      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <StatCard
            key={idx}
            title={stat.title}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={stat.icon}
            badge={stat.badge}
            color={stat.color}
          />
        ))}
      </div>

      {/* Empty Main Content Area */}
      <section className="main-content-card">
        <div className="empty-workspace-state">
          <div className="empty-icon-box">
            <Layers size={36} color="#64748b" />
          </div>
          <h3 className="empty-title">Main Content Area</h3>
          <p className="empty-description">
            This workspace area is reserved for document ingestion, tabular validation queues,
            report generation previews, and hybrid Q&A sessions.
          </p>
          <div className="empty-guidance">
            <span>Ready for upcoming modules: Ingestion Pipeline &bull; Validation Catalog &bull; Report Generator</span>
          </div>
        </div>
      </section>
    </div>
  );
}
