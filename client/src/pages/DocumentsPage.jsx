import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UploadCloud,
  File,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Shield,
  X,
  Loader2,
  RefreshCw,
  Clock,
  HardDrive,
  Database,
  Eye,
  Tag,
  Hash,
  RotateCcw,
  TrendingUp,
  Sliders,
  Building2,
  MapPin,
  Award,
  BarChart3
} from 'lucide-react';
import {
  uploadDocumentFile,
  getDocumentList,
  loadSampleDataset,
  validateDocument
} from '../services/document.service.js';
import {
  formatNumber,
  formatProduction,
  formatPercent,
  formatTime,
  formatCount
} from '../utils/formatters.js';

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'csv'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function DocumentsPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [modalTab, setModalTab] = useState('overview'); // 'overview' | 'analytics' (Phase 7)
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [validatingDocId, setValidatingDocId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }


  const fileInputRef = useRef(null);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch document history on mount
  const loadDocuments = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const docs = await getDocumentList();
      setDocuments(docs);
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to load uploaded documents history.'
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Validate and set file
  const handleValidateAndSetFile = (file) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      setToast({
        type: 'error',
        message: `Unsupported file format ".${ext || 'unknown'}". Accepted formats: PDF, JPG, PNG, DOCX, XLSX, CSV.`
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setToast({
        type: 'error',
        message: `File size (${formatFileSize(file.size)}) exceeds the 20 MB limit.`
      });
      return;
    }

    setSelectedFile(file);
    setToast(null);
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleValidateAndSetFile(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleValidateAndSetFile(files[0]);
    }
  };

  const handleClearSelected = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit upload
  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setToast(null);

    try {
      const response = await uploadDocumentFile(selectedFile);
      const isOcrComplete = response.document?.status === 'OCR Complete';
      const isFailed = response.document?.status === 'Failed';
      setToast({
        type: isFailed ? 'error' : 'success',
        message: isOcrComplete
          ? `"${selectedFile.name}" processed successfully via ${response.document?.loaderUsed || 'OCR'} (${response.document?.processingTime || 0}s).`
          : `"${selectedFile.name}" uploaded. Status: ${response.document?.status || 'Uploaded'}.`
      });
      handleClearSelected();
      await loadDocuments();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'An error occurred during document upload.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Load sample dataset for development/demo
  const handleLoadSampleDataset = async () => {
    setIsLoadingSamples(true);
    setToast(null);

    try {
      const result = await loadSampleDataset();
      setToast({
        type: 'success',
        message: result.message || `Loaded sample dataset for SIH demonstration.`
      });
      await loadDocuments();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to load sample dataset.'
      });
    } finally {
      setIsLoadingSamples(false);
    }
  };

  // Re-run validation on demand for a document (Issue 7)
  const handleRevalidate = async (docId) => {
    setValidatingDocId(docId);
    setToast(null);

    try {
      const updated = await validateDocument(docId);
      // Reactive state update: update document list immediately in state without reloading
      setDocuments((prev) => prev.map((d) => (d.documentId === docId ? updated : d)));
      // If modal is currently open for this doc, immediately update viewingDoc state
      if (viewingDoc && viewingDoc.documentId === docId) {
        setViewingDoc(updated);
      }
      setToast({
        type: 'success',
        message: `Document re-validated: ${updated.validationStatus} (Score: ${updated.validationScore}/100, ${updated.rulesTriggered?.length || 0} rules triggered).`
      });
      // Synchronize full list from backend
      await loadDocuments();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Validation failed for document.'
      });
    } finally {
      setValidatingDocId(null);
    }
  };

  return (
    <div className="dashboard-view">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Document Upload & Ingestion</h2>
          <p className="page-subtitle">
            Ingest geological survey reports, borehole logs, mine plans, and production figures
          </p>
        </div>

        <div className="page-actions-group">
          <button
            onClick={handleLoadSampleDataset}
            className="btn-sample-data"
            title="Register representative sample files for SIH demonstration"
            disabled={isLoadingSamples || isUploading}
          >
            {isLoadingSamples ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Loading Samples...</span>
              </>
            ) : (
              <>
                <Database size={15} />
                <span>Load Sample Dataset</span>
              </>
            )}
          </button>

          <button
            onClick={loadDocuments}
            className="btn-refresh"
            title="Refresh document history"
            disabled={isLoadingHistory}
          >
            <RefreshCw size={15} className={isLoadingHistory ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <div className="toast-content">
            {toast.type === 'success' ? (
              <CheckCircle2 size={20} className="toast-icon" />
            ) : (
              <AlertCircle size={20} className="toast-icon" />
            )}
            <span className="toast-message">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="toast-close"
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Drag-and-Drop Upload Section */}
      <section className="upload-section-card">
        <div
          className={`dropzone-container ${isDragging ? 'dropzone-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden-file-input"
            accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.csv"
            onChange={handleFileSelect}
          />
          <div className="dropzone-icon-box">
            <UploadCloud size={44} color="#ea580c" />
          </div>
          <h3 className="dropzone-title">Drag & drop your documents here</h3>
          <p className="dropzone-subtitle">
            or <span className="browse-link">browse files</span> from your local drive
          </p>
          <div className="dropzone-meta">
            <span>Accepted formats: PDF, JPG, PNG, DOCX, XLSX, CSV</span>
            <span>&bull;</span>
            <span>Maximum file size: 20 MB</span>
          </div>
        </div>

        {/* Selected File Details Bar */}
        {selectedFile && (
          <div className="selected-file-card">
            <div className="selected-file-info">
              <div className="file-type-icon">
                <FileText size={24} color="#0284c7" />
              </div>
              <div className="file-details">
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-meta">
                  <span className="meta-tag">{selectedFile.name.split('.').pop()?.toUpperCase()}</span>
                  <span>&bull;</span>
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>&bull;</span>
                  <span>{selectedFile.type || 'Standard document'}</span>
                </div>
              </div>
            </div>

            <div className="selected-file-actions">
              <button
                type="button"
                className="btn-clear"
                onClick={handleClearSelected}
                disabled={isUploading}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn-sample-data"
                onClick={handleLoadSampleDataset}
                disabled={isLoadingSamples || isUploading}
                title="Register representative sample files for SIH demonstration"
              >
                <Database size={15} />
                <span>Load Sample Dataset</span>
              </button>
              <button
                type="button"
                className="btn-upload-primary"
                onClick={handleUploadSubmit}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span>Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Upload History Table Section */}
      <section className="history-section-card">
        <div className="history-header">
          <div className="history-title-group">
            <h3 className="history-title">Ingested Documents History</h3>
            <span className="history-count">
              {documents.length} {documents.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="empty-history-state">
            <HardDrive size={40} color="#94a3b8" />
            <h4 className="empty-history-title">No documents uploaded yet.</h4>
            <p className="empty-history-desc">
              Upload a geological document above or click "Load Sample Dataset" to populate demo records.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Document ID</th>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Pages</th>
                  <th>Engine</th>
                  <th>Structured</th>
                  <th>Validation Status</th>
                  <th>Score</th>
                  <th>Rules Triggered</th>
                  <th>Errors</th>
                  <th>Warnings</th>
                  <th>Validated At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const ext = doc.originalName.split('.').pop()?.toUpperCase() || 'FILE';
                  const shortId = doc.documentId ? doc.documentId.slice(0, 8) : 'N/A';
                  const status = doc.status || 'Uploaded';
                  const failureMsg = doc.errorMessage || doc.error || 'Text extraction failed';
                  const isVal = validatingDocId === doc.documentId;

                  return (
                    <tr key={doc.documentId}>
                      <td className="col-id">
                        <span className="id-code" title={doc.documentId}>
                          {shortId}...
                        </span>
                      </td>
                      <td className="col-doc-name">
                        <div className="doc-name-wrapper">
                          <File size={16} color="#64748b" />
                          <span className="doc-name-text" title={doc.originalName}>
                            {doc.originalName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="category-tag">
                          <Tag size={11} />
                          <span>{doc.category || 'Unknown'}</span>
                        </span>
                      </td>
                      <td>
                        <span className="type-badge">{ext}</span>
                      </td>
                      <td className="col-size">{formatFileSize(doc.size)}</td>
                      <td className="col-pages">{doc.pageCount != null ? doc.pageCount : '-'}</td>
                      <td className="col-engine">
                        <span className="engine-badge">{doc.loaderUsed || '-'}</span>
                      </td>
                      <td className="col-records">
                        {doc.structuredDataAvailable ? (
                          <span className="records-badge">
                            {doc.structuredRecordCount || 1} Record
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td>
                        {doc.validationStatus === 'Valid' && (
                          <span className="status-pill status-pill-valid" title={doc.validationSummary || 'Valid'}>
                            <ShieldCheck size={13} />
                            <span>Valid</span>
                          </span>
                        )}
                        {doc.validationStatus === 'Warning' && (
                          <span className="status-pill status-pill-warning" title={doc.validationSummary || 'Validation warning'}>
                            <AlertTriangle size={13} />
                            <span>Warning</span>
                          </span>
                        )}
                        {doc.validationStatus === 'Error' && (
                          <span className="status-pill status-pill-error" title={doc.validationSummary || 'Validation error'}>
                            <ShieldAlert size={13} />
                            <span>Error</span>
                          </span>
                        )}
                        {(!doc.validationStatus || doc.validationStatus === 'Pending') && (
                          <span className="status-pill status-pill-pending" title="Validation pending">
                            <Clock size={13} />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="col-score">
                        {doc.validationScore != null ? (
                          <span className={`score-badge score-${doc.validationScore >= 80 ? 'high' : doc.validationScore >= 50 ? 'med' : 'low'}`}>
                            {doc.validationScore}/100
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td className="col-rules">
                        {doc.rulesTriggered && doc.rulesTriggered.length > 0 ? (
                          <div className="rules-chip-group">
                            {doc.rulesTriggered.map((rule) => (
                              <span key={rule} className="rule-chip" title={rule}>
                                {rule}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>None</span>
                        )}
                      </td>
                      <td>
                        {doc.errorCount > 0 ? (
                          <span className="badge-count badge-error">{doc.errorCount} Err</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>0</span>
                        )}
                      </td>
                      <td>
                        {doc.warningCount > 0 ? (
                          <span className="badge-count badge-warning">{doc.warningCount} Warn</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>0</span>
                        )}
                      </td>
                      <td className="col-time">
                        {doc.validatedAt ? new Date(doc.validatedAt).toLocaleTimeString() : '-'}
                      </td>
                      <td className="col-actions">
                        <div className="action-buttons-group">
                          <button
                            className="btn-revalidate-action"
                            onClick={() => handleRevalidate(doc.documentId)}
                            disabled={isVal}
                            title="Re-run validation engine"
                          >
                            <RotateCcw size={13} className={isVal ? 'animate-spin' : ''} />
                            <span>Re-Validate</span>
                          </button>
                          <button
                            className="btn-view-action"
                            onClick={() => {
                              setModalTab('overview');
                              setViewingDoc(doc);
                            }}
                            title="View complete document details and validation report"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Document Details & Text Preview Modal */}
      {viewingDoc && (
        <div className="modal-backdrop" onClick={() => setViewingDoc(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <FileText size={20} color="#0284c7" />
                <h3 className="modal-title">{viewingDoc.originalName}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setViewingDoc(null)} title="Close">
                <X size={18} />
              </button>
            </div>

            {/* Phase 7: Document Modal Navigation Tabs */}
            <div className="modal-tabs-header">
              <button
                type="button"
                className={`modal-tab-nav-btn ${modalTab === 'overview' ? 'active' : ''}`}
                onClick={() => setModalTab('overview')}
              >
                <FileText size={14} />
                <span>Document Overview</span>
              </button>
              <button
                type="button"
                className={`modal-tab-nav-btn ${modalTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setModalTab('analytics')}
              >
                <BarChart3 size={14} />
                <span>Document Analytics</span>
              </button>
            </div>

            <div className="modal-body">
              {modalTab === 'overview' ? (
                <>
                  {/* 1. Document Metadata */}
                  <div className="modal-section-title">
                    <FileText size={16} />
                    <span>1. Document Metadata</span>
                  </div>
                  <div className="modal-grid">
                    <div className="meta-item">
                      <label>Document Name</label>
                      <span title={viewingDoc.originalName}>{viewingDoc.originalName}</span>
                    </div>
                    <div className="meta-item">
                      <label>Category</label>
                      <span>{viewingDoc.category || 'Unknown'}</span>
                    </div>
                <div className="meta-item">
                  <label>Upload Time</label>
                  <span>{new Date(viewingDoc.uploadedAt).toLocaleString()}</span>
                </div>
                <div className="meta-item">
                  <label>File Size</label>
                  <span>{formatFileSize(viewingDoc.size)}</span>
                </div>
                <div className="meta-item" style={{ gridColumn: 'span 2' }}>
                  <label>SHA-256 Content Hash</label>
                  <span className="hash-code" title={viewingDoc.fileHash || 'Not calculated'}>
                    {viewingDoc.fileHash ? `${viewingDoc.fileHash.slice(0, 24)}...` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* 2. OCR Information */}
              <div className="modal-section-title" style={{ marginTop: '16px' }}>
                <CheckCircle2 size={16} />
                <span>2. OCR & Text Extraction Information</span>
              </div>
              <div className="modal-grid">
                <div className="meta-item">
                  <label>Status</label>
                  <span>{viewingDoc.status}</span>
                </div>
                <div className="meta-item">
                  <label>Pages</label>
                  <span>{viewingDoc.pageCount != null ? viewingDoc.pageCount : '-'}</span>
                </div>
                <div className="meta-item">
                  <label>Processing Time</label>
                  <span>{viewingDoc.processingTime != null ? formatTime(viewingDoc.processingTime) : '-'}</span>
                </div>
                <div className="meta-item">
                  <label>OCR Engine</label>
                  <span>{viewingDoc.loaderUsed || '-'}</span>
                </div>
                <div className="meta-item">
                  <label>Language</label>
                  <span>{viewingDoc.language || 'eng'}</span>
                </div>
                <div className="meta-item">
                  <label>Confidence</label>
                  <span>{viewingDoc.confidence != null ? `${viewingDoc.confidence}%` : 'N/A (Digital Layer)'}</span>
                </div>
              </div>

              {viewingDoc.status === 'Failed' && (viewingDoc.errorMessage || viewingDoc.error) && (
                <div
                  style={{
                    margin: '12px 0',
                    padding: '10px 14px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '12px'
                  }}
                >
                  <strong>Error [{viewingDoc.errorCode || 'UNKNOWN_ERROR'}]:</strong>{' '}
                  {viewingDoc.errorMessage || viewingDoc.error}
                </div>
              )}

              {/* 3. Structured Record (Normalized JSON) */}
              <div className="modal-section-title" style={{ marginTop: '16px' }}>
                <Database size={16} />
                <span>3. Structured Record (Normalized JSON)</span>
              </div>
              {viewingDoc.structuredData ? (
                <div className="preview-section" style={{ marginTop: '6px' }}>
                  <pre className="json-preview-box">
                    {JSON.stringify(viewingDoc.structuredData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div style={{ padding: '12px', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  No structured record extracted for this document.
                </div>
              )}

              {/* 4. Validation Summary */}
              {/* 4. Validation Summary & Score Explanation (Issues 3 & 5) */}
              <div className="modal-section-title" style={{ marginTop: '16px' }}>
                <ShieldCheck size={16} />
                <span>4. Validation Summary & Discrepancy Scoring</span>
              </div>
              <div className="validation-summary-card">
                <div className="validation-summary-header">
                  <div className="val-badge-group">
                    {viewingDoc.validationStatus === 'Valid' && (
                      <span className="status-pill status-pill-valid">
                        <ShieldCheck size={14} />
                        <span>Valid Record</span>
                      </span>
                    )}
                    {viewingDoc.validationStatus === 'Warning' && (
                      <span className="status-pill status-pill-warning">
                        <AlertTriangle size={14} />
                        <span>Warning Record</span>
                      </span>
                    )}
                    {viewingDoc.validationStatus === 'Error' && (
                      <span className="status-pill status-pill-error">
                        <ShieldAlert size={14} />
                        <span>Error Record</span>
                      </span>
                    )}
                    {(!viewingDoc.validationStatus || viewingDoc.validationStatus === 'Pending') && (
                      <span className="status-pill status-pill-pending">
                        <Clock size={14} />
                        <span>Validation Pending</span>
                      </span>
                    )}

                    {viewingDoc.validationScore != null && (
                      <span className={`score-badge score-${viewingDoc.validationScore >= 80 ? 'high' : viewingDoc.validationScore >= 50 ? 'med' : 'low'}`} style={{ padding: '3px 10px', fontSize: '13px' }}>
                        Score: {viewingDoc.validationScore} / 100
                      </span>
                    )}
                  </div>

                  <div className="val-counts-group">
                    <span className="badge-count badge-error">{viewingDoc.errorCount || 0} Errors</span>
                    <span className="badge-count badge-warning">{viewingDoc.warningCount || 0} Warnings</span>
                    <span className="badge-count badge-info">{viewingDoc.infoCount || 0} Info</span>
                    {viewingDoc.validationTime != null && (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {formatTime(viewingDoc.validationTime)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score Calculation Breakdown (Issue 5) */}
                {viewingDoc.validationScore != null && (
                  <div className="score-explanation-box">
                    <div className="score-explanation-header">Deterministic Score Calculation:</div>
                    <div className="score-calc-grid">
                      <div className="score-calc-item">
                        <span className="calc-label">Base Score:</span>
                        <span className="calc-value">100</span>
                      </div>
                      {viewingDoc.errorCount > 0 ? (
                        <div className="score-calc-item calc-deduct-error">
                          <span className="calc-label">Errors:</span>
                          <span className="calc-value">{viewingDoc.errorCount} × 20 = -{viewingDoc.errorCount * 20}</span>
                        </div>
                      ) : (
                        <div className="score-calc-item calc-clean">
                          <span className="calc-label">Errors:</span>
                          <span className="calc-value">0 (no deduction)</span>
                        </div>
                      )}
                      {viewingDoc.warningCount > 0 ? (
                        <div className="score-calc-item calc-deduct-warning">
                          <span className="calc-label">Warnings:</span>
                          <span className="calc-value">{viewingDoc.warningCount} × 5 = -{viewingDoc.warningCount * 5}</span>
                        </div>
                      ) : (
                        <div className="score-calc-item calc-clean">
                          <span className="calc-label">Warnings:</span>
                          <span className="calc-value">0 (no deduction)</span>
                        </div>
                      )}
                      <div className="score-calc-item calc-final">
                        <span className="calc-label">Final Score:</span>
                        <span className="calc-value">{viewingDoc.validationScore} / 100</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Multi-line Structured Validation Summary (Issue 3) */}
                <div className="val-summary-text" style={{ whiteSpace: 'pre-line', marginTop: '10px' }}>
                  {viewingDoc.validationSummary || 'Validation has not been executed on this document yet.'}
                </div>
              </div>

              {/* 5. Validation Messages (Issues 1, 4, 8, 9) */}
              <div className="modal-section-title" style={{ marginTop: '16px' }}>
                <AlertCircle size={16} />
                <span>5. Validation Messages & Discrepancies</span>
              </div>
              {(() => {
                const rawMsgs = viewingDoc.validationMessages || viewingDoc.messages || [];
                const seenKeys = new Set();
                const validationMsgs = rawMsgs.filter((msg) => {
                  const rule = msg.rule || msg.ruleId || 'VAL000';
                  const key = `${rule}-${msg.field}-${msg.message}`;
                  if (seenKeys.has(key)) return false;
                  seenKeys.add(key);
                  return true;
                });

                if (validationMsgs.length === 0) {
                  return (
                    <div style={{ padding: '12px', color: '#059669', fontSize: '13px', backgroundColor: '#ecfdf5', borderRadius: '6px', marginTop: '6px' }}>
                      No validation discrepancies or rule violations found. Document record is completely clean.
                    </div>
                  );
                }

                return (
                  <div className="table-responsive" style={{ marginTop: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                    <table className="validation-messages-table">
                      <thead>
                        <tr>
                          <th style={{ width: '90px' }}>Rule</th>
                          <th style={{ width: '95px' }}>Severity</th>
                          <th style={{ width: '140px' }}>Field</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationMsgs.map((msg, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className="rule-chip">{msg.rule || msg.ruleId || 'RULE'}</span>
                            </td>
                            <td>
                              <span className={`severity-badge severity-${(msg.severity || 'info').toLowerCase()}`}>
                                {msg.severity}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: '#334155' }}>
                              {msg.field || '-'}
                            </td>
                            <td style={{ fontSize: '12px', color: '#475569' }}>
                              {msg.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* 6. Extracted Text Preview */}
              <div className="modal-section-title" style={{ marginTop: '16px' }}>
                <FileText size={16} />
                <span>6. Raw Extracted Text Preview</span>
              </div>
              <div className="preview-section" style={{ marginTop: '6px' }}>
                <div className="preview-header">
                  <label>First 500 characters of extracted text</label>
                  <span className="char-count">
                    {((viewingDoc.textPreview || viewingDoc.extractedText || '').slice(0, 500)).length} / 500 chars
                  </span>
                </div>
                <pre className="text-preview-box">
                  {(viewingDoc.textPreview || viewingDoc.extractedText || '').slice(0, 500) ||
                    (viewingDoc.status === 'Failed'
                      ? 'Extraction failed. No text available.'
                      : 'No text extracted for this record.')}
                </pre>
              </div>
                </>
              ) : (
                <div className="modal-analytics-tab-content">
                  {/* Module 1: Production Summary */}
                  <div className="modal-section-title">
                    <TrendingUp size={16} />
                    <span>1. Production & Operational Summary</span>
                  </div>
                  <div className="modal-grid">
                    <div className="meta-item">
                      <label>Coal Production</label>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {viewingDoc.structuredData?.coalProduction != null ? formatProduction(viewingDoc.structuredData.coalProduction) : 'N/A'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Target Production</label>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {viewingDoc.structuredData?.targetProduction != null ? formatProduction(viewingDoc.structuredData.targetProduction) : 'N/A'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Target Achievement</label>
                      <span style={{
                        fontWeight: 700,
                        color: viewingDoc.structuredData?.coalProduction != null && viewingDoc.structuredData?.targetProduction != null && viewingDoc.structuredData.targetProduction > 0
                          ? (viewingDoc.structuredData.coalProduction / viewingDoc.structuredData.targetProduction >= 1 ? '#16a34a' : '#d97706')
                          : '#64748b'
                      }}>
                        {viewingDoc.structuredData?.coalProduction != null && viewingDoc.structuredData?.targetProduction != null && viewingDoc.structuredData.targetProduction > 0
                          ? formatPercent((viewingDoc.structuredData.coalProduction / viewingDoc.structuredData.targetProduction) * 100)
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Overburden Removal (OBR)</label>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {viewingDoc.structuredData?.overburdenRemoval != null ? `${formatNumber(viewingDoc.structuredData.overburdenRemoval, 2)} M.Cu.M` : 'N/A'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Subsidiary</label>
                      <span style={{ fontWeight: 600, color: '#0284c7' }}>
                        {viewingDoc.structuredData?.subsidiary || 'N/A'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Mine Name</label>
                      <span>{viewingDoc.structuredData?.mineName || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <label>State</label>
                      <span>{viewingDoc.structuredData?.state || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <label>Financial Year / Month</label>
                      <span>
                        {viewingDoc.structuredData?.financialYear || 'N/A'}
                        {viewingDoc.structuredData?.month ? ` (${viewingDoc.structuredData.month})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Module 2: Validation Summary */}
                  <div className="modal-section-title" style={{ marginTop: '16px' }}>
                    <ShieldCheck size={16} />
                    <span>2. Validation & Discrepancy Health</span>
                  </div>
                  <div className="modal-grid">
                    <div className="meta-item">
                      <label>Validation Status</label>
                      <span>
                        <span className={`status-pill status-pill-${(viewingDoc.validationStatus || 'pending').toLowerCase()}`}>
                          {viewingDoc.validationStatus || 'Pending'}
                        </span>
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Quality Score</label>
                      <span style={{
                        fontWeight: 700,
                        color: (viewingDoc.validationScore || 0) >= 80 ? '#16a34a' : (viewingDoc.validationScore || 0) >= 50 ? '#d97706' : '#dc2626'
                      }}>
                        {viewingDoc.validationScore != null ? `${viewingDoc.validationScore} / 100` : 'N/A'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Errors Detected</label>
                      <span style={{ fontWeight: 700, color: viewingDoc.errorCount > 0 ? '#dc2626' : '#16a34a' }}>
                        {viewingDoc.errorCount || 0}
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Warnings Detected</label>
                      <span style={{ fontWeight: 700, color: viewingDoc.warningCount > 0 ? '#d97706' : '#16a34a' }}>
                        {viewingDoc.warningCount || 0}
                      </span>
                    </div>
                    <div className="meta-item">
                      <label>Validation Latency</label>
                      <span>{viewingDoc.validationTime != null ? formatTime(viewingDoc.validationTime) : 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <label>Validation Rules Engine</label>
                      <span>10 Rules Active</span>
                    </div>
                  </div>

                  {/* Module 3: Data Quality & Completeness */}
                  <div className="modal-section-title" style={{ marginTop: '16px' }}>
                    <Award size={16} />
                    <span>3. Data Quality & Metadata Completeness</span>
                  </div>
                  {(() => {
                    const stdFields = [
                      'subsidiary',
                      'mineName',
                      'state',
                      'financialYear',
                      'month',
                      'coalProduction',
                      'targetProduction',
                      'overburdenRemoval',
                      'productivity'
                    ];
                    const struct = viewingDoc.structuredData || {};
                    const populated = stdFields.filter(f => struct[f] !== null && struct[f] !== undefined && struct[f] !== '');
                    const missing = stdFields.filter(f => struct[f] === null || struct[f] === undefined || struct[f] === '');
                    const completenessPct = Math.round((populated.length / stdFields.length) * 100);

                    return (
                      <div>
                        <div className="modal-grid">
                          <div className="meta-item">
                            <label>Field Completeness</label>
                            <span style={{ fontWeight: 600, color: completenessPct >= 70 ? '#16a34a' : '#d97706' }}>
                              {completenessPct}% ({populated.length}/{stdFields.length} fields)
                            </span>
                          </div>
                          <div className="meta-item">
                            <label>OCR Confidence</label>
                            <span>{viewingDoc.confidence != null ? `${viewingDoc.confidence}%` : 'Digital PDF'}</span>
                          </div>
                          <div className="meta-item">
                            <label>Raw Extracted Length</label>
                            <span>{formatCount((viewingDoc.textPreview || viewingDoc.extractedText || '').length)} chars</span>
                          </div>
                          <div className="meta-item">
                            <label>Integrity Fingerprint</label>
                            <span className="hash-code" style={{ fontSize: '11px' }} title={viewingDoc.fileHash || 'N/A'}>
                              {viewingDoc.fileHash ? `${viewingDoc.fileHash.slice(0, 16)}...` : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {missing.length > 0 && (
                          <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400e' }}>Missing Extracted Fields: </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                              {missing.map((f) => (
                                <span key={f} className="badge-count badge-warning" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-revalidate-action"
                onClick={() => handleRevalidate(viewingDoc.documentId)}
                disabled={validatingDocId === viewingDoc.documentId}
                style={{ marginRight: 'auto' }}
                title="Re-run validation engine"
              >
                <RotateCcw size={14} className={validatingDocId === viewingDoc.documentId ? 'animate-spin' : ''} />
                <span>Re-Validate</span>
              </button>
              <button className="btn-modal-close" onClick={() => setViewingDoc(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
