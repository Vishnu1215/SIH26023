import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Sparkles,
  HelpCircle,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  Trash2,
  ArrowRight,
  Filter,
  FileText,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  X,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  BarChart3
} from 'lucide-react';
import {
  executeNaturalLanguageQuery,
  getQueryHistory,
  clearQueryHistory,
  getQuerySuggestions
} from '../services/query.service.js';
import { formatNumber, formatProduction, formatPercent } from '../utils/formatters.js';

export default function QueryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Fetch initial suggestions and history
  const loadSuggestionsAndHistory = useCallback(async () => {
    try {
      const [suggs, hist] = await Promise.all([
        getQuerySuggestions().catch(() => []),
        getQueryHistory().catch(() => [])
      ]);
      setSuggestions(suggs);
      setHistory(hist);
    } catch (e) {
      console.warn('Could not load suggestions/history:', e);
    }
  }, []);

  useEffect(() => {
    loadSuggestionsAndHistory();
  }, [loadSuggestionsAndHistory]);

  // Execute query handler
  const handleRunQuery = async (queryText) => {
    const q = (queryText || inputQuery).trim();
    if (!q) return;

    setInputQuery(q);
    setSearchParams({ q });
    setLoading(true);
    setError(null);

    try {
      const res = await executeNaturalLanguageQuery({ query: q });
      setResponse(res);
      // Refresh history list
      const updatedHistory = await getQueryHistory().catch(() => []);
      setHistory(updatedHistory);
    } catch (err) {
      setError(err.message || 'Query execution failed.');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  // If URL has query param on initial load, auto-run
  useEffect(() => {
    if (initialQuery && !response && !loading) {
      handleRunQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleClearHistory = async () => {
    try {
      setHistoryLoading(true);
      await clearQueryHistory();
      setHistory([]);
    } catch (e) {
      console.warn('Failed to clear history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleClearInput = () => {
    setInputQuery('');
    setSearchParams({});
    setResponse(null);
    setError(null);
  };

  return (
    <div className="query-page-container">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={24} color="#f97316" />
            Natural Language Query & Decision Support
          </h1>
          <p className="page-subtitle">
            Deterministic rule-based query parser & analytics engine for the Ministry of Coal. Zero external AI. 100% Explainable.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn-subtle ${showHistoryPanel ? 'active' : ''}`}
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem' }}
          >
            <History size={16} />
            {showHistoryPanel ? 'Hide History' : 'View History'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showHistoryPanel ? '1fr 310px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main Content Area */}
        <div>
          {/* Natural Language Search Input Bar */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunQuery(inputQuery);
              }}
              style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Ask a question... e.g. 'Show production reports for SECL' or 'Which subsidiary has highest production?'"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.5rem 0.75rem 2.85rem',
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
                {inputQuery && (
                  <button
                    type="button"
                    onClick={handleClearInput}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !inputQuery.trim()}
                style={{
                  padding: '0.75rem 1.4rem',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {loading ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />}
                Ask Query
              </button>
            </form>

            {/* Quick Suggestions Ribbon */}
            {suggestions.length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <HelpCircle size={13} />
                  Recommended PRD Inquiries
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRunQuery(s.query)}
                      className="query-suggestion-chip"
                      style={{
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.8rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#f97316';
                        e.currentTarget.style.background = '#fff7ed';
                        e.currentTarget.style.color = '#c2410c';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.color = '#334155';
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', background: '#e2e8f0', borderRadius: '10px', color: '#475569' }}>
                        {s.category}
                      </span>
                      <span>{s.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem', background: '#fef2f2', borderColor: '#fecaca', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991b1b' }}>
              <AlertCircle size={20} color="#dc2626" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '1.25rem' }}>
              <Loader2 size={32} className="spin" color="#f97316" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ color: '#475569', fontWeight: 500 }}>Parsing natural language intent and querying Single Source of Truth...</p>
            </div>
          )}

          {/* Response Section */}
          {response && !loading && (
            <div className="response-container">
              {/* Filter Extraction Ribbon */}
              {response.filters && Object.keys(response.filters).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Filter size={14} color="#64748b" /> Extracted Filters:
                  </span>
                  {Object.entries(response.filters).map(([k, v]) => (
                    <span
                      key={k}
                      style={{
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                        borderRadius: '6px'
                      }}
                    >
                      {k}: <strong>{String(v)}</strong>
                    </span>
                  ))}
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: '#f1f5f9',
                      color: '#475569',
                      borderRadius: '6px'
                    }}
                  >
                    Intent: <strong>{response.intent}</strong>
                  </span>
                </div>
              )}

              {/* Answer Hero Card */}
              <div
                className="card"
                style={{
                  padding: '1.4rem',
                  marginBottom: '1.25rem',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1.5px solid #cbd5e1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={18} color="#16a34a" />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Deterministic Answer
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} />
                      {response.executionTimeMs} ms
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Database size={12} />
                      {response.source}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4, marginBottom: '0.85rem' }}>
                  {response.answer}
                </div>

                <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #3b82f6', fontSize: '0.85rem', color: '#334155' }}>
                  <strong style={{ color: '#1e40af' }}>Rationale: </strong>
                  {response.reason}
                </div>

                {/* Optional Metric Highlight widgets */}
                {response.data && (response.data.production !== undefined || response.data.totalCoalProduction !== undefined || response.data.validationAccuracy !== undefined) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                    {response.data.leader && (
                      <div style={{ padding: '0.65rem 0.85rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Top Entity</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{response.data.leader}</div>
                      </div>
                    )}
                    {response.data.production !== undefined && (
                      <div style={{ padding: '0.65rem 0.85rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Output ({response.data.unit || 'MT'})</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>
                          {formatProduction(response.data.production)}
                        </div>
                      </div>
                    )}
                    {response.data.totalCoalProduction !== undefined && (
                      <div style={{ padding: '0.65rem 0.85rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Production</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                          {formatProduction(response.data.totalCoalProduction)} MT
                        </div>
                      </div>
                    )}
                    {response.data.validationAccuracy !== undefined && (
                      <div style={{ padding: '0.65rem 0.85rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Validation Accuracy</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2563eb' }}>
                          {formatPercent(response.data.validationAccuracy)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Supporting Records Grid */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} color="#64748b" />
                    Supporting Verified Records
                    <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', background: '#e2e8f0', color: '#334155', borderRadius: '12px' }}>
                      {response.supportingRecords?.length || 0}
                    </span>
                  </h3>
                </div>

                {(!response.supportingRecords || response.supportingRecords.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                    <p>No individual document records directly linked to this consolidated metric.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Document Title</th>
                          <th>Category</th>
                          <th>Subsidiary</th>
                          <th>Mine / State</th>
                          <th>FY</th>
                          <th>Output (MT)</th>
                          <th>Validation</th>
                          <th style={{ textAlign: 'center' }}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {response.supportingRecords.map((doc, idx) => (
                          <tr key={doc.documentId || idx}>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <FileText size={14} color="#f97316" />
                                <span title={doc.reportTitle}>{doc.reportTitle || doc.documentId}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', background: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                                {doc.documentCategory || doc.category || 'Report'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{doc.subsidiary || '-'}</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{doc.mineName && doc.mineName !== 'N/A' ? doc.mineName : '-'}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{doc.state || '-'}</span>
                              </div>
                            </td>
                            <td>{doc.financialYear || '-'}</td>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>
                              {doc.coalProduction !== undefined ? formatProduction(doc.coalProduction) : '-'}
                            </td>
                            <td>
                              {doc.validationStatus === 'Valid' ? (
                                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <ShieldCheck size={12} /> {doc.validationScore || 100}%
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <ShieldAlert size={12} /> {doc.validationStatus || 'Audit Flag'}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className="btn-subtle"
                                onClick={() => setSelectedDoc(doc)}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State / Instructional Guide */}
          {!response && !loading && (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Sparkles size={24} color="#f97316" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                Deterministic Decision Support Engine
              </h3>
              <p style={{ maxWidth: '580px', margin: '0 auto 1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Enter any natural language query regarding coal production, subsidiaries, state output, mines, financial years, or validation health. The platform interprets questions into deterministic rules over verified single sources of truth.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', textAlign: 'left', maxWidth: '780px', margin: '0 auto' }}>
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <TrendingUp size={16} color="#16a34a" /> Production Analytics
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Query output, targets, achievement %, and leadership across CIL subsidiaries.
                  </p>
                  <button
                    onClick={() => handleRunQuery('Which subsidiary has the highest production?')}
                    style={{ fontSize: '0.75rem', color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                  >
                    Try: Which subsidiary has highest production? →
                  </button>
                </div>

                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldCheck size={16} color="#2563eb" /> Statutory Validation
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Identify documents failing validation rules or check overall compliance scores.
                  </p>
                  <button
                    onClick={() => handleRunQuery('Which documents failed validation?')}
                    style={{ fontSize: '0.75rem', color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                  >
                    Try: Which documents failed validation? →
                  </button>
                </div>

                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={16} color="#d97706" /> Geographic & Mines
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Extract active mines and regional outputs across Jharkhand, Chhattisgarh, Odisha.
                  </p>
                  <button
                    onClick={() => handleRunQuery('List mines in Chhattisgarh')}
                    style={{ fontSize: '0.75rem', color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                  >
                    Try: List mines in Chhattisgarh →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Query History Sidebar */}
        {showHistoryPanel && (
          <div className="card" style={{ padding: '1.1rem', position: 'sticky', top: '1.5rem', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                <History size={16} color="#f97316" />
                Recent Inquiries
              </div>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  disabled={historyLoading}
                  className="btn-subtle"
                  style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', color: '#dc2626' }}
                  title="Clear Query History"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                No recent queries recorded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {history.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => handleRunQuery(h.query)}
                    style={{
                      padding: '0.65rem 0.75rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#f97316';
                      e.currentTarget.style.background = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem', lineHeight: 1.3 }}>
                      {h.query}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                      <span>{h.totalResults} result(s)</span>
                      <span>{h.timestamp ? new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="modal-backdrop" onClick={() => setSelectedDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="#f97316" />
                {selectedDoc.reportTitle || selectedDoc.documentId}
              </h3>
              <button onClick={() => setSelectedDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Category</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDoc.documentCategory || selectedDoc.category || '-'}</div>
              </div>
              <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Subsidiary</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDoc.subsidiary || '-'}</div>
              </div>
              <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mine Name</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDoc.mineName || '-'}</div>
              </div>
              <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>State</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDoc.state || '-'}</div>
              </div>
              <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Financial Year</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDoc.financialYear || '-'}</div>
              </div>
              <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Coal Output</div>
                <div style={{ fontWeight: 700, color: '#16a34a' }}>
                  {selectedDoc.coalProduction !== undefined ? formatProduction(selectedDoc.coalProduction) : '-'} MT
                </div>
              </div>
            </div>

            {selectedDoc.summary && (
              <div style={{ marginTop: '0.75rem', padding: '0.85rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>
                <strong style={{ color: '#0f172a' }}>Executive Summary: </strong>
                {selectedDoc.summary}
              </div>
            )}

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button className="btn-primary" onClick={() => setSelectedDoc(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
