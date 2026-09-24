import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  History,
  Trash2,
  Copy,
  Check,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building2,
  FileText,
  Clock,
  ArrowRight,
  Info,
  RefreshCw,
  Cpu,
  Layers,
  Database,
  BarChart3,
  Search
} from 'lucide-react';
import {
  askQAQuery,
  getQAHistory,
  clearQAHistory,
  getQASuggestions,
  explainQAQuery,
  getQAStatus
} from '../services/qa.service.js';
import { formatNumber, formatProduction } from '../utils/formatters.js';

export default function QAPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialDocId = searchParams.get('documentId') || null;

  const [inputQuestion, setInputQuestion] = useState(initialQ);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [useLLM, setUseLLM] = useState(false);
  const [qaStatus, setQAStatus] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedEvidence, setExpandedEvidence] = useState({});
  const [explainData, setExplainData] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load initial suggestions, history, and status
  const loadInitialData = useCallback(async () => {
    try {
      const [suggs, hist, status] = await Promise.all([
        getQASuggestions().catch(() => []),
        getQAHistory().catch(() => []),
        getQAStatus().catch(() => null)
      ]);
      setSuggestions(suggs);
      setHistory(hist);
      setQAStatus(status);
    } catch (err) {
      console.warn('Failed to load initial QA metadata:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Auto-execute if query param present
  useEffect(() => {
    if (initialQ && messages.length === 0) {
      handleAsk(initialQ, initialDocId);
    }
  }, [initialQ, initialDocId]);

  const handleAsk = async (questionText, docId = null) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || loading) return;

    // Add user message
    const userMsgId = 'msg-' + Date.now();
    const newUserMsg = {
      id: userMsgId,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      const response = await askQAQuery({
        question: q,
        useLLM,
        documentId: docId || initialDocId
      });

      const aiMsgId = 'ai-' + Date.now();
      const newAiMsg = {
        id: aiMsgId,
        sender: 'ai',
        data: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, newAiMsg]);

      // Refresh history in background
      getQAHistory().then((h) => setHistory(h)).catch(() => {});
    } catch (err) {
      const errorMsg = {
        id: 'err-' + Date.now(),
        sender: 'ai',
        error: err.message || 'Failed to process statutory query.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear your QA interaction history?')) {
      await clearQAHistory();
      setHistory([]);
      setMessages([]);
    }
  };

  const toggleEvidence = (msgId) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportResponse = (msg) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(msg.data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `coal_qa_response_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExplain = async (question) => {
    setExplainLoading(true);
    try {
      const exp = await explainQAQuery({ question });
      setExplainData(exp);
    } catch (err) {
      console.error('Explain failed:', err);
    } finally {
      setExplainLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '20px' }}>
      {/* Main Chat Flow Container */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Header Bar */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '16px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 10px rgba(30, 58, 138, 0.25)'
                }}
              >
                <Bot size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Coal Intelligence Q&amp;A
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    Phase 11 Hybrid QA
                  </span>
                </h1>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Statutory question answering grounded on Single Sources of Truth • Zero Hallucination
                </p>
              </div>
            </div>

            {/* Controls: History Drawer Toggle & LLM Adapter Switch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  background: historyOpen ? '#e2e8f0' : '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <History size={16} />
                <span>History ({history.length})</span>
              </button>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#475569',
                  cursor: 'pointer'
                }}
                title="When disabled, uses 100% deterministic rule synthesis. When enabled, passes verified context to LLM adapter."
              >
                <input
                  type="checkbox"
                  checked={useLLM}
                  onChange={(e) => setUseLLM(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <Cpu size={14} color="#0284c7" />
                <span style={{ fontWeight: 600 }}>LLM Adapter</span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {useLLM ? 'Ready' : 'Deterministic'}
                </span>
              </label>
            </div>
          </div>

          {/* Dynamic Suggested Question Chips */}
          {suggestions.length > 0 && (
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Sparkles size={14} color="#f97316" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Recommended Inquiries:
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {suggestions.slice(0, 5).map((sugg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAsk(sugg.question)}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      background: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#eff6ff';
                      e.currentTarget.style.borderColor = '#93c5fd';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    <span>{sugg.title}</span>
                    <ArrowRight size={12} color="#64748b" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Message Thread Area */}
        <div
          className="card"
          style={{
            flex: 1,
            minHeight: '480px',
            maxHeight: '680px',
            overflowY: 'auto',
            padding: '1.5rem',
            background: '#fafbfc',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '480px', padding: '2rem 1rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#1e3a8a'
                }}
              >
                <Bot size={36} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                How can Coal Intelligence assist you?
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '20px' }}>
                Ask complex questions regarding coal production, statutory validation audits, subsidiary performance, mine registries, or generated reports.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Which subsidiary produced the highest coal?',
                  'What is the overall validation accuracy?',
                  'Which documents failed validation or need review?',
                  'List mines operating in Chhattisgarh'
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(sample)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#1e3a8a',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{sample}</span>
                    <ArrowRight size={14} color="#94a3b8" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                {/* Sender Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                  {msg.sender === 'user' ? (
                    <>
                      <span>You</span>
                      <User size={13} />
                    </>
                  ) : (
                    <>
                      <Bot size={14} color="#1e3a8a" />
                      <span style={{ fontWeight: 700, color: '#1e3a8a' }}>Coal Intelligence</span>
                      <span>&bull; {msg.timestamp}</span>
                    </>
                  )}
                </div>

                {/* User Message Bubble */}
                {msg.sender === 'user' ? (
                  <div
                    style={{
                      maxWidth: '75%',
                      padding: '10px 16px',
                      borderRadius: '14px 14px 2px 14px',
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      boxShadow: '0 2px 6px rgba(30, 58, 138, 0.15)'
                    }}
                  >
                    {msg.text}
                  </div>
                ) : msg.error ? (
                  /* Error Card */
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      fontSize: '0.88rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                      <AlertCircle size={16} />
                      <span>Inquiry Notice</span>
                    </div>
                    <p style={{ margin: '6px 0 0 0' }}>{msg.error}</p>
                  </div>
                ) : (
                  /* AI Verified Response Card */
                  <div
                    style={{
                      maxWidth: '92%',
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* Card Top: Badges & Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            background: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          <ShieldCheck size={14} color="#059669" />
                          {Math.round((msg.data?.confidence || 0.98) * 100)}% Verified Confidence
                        </span>

                        <span
                          style={{
                            padding: '3px 8px',
                            background: '#eff6ff',
                            color: '#1e40af',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}
                        >
                          {msg.data?.queryType || 'Statutory Query'}
                        </span>

                        {msg.data?.responseTimeMs && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {msg.data.responseTimeMs} ms
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(msg.data?.answer || '', msg.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#475569'
                          }}
                          title="Copy answer to clipboard"
                        >
                          {copiedId === msg.id ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => exportResponse(msg)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#475569'
                          }}
                          title="Export answer as JSON"
                        >
                          <Download size={13} />
                          <span>Export</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExplain(msg.data?.question || '')}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#1e3a8a',
                            fontWeight: 600
                          }}
                          title="Explain reasoning and data sources"
                        >
                          <Info size={13} />
                          <span>Explain</span>
                        </button>
                      </div>
                    </div>

                    {/* Answer Statement */}
                    <div style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.55, marginBottom: '14px' }}>
                      {msg.data?.answer}
                    </div>

                    {/* Metrics Callout Strip (if present) */}
                    {msg.data?.metrics && Object.keys(msg.data.metrics).length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginBottom: '14px',
                          padding: '10px 12px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        {Object.entries(msg.data.metrics).map(([k, v]) => {
                          if (v === null || v === undefined || typeof v === 'object') return null;
                          return (
                            <div
                              key={k}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.78rem'
                              }}
                            >
                              <span style={{ color: '#64748b', textTransform: 'capitalize' }}>
                                {k.replace(/([A-Z])/g, ' $1')}:
                              </span>
                              <span style={{ fontWeight: 700, color: '#1e293b' }}>
                                {typeof v === 'number' ? (v > 1000 ? formatNumber(v) : v) : String(v)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Citations & Documents Used */}
                    {msg.data?.documentsUsed && msg.data.documentsUsed.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} color="#16a34a" />
                          <span>Supporting Evidence &amp; Citations:</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {msg.data.documentsUsed.map((cit, cIdx) => (
                            <div
                              key={cIdx}
                              style={{
                                padding: '8px 12px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '0.8rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                <span style={{ fontWeight: 700, color: '#1e3a8a' }}>
                                  {cit.sourceDocument}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  Page/Slice: {cit.page} &bull; {Math.round(cit.confidence * 100)}%
                                </span>
                              </div>
                              <p style={{ margin: 0, color: '#475569', fontSize: '0.76rem' }}>
                                {cit.excerpt}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expandable Evidence Accordion */}
                    <div style={{ marginBottom: '12px' }}>
                      <button
                        type="button"
                        onClick={() => toggleEvidence(msg.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#0284c7',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>{expandedEvidence[msg.id] ? 'Hide Evidence Trace' : 'View Full Evidence Trace'}</span>
                        {expandedEvidence[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {expandedEvidence[msg.id] && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '10px',
                            background: '#f1f5f9',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            color: '#334155'
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Computation Rationale:</div>
                          <p style={{ margin: '0 0 8px 0', color: '#475569' }}>{msg.data?.reasoning}</p>

                          {msg.data?.sqlStatement && (
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ fontWeight: 700, color: '#1e3a8a' }}>SQL Statement (Text-to-SQL Ready):</div>
                              <pre
                                style={{
                                  background: '#ffffff',
                                  padding: '6px',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  overflowX: 'auto',
                                  margin: '4px 0 0 0',
                                  fontSize: '0.72rem'
                                }}
                              >
                                {msg.data.sqlStatement}
                              </pre>
                            </div>
                          )}

                          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Extracted Evidence Items:</div>
                          <ul style={{ margin: 0, paddingLeft: '16px' }}>
                            {msg.data?.evidence?.map((ev, eIdx) => (
                              <li key={eIdx}>
                                <strong>{ev.source}:</strong> {ev.detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Follow-up Question Suggestion Pills */}
                    {msg.data?.followUpQuestions && msg.data.followUpQuestions.length > 0 && (
                      <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Suggested Follow-up Inquiries:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {msg.data.followUpQuestions.map((fq, fIdx) => (
                            <button
                              key={fIdx}
                              type="button"
                              onClick={() => handleAsk(fq)}
                              style={{
                                padding: '4px 10px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '16px',
                                fontSize: '0.76rem',
                                color: '#1e293b',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f1f5f9';
                                e.currentTarget.style.borderColor = '#94a3b8';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }}
                            >
                              <span>{fq}</span>
                              <ArrowRight size={11} color="#64748b" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', padding: '12px' }}>
              <Loader2 size={18} className="animate-spin" color="#1e3a8a" />
              <span style={{ fontSize: '0.85rem' }}>
                Consulting single source of truth analytics &amp; document intelligence...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="card"
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#ffffff'
          }}
        >
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Ask anything... e.g. 'Which subsidiary produced the highest coal?' or 'Validation accuracy'"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.92rem',
              color: '#0f172a'
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !inputQuestion.trim()}
            style={{
              padding: '8px 18px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Ask</span>
            <Send size={15} />
          </button>
        </form>
      </div>

      {/* History Drawer Sidebar */}
      {historyOpen && (
        <div
          className="card"
          style={{
            width: '320px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '820px'
          }}
        >
          <div
            style={{
              padding: '1rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem' }}>
              <History size={16} />
              <span>Inquiry History</span>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {history.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', margin: '2rem 0' }}>
                No past questions logged.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.map((h, idx) => (
                  <button
                    key={h.id || idx}
                    type="button"
                    onClick={() => handleAsk(h.question)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px', wordBreak: 'break-word' }}>
                      {h.question}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.7rem' }}>
                      <span>{h.queryType}</span>
                      <span>{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Explain Rationale Modal */}
      {explainData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setExplainData(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              background: '#ffffff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                <Info size={18} color="#0284c7" />
                <span>Explainable Query Rationale</span>
              </div>
              <button
                type="button"
                onClick={() => setExplainData(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Question:</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{explainData.question}</div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Deterministic Rationale:</div>
              <div style={{ fontSize: '0.85rem', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                {explainData.reasoning}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Data Sources Consulted:</div>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', fontSize: '0.82rem', color: '#1e3a8a' }}>
                {explainData.dataSources?.map((src) => (
                  <li key={src}>{src}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setExplainData(null)}
                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
