import React, { useState } from 'react';
import { FileText, CheckCircle2, AlertTriangle, FileCheck, UploadCloud } from 'lucide-react';
import StatCard from '../components/common/StatCard.jsx';

export default function DashboardPage() {
  // Dynamic statistics initialized to 0 awaiting document ingestion/DB
  const [dashboardStats] = useState({
    totalIngestedDocuments: 0,
    validatedStructuredRecords: 0,
    flaggedDiscrepancies: 0,
    generatedReports: 0
  });

  const statsConfig = [
    {
      title: 'Total Ingested Documents',
      value: dashboardStats.totalIngestedDocuments,
      subtitle: 'Across CIL Subsidiaries & CMPDI',
      icon: FileText,
      badge: null,
      color: 'blue'
    },
    {
      title: 'Validated Structured Records',
      value: dashboardStats.validatedStructuredRecords,
      subtitle: 'Normalized to canonical units',
      icon: CheckCircle2,
      badge: null,
      color: 'emerald'
    },
    {
      title: 'Flagged Discrepancies',
      value: dashboardStats.flaggedDiscrepancies,
      subtitle: 'Pending review (Rules V1–V13)',
      icon: AlertTriangle,
      badge: null,
      color: 'amber'
    },
    {
      title: 'Generated Reports',
      value: dashboardStats.generatedReports,
      subtitle: 'Parliamentary & monthly briefs',
      icon: FileCheck,
      badge: null,
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
        {statsConfig.map((stat, idx) => (
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

      {/* Empty Main Content Workspace Area */}
      <section className="main-content-card">
        <div className="empty-workspace-state">
          <div className="empty-icon-box">
            <UploadCloud size={38} color="#94a3b8" />
          </div>
          <h3 className="empty-title">No documents have been uploaded yet.</h3>
          <p className="empty-description">
            Upload your first geological, mining, or production document to begin processing.
          </p>
          <button
            type="button"
            className="empty-action-btn"
            disabled
            title="Upload functionality will be enabled in the ingestion phase"
          >
            <UploadCloud size={16} />
            <span>Upload Documents</span>
          </button>
        </div>
      </section>
    </div>
  );
}
