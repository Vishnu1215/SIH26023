import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Eye,
  RefreshCw,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  FileType,
  Sparkles,
  Printer,
  X,
  Layers,
  BarChart3,
  Building2,
  MapPin,
  Clock,
  ShieldCheck,
  Check,
  ChevronDown,
  Edit3,
  FileSignature,
  History,
  FileCheck
} from 'lucide-react';
import {
  generateReport,
  getReportHistory,
  downloadReportFile,
  getReportPreview,
  getExistingReportPreview,
  regenerateReport,
  deleteReport
} from '../services/report.service.js';
import { usePlatformSync, emitPlatformUpdate } from '../utils/syncBus.js';
import {
  getReportReview,
  saveReportDraft,
  approveReport,
  rejectReport,
  getReportAuditTrail
} from '../services/reportReview.service.js';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import SkeletonLoader from '../components/common/SkeletonLoader.jsx';

const REPORT_TYPES = [
  {
    id: 'executive',
    title: 'Executive Report',
    desc: 'High-level executive briefing with overall production, quality ratings, subsidiary ranks, and validation health.',
    badge: 'Executive Level',
    icon: Layers
  },
  {
    id: 'production',
    title: 'Production Report',
    desc: 'Deep dive into coal production volumes, statutory targets, variance, subsidiary contributions, and mine figures.',
    badge: 'Operations',
    icon: BarChart3
  },
  {
    id: 'validation',
    title: 'Validation & Discrepancy Audit',
    desc: 'Comprehensive diagnostic breakdown of VAL001–VAL010 deterministic rule violations, quality scores, and integrity.',
    badge: 'Compliance',
    icon: ShieldCheck
  },
  {
    id: 'dashboard',
    title: 'Dashboard Snapshot',
    desc: 'Complete replica and snapshot of the executive dashboard including all 4 metric tiers and distributions.',
    badge: 'Full Platform',
    icon: Building2
  },
  {
    id: 'mine_performance',
    title: 'Mine Performance Register',
    desc: 'Granular per-mine extraction statistics, mine types, state/district locations, and field completeness status.',
    badge: 'Field Audit',
    icon: MapPin
  },
  {
    id: 'custom',
    title: 'Custom Analytical Report',
    desc: 'Tailored report allowing selection of modular analytical components, deterministic filters, and specific tables.',
    badge: 'Modular',
    icon: Sparkles
  }
];

const FORMATS = [
  { id: 'pdf', label: 'PDF Document', ext: '.pdf', icon: FileText, color: '#dc2626', desc: 'Publication-ready multi-page document with official Ministry headers & footers' },
  { id: 'docx', label: 'Word (.docx)', ext: '.docx', icon: FileType, color: '#2563eb', desc: 'Editable Microsoft Word format with formatted tables and headings' },
  { id: 'xlsx', label: 'Excel (.xlsx)', ext: '.xlsx', icon: FileSpreadsheet, color: '#16a34a', desc: 'Multi-tab spreadsheet with formula calculations and auto-fitted columns' },
  { id: 'html', label: 'HTML Preview / Web', ext: '.html', icon: FileText, color: '#d97706', desc: 'Standalone responsive HTML document with embedded SVG charts' }
];

const SUBSIDIARIES = ['All', 'CIL', 'SCCL', 'ECL', 'BCCL', 'CCL', 'WCL', 'SECL', 'NCL', 'MCL', 'CMPDIL'];

const CUSTOM_SECTIONS = [
  { id: 'executive_kpis', label: 'Executive KPIs & Production Highlights' },
  { id: 'production_summary', label: 'Coal Production & Target Variance' },
  { id: 'subsidiary_leaderboard', label: 'Subsidiary Performance Leaderboard' },
  { id: 'state_distribution', label: 'Geographical / State Breakdown' },
  { id: 'financial_years', label: 'Financial Year Historical Trends' },
  { id: 'validation_rules', label: 'Validation Rule Audit (VAL001 - VAL010)' },
  { id: 'mine_register', label: 'Mine Performance & Extraction Register' }
];

export default function ReportsPage() {
  // Configuration State
  const [reportType, setReportType] = useState('executive');
  const [format, setFormat] = useState('pdf');
  const [financialYear, setFinancialYear] = useState('All');
  const [subsidiary, setSubsidiary] = useState('All');
  const [validationStatus, setValidationStatus] = useState('All');
  const [selectedSections, setSelectedSections] = useState([
    'executive_kpis',
    'production_summary',
    'subsidiary_leaderboard',
    'validation_rules'
  ]);

  // Operational State
  const [reports, setReports] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Preview Modal State
  const [previewHtml, setPreviewHtml] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('Report Preview');

  // Review Modal State
  const [activeReviewReport, setActiveReviewReport] = useState(null);
  const [modalTab, setModalTab] = useState('preview'); // 'preview' | 'edit' | 'audit'
  const [editTitle, setEditTitle] = useState('');
  const [editExecutiveSummary, setEditExecutiveSummary] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editRecommendations, setEditRecommendations] = useState('');
  const [reviewerName, setReviewerName] = useState('Under Secretary, Ministry of Coal');
  const [reviewerDesignation, setReviewerDesignation] = useState('Coal Division-I, Shastri Bhawan');
  const [reviewerComments, setReviewerComments] = useState('');
  const [reviewStatus, setReviewStatus] = useState('Draft');
  const [reviewAuditTrail, setReviewAuditTrail] = useState([]);

  // Load report history on mount
  const fetchReports = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await getReportHistory();
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Real-time synchronization
  usePlatformSync(fetchReports);

  // Open Review & Editorial Workflow
  const handleOpenReview = async (report) => {
    setActiveReviewReport(report);
    const existing = getReportReview(report.reportId);
    setEditTitle(existing?.title || report.reportName);
    setEditExecutiveSummary(existing?.executiveSummary || `Statutory analysis synthesizes certified geological extraction data across coal subsidiaries for ${report.filtersApplied?.financialYear || 'All Financial Years'}. Output confirms alignment with statutory quotas.`);
    setEditRemarks(existing?.remarks || 'Operational production variances observed within permissible tolerance boundaries. Field audits confirmed zero systemic reporting discrepancies.');
    setEditRecommendations(existing?.recommendations || 'Maintain quarterly verification cycles. Prioritize mechanized longwall expansion at SECL and MCL opencast collieries.');
    setReviewerName(existing?.reviewerName || 'Under Secretary, Ministry of Coal');
    setReviewerDesignation(existing?.reviewerDesignation || 'Coal Division-I, Shastri Bhawan');
    setReviewerComments(existing?.reviewerComments || '');
    setReviewStatus(existing?.status || 'Draft');
    setReviewAuditTrail(existing?.auditTrail || []);
    setModalTab('edit');
    setPreviewTitle(`${report.reportName} — Review & Endorsement`);
    setIsLoadingPreview(true);
    try {
      const html = await getExistingReportPreview(report.reportId);
      setPreviewHtml(html);
      setIsPreviewOpen(true);
    } catch (err) {
      alert(`Could not load preview: ${err.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSaveDraft = () => {
    if (!activeReviewReport) return;
    const updated = saveReportDraft(activeReviewReport.reportId, {
      title: editTitle,
      executiveSummary: editExecutiveSummary,
      remarks: editRemarks,
      recommendations: editRecommendations,
      reviewerName,
      reviewerDesignation,
      reviewerComments
    });
    setReviewStatus(updated.status);
    setReviewAuditTrail(updated.auditTrail);
    setActionMessage({ type: 'success', text: `Draft edits saved for "${editTitle}". Original deterministic data remains preserved.` });
  };

  const handleApprovePublication = () => {
    if (!activeReviewReport) return;
    const updated = approveReport(activeReviewReport.reportId, {
      title: editTitle,
      executiveSummary: editExecutiveSummary,
      remarks: editRemarks,
      recommendations: editRecommendations,
      reviewerName,
      reviewerDesignation,
      reviewerComments
    });
    setReviewStatus(updated.status);
    setReviewAuditTrail(updated.auditTrail);
    emitPlatformUpdate({ type: 'REPORT_APPROVED', reportId: activeReviewReport.reportId });
    setActionMessage({ type: 'success', text: `Report officially approved for publication by ${reviewerName}.` });
  };

  const handleRejectReport = () => {
    if (!activeReviewReport) return;
    const updated = rejectReport(activeReviewReport.reportId, {
      title: editTitle,
      executiveSummary: editExecutiveSummary,
      remarks: editRemarks,
      recommendations: editRecommendations,
      reviewerName,
      reviewerDesignation,
      reviewerComments
    });
    setReviewStatus(updated.status);
    setReviewAuditTrail(updated.auditTrail);
    setActionMessage({ type: 'error', text: `Report returned with revision requests to author.` });
  };

  // Toggle custom section checkbox
  const toggleSection = (sectionId) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((s) => s !== sectionId) : [...prev, sectionId]
    );
  };

  // Generate Report Action
  const handleGenerate = async () => {
    setIsGenerating(true);
    setActionMessage(null);
    try {
      const filters = {};
      if (financialYear !== 'All') filters.financialYear = financialYear;
      if (subsidiary !== 'All') filters.subsidiary = subsidiary;
      if (validationStatus !== 'All') filters.validationStatus = validationStatus;

      const result = await generateReport({
        reportType,
        format,
        filters,
        customSections: reportType === 'custom' ? selectedSections : []
      });

      setActionMessage({
        type: 'success',
        text: `Report "${result.report.reportName}" generated successfully (${result.report.fileSizeFormatted}).`
      });

      // Automatically trigger download
      if (result.report && result.report.reportId) {
        await downloadReportFile(result.report.reportId, result.report.fileName);
      }

      await fetchReports();
      emitPlatformUpdate({ type: 'REPORT_GENERATED', reportId: result.report?.reportId });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to generate report.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Live Preview Action
  const handleLivePreview = async () => {
    setIsLoadingPreview(true);
    setPreviewTitle(`${REPORT_TYPES.find((r) => r.id === reportType)?.title || 'Report'} Preview`);
    try {
      const filters = {};
      if (financialYear !== 'All') filters.financialYear = financialYear;
      if (subsidiary !== 'All') filters.subsidiary = subsidiary;
      if (validationStatus !== 'All') filters.validationStatus = validationStatus;

      const html = await getReportPreview({
        reportType,
        filters,
        customSections: reportType === 'custom' ? selectedSections : []
      });

      setPreviewHtml(html);
      setIsPreviewOpen(true);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to generate live preview.'
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Existing Report Preview
  const handlePreviewExisting = async (report) => {
    setIsLoadingPreview(true);
    setPreviewTitle(`${report.reportName} (Preview)`);
    try {
      const html = await getExistingReportPreview(report.reportId);
      setPreviewHtml(html);
      setIsPreviewOpen(true);
    } catch (err) {
      alert(`Could not load preview: ${err.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Regenerate Report
  const handleRegenerate = async (reportId) => {
    try {
      setActionMessage(null);
      const res = await regenerateReport(reportId);
      setActionMessage({
        type: 'success',
        text: `Report regenerated with latest analytics data (${res.report.fileName}).`
      });
      await fetchReports();
      emitPlatformUpdate({ type: 'REPORT_REGENERATED', reportId });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to regenerate report.'
      });
    }
  };

  // Delete Report
  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report file and record?')) return;
    try {
      await deleteReport(reportId);
      setReports((prev) => prev.filter((r) => r.reportId !== reportId));
      emitPlatformUpdate({ type: 'REPORT_DELETED', reportId });
    } catch (err) {
      alert(`Failed to delete report: ${err.message}`);
    }
  };

  // Format badge helper
  const getFormatBadge = (fmt) => {
    const f = fmt?.toLowerCase();
    if (f === 'pdf') return <span className="report-badge report-badge-pdf">PDF</span>;
    if (f === 'docx') return <span className="report-badge report-badge-docx">DOCX</span>;
    if (f === 'xlsx' || f === 'excel') return <span className="report-badge report-badge-xlsx">XLSX</span>;
    return <span className="report-badge report-badge-html">HTML</span>;
  };

  return (
    <div className="reports-page-container">
      {/* Page Header */}
      <div className="reports-header">
        <div>
          <div className="reports-header-badge">
            <ShieldCheck size={14} /> Ministry of Coal &bull; CMPDI Statutory Reporting Platform
          </div>
          <h1 className="reports-title">Automated Statutory Report Generator</h1>
          <p className="reports-subtitle">
            Deterministic Reporting Engine. Synthesizes validated geological and mining analytics into
            multi-format publications strictly consuming <code>dashboard.json</code>.
          </p>
        </div>
        <div className="reports-header-meta">
          <div className="reports-meta-chip">
            <span className="reports-meta-dot"></span> 100% Deterministic Engine
          </div>
          <div className="reports-meta-chip">
            Source: <strong>dashboard.json</strong>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`reports-alert reports-alert-${actionMessage.type}`}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{actionMessage.text}</span>
          <button className="reports-alert-close" onClick={() => setActionMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="reports-stats-grid">
        <div className="reports-stat-card">
          <div className="reports-stat-label">Reports Generated</div>
          <div className="reports-stat-value">{reports.length}</div>
          <div className="reports-stat-sub">Archived in storage manifest</div>
        </div>
        <div className="reports-stat-card">
          <div className="reports-stat-label">Available Formats</div>
          <div className="reports-stat-value">4 Formats</div>
          <div className="reports-stat-sub">PDF, Word, Excel &amp; HTML</div>
        </div>
        <div className="reports-stat-card">
          <div className="reports-stat-label">Report Templates</div>
          <div className="reports-stat-value">6 Types</div>
          <div className="reports-stat-sub">Statutory, Ops, Audit &amp; Custom</div>
        </div>
        <div className="reports-stat-card">
          <div className="reports-stat-label">Data Fidelity</div>
          <div className="reports-stat-value" style={{ color: '#16a34a' }}>
            Deterministic
          </div>
          <div className="reports-stat-sub">Zero AI hallucination risk</div>
        </div>
      </div>

      {/* Generator Configuration Panel */}
      <div className="reports-config-card">
        <div className="reports-section-heading">
          <Layers size={18} /> Step 1: Select Statutory Report Type
        </div>

        <div className="reports-type-grid">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            const isSelected = reportType === rt.id;
            return (
              <div
                key={rt.id}
                className={`reports-type-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setReportType(rt.id)}
              >
                <div className="reports-type-header">
                  <div className="reports-type-icon">
                    <Icon size={20} />
                  </div>
                  <span className="reports-type-badge">{rt.badge}</span>
                </div>
                <h3 className="reports-type-title">{rt.title}</h3>
                <p className="reports-type-desc">{rt.desc}</p>
                <div className="reports-type-check">
                  {isSelected ? <Check size={16} color="#1e3a8a" /> : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 2: Format Selection */}
        <div className="reports-section-heading" style={{ marginTop: '28px' }}>
          <FileType size={18} /> Step 2: Select Publication Format
        </div>

        <div className="reports-format-grid">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            const isSelected = format === f.id;
            return (
              <div
                key={f.id}
                className={`reports-format-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setFormat(f.id)}
              >
                <div className="reports-format-icon" style={{ color: f.color }}>
                  <Icon size={24} />
                </div>
                <div className="reports-format-info">
                  <div className="reports-format-title">{f.label}</div>
                  <div className="reports-format-desc">{f.desc}</div>
                </div>
                <div className="reports-format-radio">
                  <span className={`reports-radio-circle ${isSelected ? 'checked' : ''}`}></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 3: Filters & Customization */}
        <div className="reports-section-heading" style={{ marginTop: '28px' }}>
          <Filter size={18} /> Step 3: Configure Deterministic Filters &amp; Parameters
        </div>

        <div className="reports-filters-grid">
          <div className="reports-filter-group">
            <label>Financial Year Filter</label>
            <select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
              <option value="All">All Financial Years</option>
              <option value="2025-26">2025–26</option>
              <option value="2024-25">2024–25</option>
              <option value="2023-24">2023–24</option>
            </select>
          </div>

          <div className="reports-filter-group">
            <label>Subsidiary Enterprise</label>
            <select value={subsidiary} onChange={(e) => setSubsidiary(e.target.value)}>
              {SUBSIDIARIES.map((sub) => (
                <option key={sub} value={sub}>
                  {sub === 'All' ? 'All Subsidiaries (National)' : sub}
                </option>
              ))}
            </select>
          </div>

          <div className="reports-filter-group">
            <label>Validation Status Filter</label>
            <select value={validationStatus} onChange={(e) => setValidationStatus(e.target.value)}>
              <option value="All">All Document Statuses</option>
              <option value="Valid">Valid Records Only (100% Passed)</option>
              <option value="Warning">Warning Records Only</option>
              <option value="Error">Error Records Only</option>
            </select>
          </div>
        </div>

        {/* Custom Modular Sections (shown when Custom Report is chosen) */}
        {reportType === 'custom' && (
          <div className="reports-custom-sections-block">
            <div className="reports-custom-heading">
              <Sparkles size={16} /> Select Custom Report Sections to Include:
            </div>
            <div className="reports-checkbox-grid">
              {CUSTOM_SECTIONS.map((sec) => {
                const isChecked = selectedSections.includes(sec.id);
                return (
                  <label key={sec.id} className="reports-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSection(sec.id)}
                    />
                    <span>{sec.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="reports-actions-bar" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <Button
            variant="outline"
            icon={Eye}
            onClick={handleLivePreview}
            loading={isLoadingPreview}
            disabled={isLoadingPreview || isGenerating}
          >
            {isLoadingPreview ? 'Compiling Preview...' : 'Live HTML Preview'}
          </Button>

          <Button
            variant="primary"
            icon={Download}
            onClick={handleGenerate}
            loading={isGenerating}
            disabled={isGenerating || isLoadingPreview}
          >
            Generate & Download {format.toUpperCase()}
          </Button>
        </div>
      </div>

      {/* Generated Reports History */}
      <div className="reports-history-card">
        <div className="reports-history-header">
          <div>
            <h2 className="reports-history-title">Generated Reports Archive</h2>
            <p className="reports-history-subtitle">
              Persistent repository of synthesized statutory reports with metadata tracking.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={isLoadingHistory}
            disabled={isLoadingHistory}
            onClick={fetchReports}
          >
            Refresh History
          </Button>
        </div>

        {isLoadingHistory ? (
          <div style={{ padding: '24px' }}>
            <SkeletonLoader type="table-row" count={4} />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Reports Generated Yet"
            description="Select a statutory report template and export format above to generate your first publication-ready document."
            actionLabel={`Generate ${format.toUpperCase()}`}
            onAction={handleGenerate}
          />
        ) : (
          <div className="reports-table-responsive">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Report Title &amp; File</th>
                  <th>Type</th>
                  <th>Format</th>
                  <th>Generated At</th>
                  <th>Records</th>
                  <th>Size</th>
                  <th>Generated By</th>
                  <th>Review Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.reportId}>
                    <td>
                      <div className="reports-item-title">{r.reportName}</div>
                      <div className="reports-item-filename">{r.fileName}</div>
                    </td>
                    <td>
                      <span className="reports-type-tag">{r.reportType}</span>
                    </td>
                    <td>{getFormatBadge(r.format)}</td>
                    <td className="reports-time-cell">
                      <Clock size={12} /> {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td>{r.totalRecordsAnalyzed ?? 0}</td>
                    <td>{r.fileSizeFormatted}</td>
                    <td>{r.generatedBy}</td>
                    <td>
                      {(() => {
                        const rev = getReportReview(r.reportId);
                        if (rev?.status === 'Approved') {
                          return (
                            <span className="badge badge-validated" title={`Approved by ${rev.approvedBy}`}>
                              <CheckCircle2 size={12} /> Approved
                            </span>
                          );
                        }
                        if (rev?.status === 'Revision Requested') {
                          return (
                            <span className="badge badge-rejected" title={rev.comments || 'Revision Requested'}>
                              <AlertCircle size={12} /> Revision
                            </span>
                          );
                        }
                        return (
                          <span className="badge badge-pending" title="Awaiting Officer Review">
                            <Clock size={12} /> Draft
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="reports-action-buttons">
                        <button
                          className="reports-action-btn"
                          title="Review & Editorial Endorsement"
                          style={{ color: '#0f2e5a', borderColor: '#bfdbfe', background: '#eff6ff' }}
                          onClick={() => handleOpenReview(r)}
                        >
                          <FileSignature size={15} />
                        </button>
                        <button
                          className="reports-action-btn reports-action-dl"
                          title="Download File"
                          onClick={() => downloadReportFile(r.reportId, r.fileName)}
                        >
                          <Download size={15} />
                        </button>
                        <button
                          className="reports-action-btn reports-action-view"
                          title="Live Preview"
                          onClick={() => {
                            setModalTab('preview');
                            handlePreviewExisting(r);
                          }}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="reports-action-btn reports-action-refresh"
                          title="Regenerate with Latest Data"
                          onClick={() => handleRegenerate(r.reportId)}
                        >
                          <RefreshCw size={15} />
                        </button>
                        <button
                          className="reports-action-btn reports-action-del"
                          title="Delete Report"
                          onClick={() => handleDelete(r.reportId)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Preview & Review Modal */}
      {isPreviewOpen && (
        <div className="reports-modal-overlay">
          <div className="reports-modal-container" style={{ maxWidth: '1000px', width: '92vw' }}>
            <div className="reports-modal-header">
              <div>
                <h3 className="reports-modal-title">{previewTitle}</h3>
                <span className="reports-modal-sub">
                  Official Government of India / CMPDI Statutory Publication Console
                </span>
              </div>
              <div className="reports-modal-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Printer}
                  onClick={() => {
                    const iframe = document.getElementById('report-preview-frame');
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.print();
                    }
                  }}
                >
                  Print / Save as PDF
                </Button>
                <button
                  className="reports-btn-modal-close"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="modal-tabs-header" style={{ padding: '0 20px', borderBottom: '1px solid var(--border-default)', background: '#f8fafc', display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={`modal-tab-nav-btn ${modalTab === 'preview' ? 'active' : ''}`}
                onClick={() => setModalTab('preview')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderBottom: modalTab === 'preview' ? '2px solid #0f2e5a' : 'none', fontWeight: modalTab === 'preview' ? 700 : 500, color: modalTab === 'preview' ? '#0f2e5a' : '#64748b', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                <Eye size={15} />
                <span>Publication Preview</span>
              </button>

              <button
                type="button"
                className={`modal-tab-nav-btn ${modalTab === 'edit' ? 'active' : ''}`}
                onClick={() => setModalTab('edit')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderBottom: modalTab === 'edit' ? '2px solid #0f2e5a' : 'none', fontWeight: modalTab === 'edit' ? 700 : 500, color: modalTab === 'edit' ? '#0f2e5a' : '#64748b', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                <FileSignature size={15} />
                <span>Editorial Review &amp; Endorsement</span>
                {reviewStatus === 'Approved' && (
                  <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#15803d', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>Approved</span>
                )}
              </button>

              <button
                type="button"
                className={`modal-tab-nav-btn ${modalTab === 'audit' ? 'active' : ''}`}
                onClick={() => setModalTab('audit')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderBottom: modalTab === 'audit' ? '2px solid #0f2e5a' : 'none', fontWeight: modalTab === 'audit' ? 700 : 500, color: modalTab === 'audit' ? '#0f2e5a' : '#64748b', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                <History size={15} />
                <span>Editorial Audit Trail ({reviewAuditTrail.length})</span>
              </button>
            </div>

            <div className="reports-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              {modalTab === 'preview' && (
                <iframe
                  id="report-preview-frame"
                  title="Report Live Preview"
                  srcDoc={previewHtml}
                  className="reports-preview-iframe"
                  style={{ width: '100%', minHeight: '620px', border: 'none' }}
                />
              )}

              {modalTab === 'edit' && (
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#1e40af" />
                    <span><strong>Statutory Integrity Notice:</strong> Original deterministic data and calculated analytics are permanently immutable. Officer remarks, executive modifications, and approval endorsements are stored in an independent statutory review layer.</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f2e5a', marginBottom: '6px', textTransform: 'uppercase' }}>Report Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--border-default)', borderRadius: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f2e5a', marginBottom: '6px', textTransform: 'uppercase' }}>Executive Briefing Summary</label>
                      <textarea
                        rows={3}
                        value={editExecutiveSummary}
                        onChange={(e) => setEditExecutiveSummary(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--border-default)', borderRadius: '4px', resize: 'vertical' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f2e5a', marginBottom: '6px', textTransform: 'uppercase' }}>Operational Remarks &amp; Observations</label>
                      <textarea
                        rows={2}
                        value={editRemarks}
                        onChange={(e) => setEditRemarks(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--border-default)', borderRadius: '4px', resize: 'vertical' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f2e5a', marginBottom: '6px', textTransform: 'uppercase' }}>Strategic &amp; Policy Recommendations</label>
                      <textarea
                        rows={2}
                        value={editRecommendations}
                        onChange={(e) => setEditRecommendations(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--border-default)', borderRadius: '4px', resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f2e5a', marginBottom: '6px', textTransform: 'uppercase' }}>Reviewing Officer Name</label>
                        <input
                          type="text"
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--border-default)', borderRadius: '4px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f2e5a', marginBottom: '6px', textTransform: 'uppercase' }}>Officer Designation</label>
                        <input
                          type="text"
                          value={reviewerDesignation}
                          onChange={(e) => setReviewerDesignation(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--border-default)', borderRadius: '4px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f2e5a', marginBottom: '6px', textTransform: 'uppercase' }}>Officer Approval Comments / Justification</label>
                      <textarea
                        rows={2}
                        value={reviewerComments}
                        placeholder="e.g. Verified against CIL production returns. Discrepancy checked and approved for publication."
                        onChange={(e) => setReviewerComments(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--border-default)', borderRadius: '4px', resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-default)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Current Status:</span>
                      <span className={`badge ${reviewStatus === 'Approved' ? 'badge-validated' : reviewStatus === 'Revision Requested' ? 'badge-rejected' : 'badge-pending'}`}>
                        {reviewStatus}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Button variant="outline" onClick={handleSaveDraft}>
                        Save Draft
                      </Button>
                      <Button variant="danger" onClick={handleRejectReport} style={{ backgroundColor: '#dc2626', color: '#ffffff' }}>
                        Request Revision
                      </Button>
                      <Button variant="primary" icon={CheckCircle2} onClick={handleApprovePublication} style={{ backgroundColor: '#15803d' }}>
                        Approve &amp; Clear for Publication
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'audit' && (
                <div style={{ padding: '24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f2e5a', margin: '0 0 16px 0', textTransform: 'uppercase' }}>
                    Statutory Editorial Audit Trail
                  </h4>
                  {reviewAuditTrail.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#64748b' }}>No manual modifications recorded yet. Report reflects deterministic system output.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {reviewAuditTrail.map((item, idx) => (
                        <div key={idx} style={{ padding: '12px 16px', background: '#ffffff', border: '1px solid var(--border-default)', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f2e5a' }}>
                              {item.action === 'REPORT_APPROVED' ? '✅ Officially Approved' : item.action === 'REVISION_REQUESTED' ? '⚠️ Revision Requested' : '✏️ Draft Edit Recorded'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{new Date(item.timestamp).toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#334155' }}>
                            <strong>Officer:</strong> {item.officer} ({item.designation})
                          </div>
                          {item.comments && (
                            <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#475569', marginTop: '4px' }}>
                              &ldquo;{item.comments}&rdquo;
                            </div>
                          )}
                          {item.changes && item.changes.length > 0 && (
                            <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: '12px', color: '#64748b' }}>
                              {item.changes.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
