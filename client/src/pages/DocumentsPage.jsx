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
  BarChart3,
  Sparkles,
  Bot,
  ExternalLink
} from 'lucide-react';
import {
  uploadDocumentFile,
  getDocumentList,
  loadSampleDataset,
  validateDocument
} from '../services/document.service.js';
import { getDocumentIntelligence } from '../services/intelligence.service.js';
import { executeNaturalLanguageQuery } from '../services/query.service.js';
import { askQAQuery } from '../services/qa.service.js';
import {
  formatNumber,
  formatProduction,
  formatPercent,
  formatTime,
  formatCount
} from '../utils/formatters.js';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import SkeletonLoader from '../components/common/SkeletonLoader.jsx';
import Toast from '../components/common/Toast.jsx';
import { usePlatformSync, emitPlatformUpdate } from '../utils/syncBus.js';

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
  const [modalTab, setModalTab] = useState('overview'); // 'overview' | 'analytics' | 'intelligence' | 'ask'
  const [docIntelligence, setDocIntelligence] = useState(null);
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);
  const [docQueryAnswer, setDocQueryAnswer] = useState(null);
  const [docQueryLoading, setDocQueryLoading] = useState(false);
  const [docCustomQuery, setDocCustomQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [validatingDocId, setValidatingDocId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  // Multi-File Batch Upload Queue State
  const [uploadQueue, setUploadQueue] = useState([]); // [{ id, file, name, size, type, progress, status, errorMsg, result }]
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const cancelUploadRef = useRef(false);

  // Fetch intelligence on modal open or tab switch
  useEffect(() => {
    if (viewingDoc && (modalTab === 'intelligence' || modalTab === 'ask')) {
      setIsLoadingIntel(true);
      getDocumentIntelligence(viewingDoc.documentId)
        .then((data) => setDocIntelligence(data))
        .catch((err) => console.warn('Could not load doc intelligence:', err.message))
        .finally(() => setIsLoadingIntel(false));
    }
  }, [viewingDoc, modalTab]);

  const handleAskDoc = async (type, customText = '') => {
    if (!viewingDoc) return;
    setDocQueryLoading(true);
    try {
      let queryStr = customText;
      if (type === 'validation') queryStr = 'What is the validation score for this document?';
      else if (type === 'summary') queryStr = 'Show executive summary of this document';
      else if (type === 'entities') queryStr = 'What entities, organizations and mines are in this document?';
      else if (type === 'topics') queryStr = 'What topics are detected in this document?';
      else if (type === 'related') queryStr = 'What documents are related to this document?';

      const res = await askQAQuery({
        question: queryStr,
        documentId: viewingDoc.documentId,
        useLLM: false
      });
      setDocQueryAnswer(res);
    } catch (e) {
      setDocQueryAnswer({
        answer: 'Failed to process inquiry for this document.',
        reasoning: e.message,
        queryType: 'Document Question'
      });
    } finally {
      setDocQueryLoading(false);
    }
  };

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

  // Real-time platform synchronization
  usePlatformSync(loadDocuments);

  // Add multiple files to batch queue
  const addFilesToQueue = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const newItems = [];
    const errors = [];

    Array.from(filesList).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`"${file.name}": Unsupported format .${ext}`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${file.name}": Exceeds maximum 20 MB size`);
        return;
      }
      newItems.push({
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: (ext || 'PDF').toUpperCase(),
        progress: 0,
        status: 'queued', // 'queued' | 'uploading' | 'completed' | 'error'
        errorMsg: null,
        result: null
      });
    });

    if (errors.length > 0) {
      setToast({
        type: 'error',
        message: errors.slice(0, 2).join(' • ') + (errors.length > 2 ? ` (+${errors.length - 2} more)` : '')
      });
    }

    if (newItems.length > 0) {
      setUploadQueue((prev) => [...prev, ...newItems]);
      setSelectedFile(newItems[0].file);
    }
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
      addFilesToQueue(droppedFiles);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFilesToQueue(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearSelected = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Start Batch Upload
  const handleStartBatchUpload = async () => {
    const pending = uploadQueue.filter((it) => it.status === 'queued' || it.status === 'error');
    if (pending.length === 0) return;

    setIsBatchUploading(true);
    cancelUploadRef.current = false;
    let completedCount = 0;
    let failedCount = 0;

    for (const item of pending) {
      if (cancelUploadRef.current) break;

      setUploadQueue((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'uploading', progress: 30 } : it))
      );

      try {
        setUploadQueue((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, progress: 65 } : it))
        );

        const response = await uploadDocumentFile(item.file);

        if (response.document?.status === 'Failed') {
          setUploadQueue((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'error',
                    progress: 100,
                    errorMsg: response.document?.errorMessage || 'OCR processing issue'
                  }
                : it
            )
          );
          failedCount++;
        } else {
          setUploadQueue((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'completed',
                    progress: 100,
                    result: response.document,
                    errorMsg: null
                  }
                : it
            )
          );
          completedCount++;
        }
      } catch (err) {
        setUploadQueue((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'error',
                  progress: 100,
                  errorMsg: err.message || 'Upload failed'
                }
              : it
          )
        );
        failedCount++;
      }
    }

    setIsBatchUploading(false);
    await loadDocuments();

    // Trigger platform-wide synchronization
    emitPlatformUpdate({
      type: 'DOCUMENTS_BATCH_UPLOADED',
      completedCount,
      failedCount
    });

    if (completedCount > 0) {
      setToast({
        type: 'success',
        message: `Batch Ingestion Complete: ${completedCount} document${completedCount === 1 ? '' : 's'} successfully extracted, validated, and indexed into Single Source of Truth.`
      });
    } else if (failedCount > 0) {
      setToast({
        type: 'error',
        message: `Batch upload completed with errors on ${failedCount} file(s). You can retry failed files below.`
      });
    }
  };

  const handleCancelBatchUpload = () => {
    cancelUploadRef.current = true;
    setIsBatchUploading(false);
    setToast({
      type: 'info',
      message: 'Batch upload cancelled by officer.'
    });
  };

  const handleRemoveQueueItem = (id) => {
    setUploadQueue((prev) => prev.filter((it) => it.id !== id));
  };

  const handleRetryItem = (item) => {
    setUploadQueue((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: 'queued', progress: 0, errorMsg: null } : it))
    );
  };

  const handleClearCompleted = () => {
    setUploadQueue((prev) => prev.filter((it) => it.status !== 'completed'));
  };

  const handleClearAllQueue = () => {
    if (isBatchUploading) return;
    setUploadQueue([]);
    setSelectedFile(null);
  };

  // Submit single file upload (fallback for quick single action)
  const handleUploadSubmit = async () => {
    if (uploadQueue.length > 0) {
      await handleStartBatchUpload();
      return;
    }
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
      emitPlatformUpdate({ type: 'DOCUMENT_UPLOADED', doc: response.document });
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
      emitPlatformUpdate({ type: 'SAMPLES_LOADED' });
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
      emitPlatformUpdate({ type: 'DOCUMENT_VALIDATED', docId });
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
          <h2 className="page-title">Geological Archives & Ingestion — Statutory Coal Records</h2>
          <p className="page-subtitle">
            Ingest statutory geological survey reports, borehole logs, mine plans, and certified production records for deterministic OCR and analytical validation
          </p>
        </div>

        <div className="page-actions-group">
          <Button
            variant="secondary"
            icon={Database}
            loading={isLoadingSamples}
            disabled={isLoadingSamples || isUploading}
            onClick={handleLoadSampleDataset}
            title="Register representative sample files for SIH demonstration"
          >
            {isLoadingSamples ? 'Loading Samples...' : 'Load Sample Dataset'}
          </Button>

          <Button
            variant="outline"
            icon={RefreshCw}
            loading={isLoadingHistory}
            disabled={isLoadingHistory}
            onClick={loadDocuments}
            title="Refresh document history"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Drag-and-Drop Batch Upload Section */}
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
            multiple
            className="hidden-file-input"
            accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.csv"
            onChange={handleFileSelect}
          />
          <div className="dropzone-icon-box">
            <UploadCloud size={44} color="#ea580c" />
          </div>
          <h3 className="dropzone-title">Drag &amp; drop multiple statutory records here</h3>
          <p className="dropzone-subtitle">
            or <span className="browse-link">browse files</span> from your local drive (multi-file selection enabled)
          </p>
          <div className="dropzone-meta">
            <span>Accepted formats: PDF, JPG, PNG, DOCX, XLSX, CSV</span>
            <span>&bull;</span>
            <span>Maximum file size: 20 MB each</span>
            <span>&bull;</span>
            <span>Batch OCR &amp; Analytical Ingestion</span>
          </div>
        </div>

        {/* Batch Upload Queue Manager */}
        {uploadQueue.length > 0 && (
          <div className="batch-queue-container" style={{ marginTop: '20px', padding: '18px 20px', backgroundColor: '#ffffff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--gov-navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Batch Ingestion Queue</span>
                  <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px' }}>
                    {uploadQueue.length} File{uploadQueue.length === 1 ? '' : 's'}
                  </span>
                </h4>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Completed: <strong>{uploadQueue.filter(i => i.status === 'completed').length}</strong> &bull; Errors: <strong>{uploadQueue.filter(i => i.status === 'error').length}</strong> &bull; Pending: <strong>{uploadQueue.filter(i => i.status === 'queued').length}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {uploadQueue.some(i => i.status === 'completed') && !isBatchUploading && (
                  <Button variant="ghost" size="sm" onClick={handleClearCompleted}>
                    Clear Completed
                  </Button>
                )}
                {!isBatchUploading && (
                  <Button variant="ghost" size="sm" onClick={handleClearAllQueue}>
                    Clear Queue
                  </Button>
                )}
                {isBatchUploading ? (
                  <Button variant="outline" size="sm" onClick={handleCancelBatchUpload} style={{ borderColor: '#ef4444', color: '#dc2626' }}>
                    Cancel Ingestion
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    icon={UploadCloud}
                    onClick={handleStartBatchUpload}
                    disabled={uploadQueue.every(i => i.status === 'completed')}
                  >
                    Start Batch Ingestion ({uploadQueue.filter(i => i.status === 'queued' || i.status === 'error').length})
                  </Button>
                )}
              </div>
            </div>

            {/* Overall Progress Bar */}
            {uploadQueue.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  <span>Overall Queue Progress</span>
                  <span>
                    {Math.round((uploadQueue.filter(i => i.status === 'completed').length / uploadQueue.length) * 100)}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: uploadQueue.some(i => i.status === 'error') ? '#ea580c' : '#15803d',
                      width: `${(uploadQueue.filter(i => i.status === 'completed').length / uploadQueue.length) * 100}%`,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Individual Queued Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: item.status === 'uploading' ? '#f0fdf4' : item.status === 'error' ? '#fef2f2' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div style={{ padding: '6px', background: '#f1f5f9', borderRadius: '4px', flexShrink: 0 }}>
                      <FileText size={16} color="#0f2e5a" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gov-navy-950)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{formatFileSize(item.size)}</span>
                        <span>&bull;</span>
                        <span>{item.type}</span>
                        {item.errorMsg && (
                          <>
                            <span>&bull;</span>
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>{item.errorMsg}</span>
                          </>
                        )}
                      </div>
                      {/* Individual progress line if uploading */}
                      {item.status === 'uploading' && (
                        <div style={{ width: '100%', height: '3px', background: '#e2e8f0', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${item.progress}%`, height: '100%', background: '#0284c7', transition: 'width 0.3s ease' }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {item.status === 'queued' && (
                      <span className="badge badge-pending">Queued</span>
                    )}
                    {item.status === 'uploading' && (
                      <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Loader2 size={12} className="animate-spin" /> Ingesting...
                      </span>
                    )}
                    {item.status === 'completed' && (
                      <span className="badge badge-validated">
                        <CheckCircle2 size={12} /> Validated
                      </span>
                    )}
                    {item.status === 'error' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-rejected">
                          <AlertCircle size={12} /> Failed
                        </span>
                        {!isBatchUploading && (
                          <button
                            type="button"
                            onClick={() => handleRetryItem(item)}
                            title="Retry ingestion"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7', padding: '2px 4px' }}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    )}

                    {!isBatchUploading && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQueueItem(item.id)}
                        title="Remove from queue"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
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

        {isLoadingHistory ? (
          <div style={{ padding: '24px' }}>
            <SkeletonLoader type="table-row" count={5} />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={HardDrive}
            title="No documents uploaded yet"
            description="Upload a geological or coal document above or click 'Load Sample Dataset' to populate demo records."
            actionLabel="Load Sample Dataset"
            onAction={handleLoadSampleDataset}
          />
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
                          <span className="badge badge-validated" title={doc.validationSummary || 'Valid'}>
                            <ShieldCheck size={12} />
                            <span>Validated</span>
                          </span>
                        )}
                        {doc.validationStatus === 'Warning' && (
                          <span className="badge badge-warning" title={doc.validationSummary || 'Validation warning'}>
                            <AlertTriangle size={12} />
                            <span>Warning</span>
                          </span>
                        )}
                        {doc.validationStatus === 'Error' && (
                          <span className="badge badge-rejected" title={doc.validationSummary || 'Validation error'}>
                            <ShieldAlert size={12} />
                            <span>Error</span>
                          </span>
                        )}
                        {(!doc.validationStatus || doc.validationStatus === 'Pending') && (
                          <span className="badge badge-pending" title="Validation pending">
                            <Clock size={12} />
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

            {/* Document Modal Navigation Tabs */}
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
              <button
                type="button"
                className={`modal-tab-nav-btn ${modalTab === 'intelligence' ? 'active' : ''}`}
                onClick={() => setModalTab('intelligence')}
              >
                <Sparkles size={14} />
                <span>Document Intelligence</span>
              </button>
              <button
                type="button"
                className={`modal-tab-nav-btn ${modalTab === 'ask' ? 'active' : ''}`}
                onClick={() => setModalTab('ask')}
              >
                <HelpCircle size={14} />
                <span>Ask about Document</span>
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
              ) : modalTab === 'analytics' ? (
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
              ) : modalTab === 'intelligence' ? (
                /* Document Intelligence Tab Content */
                <div className="intelligence-tab-container">
                  {isLoadingIntel ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>Extracting Document Intelligence &amp; Topics...</p>
                    </div>
                  ) : !docIntelligence ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <p style={{ fontSize: '14px' }}>No intelligence metadata available for this record yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* 1. Classification & Confidence */}
                      <div className="intel-card intel-card-classification">
                        <div className="intel-card-header">
                          <span className="intel-badge intel-badge-category">
                            {docIntelligence.classification?.documentCategory || 'Unknown'}
                          </span>
                          <span className="intel-badge intel-badge-confidence">
                            {docIntelligence.classification?.classificationConfidence || 0}% Confidence
                          </span>
                        </div>
                        <div className="intel-reason-text">
                          <strong>Classification Basis: </strong>
                          {docIntelligence.classification?.classificationReason || 'Pattern match'}
                        </div>
                      </div>

                      {/* 2. Executive Factual Summary */}
                      <div className="intel-card">
                        <div className="modal-section-title" style={{ marginTop: 0 }}>
                          <FileText size={16} />
                          <span>Deterministic Executive Summary</span>
                        </div>
                        <p className="intel-summary-p">
                          {docIntelligence.summary}
                        </p>
                      </div>

                      {/* 3. Mining Topics & Ontology Weights */}
                      <div className="intel-card">
                        <div className="modal-section-title" style={{ marginTop: 0 }}>
                          <Sparkles size={16} />
                          <span>Extracted Topics &amp; Normalized Weights</span>
                        </div>
                        <div className="intel-topics-grid">
                          {docIntelligence.topics?.map((t) => (
                            <div key={t.topic} className="intel-topic-item">
                              <div className="intel-topic-label">
                                <span>{t.topic}</span>
                                <span className="intel-topic-pct">{Math.round((t.weight || 0) * 100)}%</span>
                              </div>
                              <div className="intel-topic-bar-bg">
                                <div
                                  className="intel-topic-bar-fill"
                                  style={{ width: `${Math.round((t.weight || 0) * 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 4. Domain Keywords */}
                      <div className="intel-card">
                        <div className="modal-section-title" style={{ marginTop: 0 }}>
                          <Tag size={16} />
                          <span>Frequency-Ranked Keywords</span>
                        </div>
                        <div className="intel-keywords-cloud">
                          {docIntelligence.keywords?.map((kw) => (
                            <span key={kw} className="intel-keyword-chip">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 5. Named Entities */}
                      <div className="intel-card">
                        <div className="modal-section-title" style={{ marginTop: 0 }}>
                          <Building2 size={16} />
                          <span>Deterministic Named Entities</span>
                        </div>
                        <div className="intel-entities-grid">
                          {docIntelligence.entities?.organizations?.length > 0 && (
                            <div className="intel-entity-col">
                              <span className="intel-entity-group-title">Organizations &amp; Subsidiaries</span>
                              <div className="intel-entity-pills">
                                {docIntelligence.entities.organizations.map((org) => (
                                  <span key={org} className="intel-entity-pill pill-org">{org}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {(docIntelligence.entities?.states?.length > 0 || docIntelligence.entities?.districts?.length > 0) && (
                            <div className="intel-entity-col">
                              <span className="intel-entity-group-title">Geographical Locations</span>
                              <div className="intel-entity-pills">
                                {docIntelligence.entities.states?.map((st) => (
                                  <span key={st} className="intel-entity-pill pill-loc">{st}</span>
                                ))}
                                {docIntelligence.entities.districts?.map((dst) => (
                                  <span key={dst} className="intel-entity-pill pill-loc">{dst}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {docIntelligence.entities?.mines?.length > 0 && (
                            <div className="intel-entity-col">
                              <span className="intel-entity-group-title">Collieries &amp; Mines</span>
                              <div className="intel-entity-pills">
                                {docIntelligence.entities.mines.map((m) => (
                                  <span key={m} className="intel-entity-pill pill-mine">{m}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {docIntelligence.entities?.measurements?.length > 0 && (
                            <div className="intel-entity-col">
                              <span className="intel-entity-group-title">Physical Metrics &amp; Units</span>
                              <div className="intel-entity-pills">
                                {docIntelligence.entities.measurements.map((meas) => (
                                  <span key={meas} className="intel-entity-pill pill-meas">{meas}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 6. Related Documents */}
                      <div className="intel-card">
                        <div className="modal-section-title" style={{ marginTop: 0 }}>
                          <Layers size={16} />
                          <span>Related Documents Graph ({docIntelligence.relationships?.relatedDocuments?.length || 0})</span>
                        </div>
                        {docIntelligence.relationships?.relatedDocuments?.length === 0 ? (
                          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>No cross-document relationships detected with active records.</p>
                        ) : (
                          <div className="intel-related-list">
                            {docIntelligence.relationships?.relatedDocuments?.map((rel) => (
                              <div key={rel.documentId} className="intel-related-item">
                                <div className="intel-related-info">
                                  <div className="intel-related-title">{rel.documentTitle}</div>
                                  <div className="intel-related-meta">
                                    <span>{rel.subsidiary}</span> &bull; <span>FY: {rel.financialYear}</span>
                                    <div className="intel-shared-chips">
                                      {rel.sharedAttributes?.map((attr) => (
                                        <span key={attr} className="intel-shared-chip">{attr}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <span className="intel-similarity-badge">
                                  {rel.similarityScore}% Match
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Ask about Document Tab Content */
                <div className="doc-ask-tab-container" style={{ padding: '0.5rem 0' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                      Deterministic Document Q&amp;A
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                      Ask questions about this specific document. Answers are derived strictly from verified metadata, validation audit rules, and domain ontologies.
                    </p>
                  </div>

                  {/* Preset Question Buttons */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Recommended Inquiries:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn-subtle"
                        onClick={() => handleAskDoc('validation')}
                        disabled={docQueryLoading}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '20px' }}
                      >
                        <ShieldCheck size={14} color="#16a34a" />
                        <span>Validation Status &amp; Score</span>
                      </button>
                      <button
                        type="button"
                        className="btn-subtle"
                        onClick={() => handleAskDoc('summary')}
                        disabled={docQueryLoading}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '20px' }}
                      >
                        <FileText size={14} color="#0284c7" />
                        <span>Executive Summary</span>
                      </button>
                      <button
                        type="button"
                        className="btn-subtle"
                        onClick={() => handleAskDoc('entities')}
                        disabled={docQueryLoading}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '20px' }}
                      >
                        <Building2 size={14} color="#9333ea" />
                        <span>Entities, Mines &amp; Locations</span>
                      </button>
                      <button
                        type="button"
                        className="btn-subtle"
                        onClick={() => handleAskDoc('topics')}
                        disabled={docQueryLoading}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '20px' }}
                      >
                        <Sparkles size={14} color="#f97316" />
                        <span>Detected Mining Topics</span>
                      </button>
                      <button
                        type="button"
                        className="btn-subtle"
                        onClick={() => handleAskDoc('related')}
                        disabled={docQueryLoading}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '20px' }}
                      >
                        <Layers size={14} color="#2563eb" />
                        <span>Related Documents</span>
                      </button>
                    </div>
                  </div>

                  {/* Custom Question Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (docCustomQuery.trim()) {
                        handleAskDoc('custom', docCustomQuery.trim());
                      }
                    }}
                    style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}
                  >
                    <input
                      type="text"
                      placeholder="Ask anything about this document... e.g. 'What is the validation score?'"
                      value={docCustomQuery}
                      onChange={(e) => setDocCustomQuery(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.6rem 0.85rem',
                        fontSize: '0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={docQueryLoading || !docCustomQuery.trim()}
                      style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                      {docQueryLoading ? 'Querying...' : 'Ask'}
                    </button>
                  </form>

                  {/* Loading State */}
                  {docQueryLoading && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '0.85rem' }}>Extracting verified answer from metadata...</p>
                    </div>
                  )}

                  {/* Answer Card */}
                  {docQueryAnswer && !docQueryLoading && (
                    <div
                      style={{
                        padding: '1.1rem',
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '8px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                          <CheckCircle2 size={16} color="#16a34a" />
                          <span>{Math.round((docQueryAnswer.confidence || 0.98) * 100)}% Verified Response</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', fontWeight: 600 }}>
                          {docQueryAnswer.queryType || 'Document Question'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4, marginBottom: '0.65rem' }}>
                        {docQueryAnswer.answer}
                      </div>

                      {(docQueryAnswer.reasoning || docQueryAnswer.reason) && (
                        <div style={{ fontSize: '0.8rem', color: '#475569', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #3b82f6', marginBottom: '0.75rem' }}>
                          <strong>Basis: </strong>
                          {docQueryAnswer.reasoning || docQueryAnswer.reason}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.4rem' }}>
                        <Link
                          to={`/qa?q=${encodeURIComponent(docQueryAnswer.question || '')}&documentId=${viewingDoc.documentId}`}
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#1e3a8a',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Bot size={14} />
                          <span>Open in Coal Intelligence Q&amp;A</span>
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  )}
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
