import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, AlertTriangle, FileCheck, UploadCloud } from 'lucide-react';
import StatCard from '../components/common/StatCard.jsx';
import { getDocumentList } from '../services/document.service.js';

export default function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const docs = await getDocumentList();
        setDocuments(docs || []);
      } catch (err) {
        console.error('Failed to load dashboard documents:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  // Compute Phase 5 dynamic metrics
  const totalDocuments = documents.length;
  const ocrCompleteCount = documents.filter(
    (d) => d.status === 'OCR Complete' || d.status === 'Completed'
  ).length;
  const structuredRecordsCount = documents.filter(
    (d) => d.structuredDataAvailable === true
  ).length;
  const awaitingValidationCount = documents.filter(
    (d) => d.structuredDataAvailable === true
  ).length;

  const statsConfig = [
    {
      title: 'Total Documents',
      value: totalDocuments,
      subtitle: 'Ingested mining & geological files',
      icon: FileText,
      badge: null,
      color: 'blue'
    },
    {
      title: 'OCR Complete',
      value: ocrCompleteCount,
      subtitle: 'Text extracted & cached',
      icon: CheckCircle2,
      badge: null,
      color: 'emerald'
    },
    {
      title: 'Structured Records',
      value: structuredRecordsCount,
      subtitle: 'Normalized mining JSON records',
      icon: FileCheck,
      badge: null,
      color: 'purple'
    },
    {
      title: 'Documents Awaiting Validation',
      value: awaitingValidationCount,
      subtitle: 'Ready for validation engine',
      icon: AlertTriangle,
      badge: null,
      color: 'amber'
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
