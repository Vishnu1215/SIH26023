import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UploadCloud,
  File,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Clock,
  HardDrive,
  Database,
  Eye,
  Tag
} from 'lucide-react';
import {
  uploadDocumentFile,
  getDocumentList,
  loadSampleDataset
} from '../services/document.service.js';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
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
      setToast({
        type: 'success',
        message: `"${selectedFile.name}" uploaded successfully! Status: ${response.document?.status || 'Uploaded'}`
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
                  <th>Upload Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const ext = doc.originalName.split('.').pop()?.toUpperCase() || 'FILE';
                  const isUploadedOk = doc.status === 'Uploaded';
                  const shortId = doc.documentId ? doc.documentId.slice(0, 8) : 'N/A';

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
                      <td className="col-time">
                        <div className="time-wrapper">
                          <Clock size={13} color="#94a3b8" />
                          <span>{new Date(doc.uploadedAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            isUploadedOk ? 'status-pill-success' : 'status-pill-pending'
                          }`}
                        >
                          {isUploadedOk ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <AlertCircle size={13} />
                          )}
                          <span>{doc.status}</span>
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-view-disabled"
                          disabled
                          title="View document details will be available in Phase 4"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
