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
  ChevronDown
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
            Phase 8 Deterministic Reporting Engine. Synthesizes validated geological and mining analytics into
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
        <div className="reports-actions-bar">
          <button
            className="reports-btn reports-btn-preview"
            onClick={handleLivePreview}
            disabled={isLoadingPreview || isGenerating}
          >
            <Eye size={18} /> {isLoadingPreview ? 'Compiling Preview...' : 'Live HTML Preview'}
          </button>

          <button
            className="reports-btn reports-btn-generate"
            onClick={handleGenerate}
            disabled={isGenerating || isLoadingPreview}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={18} className="spin" /> Generating &amp; Exporting...
              </>
            ) : (
              <>
                <Download size={18} /> Generate &amp; Download {format.toUpperCase()}
              </>
            )}
          </button>
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
          <button className="reports-btn-refresh" onClick={fetchReports} disabled={isLoadingHistory}>
            <RefreshCw size={16} className={isLoadingHistory ? 'spin' : ''} /> Refresh History
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="reports-empty-state">
            <FileText size={48} color="#94a3b8" />
            <h3>No Reports Generated Yet</h3>
            <p>
              Select a statutory report template and export format above to generate your first publication-ready document.
            </p>
          </div>
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
                    <td style={{ textAlign: 'right' }}>
                      <div className="reports-action-buttons">
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
                          onClick={() => handlePreviewExisting(r)}
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

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <div className="reports-modal-overlay">
          <div className="reports-modal-container">
            <div className="reports-modal-header">
              <div>
                <h3 className="reports-modal-title">{previewTitle}</h3>
                <span className="reports-modal-sub">
                  Official Government of India / CMPDI Statutory Layout
                </span>
              </div>
              <div className="reports-modal-controls">
                <button
                  className="reports-btn-modal-action"
                  onClick={() => {
                    const iframe = document.getElementById('report-preview-frame');
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.print();
                    }
                  }}
                >
                  <Printer size={16} /> Print / Save as PDF
                </button>
                <button
                  className="reports-btn-modal-close"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="reports-modal-body">
              <iframe
                id="report-preview-frame"
                title="Report Live Preview"
                srcDoc={previewHtml}
                className="reports-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
