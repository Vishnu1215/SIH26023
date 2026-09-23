import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Target,
  Gauge,
  Clock,
  UploadCloud
} from 'lucide-react';
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

  // Compute Phase 6 dynamic metrics
  const totalDocuments = documents.length;
  const ocrCompleteCount = documents.filter(
    (d) => d.status === 'OCR Complete' || d.status === 'Completed'
  ).length;
  const structuredRecordsCount = documents.filter(
    (d) => d.structuredDataAvailable === true
  ).length;

  const validatedDocs = documents.filter(
    (d) => d.validationStatus && d.validationStatus !== 'Pending'
  );
  const validatedCount = validatedDocs.length;

  const errorsCount = documents.filter(
    (d) => d.validationStatus === 'Error' || (d.errorCount && d.errorCount > 0)
  ).length;

  const warningsCount = documents.filter(
    (d) => d.validationStatus === 'Warning' || (d.warningCount && d.warningCount > 0)
  ).length;

  const validCount = documents.filter(
    (d) => d.validationStatus === 'Valid'
  ).length;

  const validationAccuracy = validatedCount > 0
    ? `${Math.round((validCount / validatedCount) * 100)}%`
    : '0%';

  const averageScoreNum = validatedCount > 0
    ? (validatedDocs.reduce((acc, d) => acc + (d.validationScore != null ? d.validationScore : 0), 0) / validatedCount).toFixed(1)
    : '0';
  const averageValidationScore = `${averageScoreNum}%`;

  const awaitingReviewCount = documents.filter(
    (d) => d.validationStatus === 'Error' || d.validationStatus === 'Warning'
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
      title: 'Validated Documents',
      value: validatedCount,
      subtitle: 'Evaluated by validation engine',
      icon: ShieldCheck,
      badge: null,
      color: 'indigo'
    },
    {
      title: 'Documents with Errors',
      value: errorsCount,
      subtitle: 'Mandatory field / numeric errors',
      icon: AlertCircle,
      badge: errorsCount > 0 ? `${errorsCount} Err` : null,
      color: 'rose'
    },
    {
      title: 'Documents with Warnings',
      value: warningsCount,
      subtitle: 'Discrepancies & rule alerts',
      icon: AlertTriangle,
      badge: warningsCount > 0 ? `${warningsCount} Warn` : null,
      color: 'amber'
    },
    {
      title: 'Validation Accuracy',
      value: validationAccuracy,
      subtitle: 'Completely clean valid records',
      icon: Target,
      badge: null,
      color: 'emerald'
    },
    {
      title: 'Average Validation Score',
      value: averageValidationScore,
      subtitle: 'Mean discrepancy score (0-100)',
      icon: Gauge,
      badge: null,
      color: 'blue'
    },
    {
      title: 'Awaiting Review',
      value: awaitingReviewCount,
      subtitle: 'Flagged for inspection',
      icon: Clock,
      badge: awaitingReviewCount > 0 ? 'Action Req' : null,
      color: awaitingReviewCount > 0 ? 'amber' : 'emerald'
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
