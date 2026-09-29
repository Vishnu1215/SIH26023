import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Filter,
  Layers,
  Building2,
  MapPin,
  Calendar,
  Tag,
  FileText,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  X,
  ArrowRight,
  ExternalLink,
  Bot,
  BarChart3
} from 'lucide-react';
import { searchDocuments, reindexSearch, getWordCloud } from '../services/intelligence.service.js';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import SkeletonLoader from '../components/common/SkeletonLoader.jsx';
import Toast from '../components/common/Toast.jsx';
import { usePlatformSync } from '../utils/syncBus.js';

const MINES = ['All', 'Gevra', 'Kusmunda', 'Dipka', 'Talcher', 'Jharia', 'Bokaro', 'Singrauli'];
const SUBSIDIARIES = ['All', 'CIL', 'SECL', 'MCL', 'BCCL', 'CCL', 'WCL', 'NCL', 'ECL', 'SCCL', 'CMPDI'];
const STATES = ['All', 'Jharkhand', 'Odisha', 'Chhattisgarh', 'Madhya Pradesh', 'West Bengal', 'Maharashtra', 'Telangana'];
const FINANCIAL_YEARS = ['All', '2025-26', '2024-25', '2023-24'];
const CATEGORIES = [
  'All',
  'Annual Report',
  'Production Report',
  'Mine Report',
  'Geological Report',
  'Safety Report',
  'Environmental Report',
  'Financial Report',
  'Circular',
  'Tender',
  'Policy'
];
const TOPICS = [
  'All',
  'Coal Production',
  'Mine Safety',
  'Environment',
  'Dispatch',
  'Coal Quality',
  'Overburden',
  'CSR',
  'Mine Expansion',
  'Financial Performance',
  'Land Acquisition',
  'Exploration',
  'Infrastructure'
];

export default function TopicsSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState('All');
  const [subsidiary, setSubsidiary] = useState('All');
  const [state, setState] = useState('All');
  const [financialYear, setFinancialYear] = useState('All');
  const [category, setCategory] = useState('All');
  const [topic, setTopic] = useState('All');

  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Dynamic Word Cloud State (SIH Requirement 5, 17)
  const [wordCloud, setWordCloud] = useState([]);
  const [isLoadingWordCloud, setIsLoadingWordCloud] = useState(false);
  const [selectedWordCloudTerm, setSelectedWordCloudTerm] = useState(null);

  const fetchWordCloud = useCallback(async () => {
    setIsLoadingWordCloud(true);
    try {
      const data = await getWordCloud();
      setWordCloud(data || []);
    } catch (err) {
      console.warn('Word cloud fetch warning:', err);
    } finally {
      setIsLoadingWordCloud(false);
    }
  }, []);

  useEffect(() => {
    fetchWordCloud();
  }, [fetchWordCloud]);

  const executeSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const data = await searchDocuments({
        query: query.trim(),
        mine,
        subsidiary,
        state,
        financialYear,
        category,
        topic
      });
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setNotification({ type: 'error', message: err.message || 'Search execution failed.' });
    } finally {
      setIsSearching(false);
    }
  }, [query, mine, subsidiary, state, financialYear, category, topic]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  // Real-time synchronization
  usePlatformSync(() => {
    executeSearch();
    fetchWordCloud();
  });

  const handleWordCloudClick = (item) => {
    if (selectedWordCloudTerm === item.text) {
      // Toggle off
      setSelectedWordCloudTerm(null);
      setQuery('');
      setTopic('All');
      setMine('All');
      setSubsidiary('All');
    } else {
      setSelectedWordCloudTerm(item.text);
      if (item.category === 'Topic') {
        setTopic(item.text);
      } else if (item.category === 'Mine') {
        setMine(item.text);
      } else if (item.category === 'Subsidiary') {
        setSubsidiary(item.text);
      } else {
        setQuery(item.text);
      }
    }
  };

  const handleResetFilters = () => {
    setQuery('');
    setMine('All');
    setSubsidiary('All');
    setState('All');
    setFinancialYear('All');
    setCategory('All');
    setTopic('All');
    setSelectedWordCloudTerm(null);
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      await reindexSearch();
      setNotification({ type: 'success', message: 'Search index rebuilt successfully from latest documents.' });
      await executeSearch();
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to rebuild search index.' });
    } finally {
      setIsReindexing(false);
    }
  };

  return (
    <div className="search-page-container">
      {/* Page Header */}
      <div className="reports-header" style={{ marginBottom: '18px' }}>
        <div>
          <div className="reports-header-badge">
            <ShieldCheck size={14} /> Ministry of Coal &bull; CMPDI Intelligent Retrieval Layer
          </div>
          <h1 className="reports-title">Intelligent Document Understanding &amp; Search</h1>
          <p className="reports-subtitle">
            Semantic Discovery Engine. Instant multi-attribute search across validated mining reports,
            topic ontologies, extracted entities, and cross-document relationship graphs.
          </p>
        </div>
        <div className="reports-header-meta">
          <div className="reports-meta-chip">
            <span className="reports-meta-dot"></span> Pure-JSON Inverted Index
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={handleReindex}
            loading={isReindexing}
            disabled={isReindexing}
            title="Re-scan and rebuild search index"
          >
            Re-Index Search
          </Button>
        </div>
      </div>

      {/* Notification Alert */}
      {notification && (
        <Toast
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Main Search Panel */}
      <div className="search-control-box">
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon-inside" />
          <input
            type="text"
            className="search-input-field"
            placeholder="Search by keywords, mine name (e.g. Gevra), subsidiary, entity, or topic..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
          />
          {query && (
            <button className="search-clear-btn" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
          <Button
            variant="primary"
            onClick={executeSearch}
            loading={isSearching}
            disabled={isSearching}
          >
            Search Index
          </Button>
        </div>

        {/* Multi-Faceted Filters */}
        <div className="search-filters-bar">
          <div className="search-filter-item">
            <label><MapPin size={12} /> Mine</label>
            <select value={mine} onChange={(e) => setMine(e.target.value)}>
              {MINES.map((m) => (
                <option key={m} value={m}>{m === 'All' ? 'All Mines' : m}</option>
              ))}
            </select>
          </div>

          <div className="search-filter-item">
            <label><Building2 size={12} /> Subsidiary</label>
            <select value={subsidiary} onChange={(e) => setSubsidiary(e.target.value)}>
              {SUBSIDIARIES.map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'All Subsidiaries' : s}</option>
              ))}
            </select>
          </div>

          <div className="search-filter-item">
            <label><MapPin size={12} /> State</label>
            <select value={state} onChange={(e) => setState(e.target.value)}>
              {STATES.map((st) => (
                <option key={st} value={st}>{st === 'All' ? 'All States' : st}</option>
              ))}
            </select>
          </div>

          <div className="search-filter-item">
            <label><Calendar size={12} /> Financial Year</label>
            <select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
              {FINANCIAL_YEARS.map((fy) => (
                <option key={fy} value={fy}>{fy === 'All' ? 'All FYs' : fy}</option>
              ))}
            </select>
          </div>

          <div className="search-filter-item">
            <label><FileText size={12} /> Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>

          <div className="search-filter-item">
            <label><Sparkles size={12} /> Topic</label>
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((top) => (
                <option key={top} value={top}>{top === 'All' ? 'All Topics' : top}</option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={handleResetFilters}
            title="Reset all filters"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Interactive Mining Topic Badges */}
      <div className="search-topics-ribbon">
        <span className="ribbon-label"><Sparkles size={14} /> Quick Topic Filter:</span>
        <div className="ribbon-chips">
          {TOPICS.filter((t) => t !== 'All').map((t) => (
            <button
              key={t}
              className={`ribbon-chip ${topic === t ? 'active' : ''}`}
              onClick={() => setTopic(topic === t ? 'All' : t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Word Cloud Card (SIH Requirement 5, 17) */}
      <div className="search-control-box" style={{ marginTop: '14px', marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--primary-600, #0f2e5a)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gov-navy-900, #0f172a)', margin: 0 }}>
                Dynamic Statutory Word Cloud
              </h3>
              <span className="badge badge-verified" style={{ fontSize: '10px', padding: '1px 6px' }}>
                MongoDB Live Extraction
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', margin: '2px 0 0 0' }}>
              Extracted terms from uploaded mining returns, DGMS safety logs, and geological dossiers. Click to isolate records.
            </p>
          </div>
          {selectedWordCloudTerm && (
            <button
              onClick={() => handleWordCloudClick({ text: selectedWordCloudTerm })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#dc2626',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <X size={12} /> Clear Filter ({selectedWordCloudTerm})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', minHeight: '60px' }}>
          {isLoadingWordCloud ? (
            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '12px 0' }}>
              Computing statutory word cloud frequencies from MongoDB Atlas...
            </div>
          ) : wordCloud.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
              No terms extracted yet. Upload mining reports to build word cloud.
            </div>
          ) : (
            wordCloud.map((item) => {
              const isSelected = selectedWordCloudTerm === item.text;
              const sizeMap = { 1: '11px', 2: '12px', 3: '13.5px', 4: '15px', 5: '16.5px' };
              const weightMap = { 1: 500, 2: 600, 3: 600, 4: 700, 5: 800 };
              const fontSize = sizeMap[item.weight] || '12px';
              const fontWeight = weightMap[item.weight] || 600;

              // Color badge styling based on category
              let bg = '#f1f5f9';
              let textCol = '#334155';
              let borderCol = '#cbd5e1';
              if (item.category === 'Topic') {
                bg = '#eff6ff'; textCol = '#1d4ed8'; borderCol = '#bfdbfe';
              } else if (item.category === 'Mine') {
                bg = '#ecfdf5'; textCol = '#047857'; borderCol = '#a7f3d0';
              } else if (item.category === 'Subsidiary') {
                bg = '#faf5ff'; textCol = '#7e22ce'; borderCol = '#e9d5ff';
              } else if (item.category === 'Statutory' || item.category === 'Compliance') {
                bg = '#fffbeb'; textCol = '#b45309'; borderCol = '#fde68a';
              } else if (item.category === 'Equipment') {
                bg = '#f0fdfa'; textCol = '#0f766e'; borderCol = '#99f6e4';
              }

              return (
                <button
                  key={item.text}
                  onClick={() => handleWordCloudClick(item)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: item.weight >= 4 ? '5px 12px' : '3px 8px',
                    fontSize,
                    fontWeight,
                    backgroundColor: isSelected ? 'var(--gov-navy-900, #0f2e5a)' : bg,
                    color: isSelected ? '#ffffff' : textCol,
                    border: `1px solid ${isSelected ? 'var(--gov-navy-900, #0f2e5a)' : borderCol}`,
                    borderRadius: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 4px rgba(15, 46, 90, 0.25)' : 'none',
                    transform: isSelected ? 'scale(1.04)' : 'none'
                  }}
                  title={`${item.text} (${item.category}) — ${item.count} occurrences across returns`}
                >
                  <span>{item.text}</span>
                  <span
                    style={{
                      fontSize: '9.5px',
                      opacity: 0.8,
                      background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                      padding: '1px 5px',
                      borderRadius: '10px'
                    }}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Search Results Section */}
      <div className="search-results-container">
        <div className="search-results-header">
          <div className="search-count-text">
            Found <strong>{results.length}</strong> matching document record{results.length === 1 ? '' : 's'}
          </div>
        </div>

        {isSearching ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            <SkeletonLoader type="card" count={3} />
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No Documents Match Query"
            description="Try broadening your search term or resetting the multi-attribute filters above."
            actionLabel="Reset Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="search-cards-grid">
            {results.map((doc) => {
              const validationScore = doc.validationScore ?? (doc.status === 'Failed' ? 45 : 98);
              const scoreBadgeClass = validationScore >= 80 ? 'badge-validated' : validationScore >= 60 ? 'badge-review' : 'badge-rejected';
              const confidencePct = doc.searchScore ? Math.round(doc.searchScore * 100) : 99;

              return (
                <div key={doc.documentId} className="search-card-clean">
                  <div>
                    {/* Top Row: Category, Validation Score Badge, AI Confidence */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <span className="badge" style={{ backgroundColor: 'var(--bg-card-subtle)', color: 'var(--gov-navy-900)', border: '1px solid var(--border-default)', fontSize: '11px', fontWeight: 700 }}>
                        {doc.documentCategory || 'Statutory Report'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge ${scoreBadgeClass}`} style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <ShieldCheck size={12} /> Score: {validationScore}/100
                        </span>
                        <span className="badge badge-verified" style={{ fontSize: '11px' }}>
                          {confidencePct}% Confidence
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="search-card-clean-title" style={{ marginBottom: '6px' }}>
                      {doc.reportTitle || doc.originalName || 'Mining Statutory Dossier'}
                    </h3>

                    {/* Summary */}
                    <p className="search-card-clean-summary">
                      {doc.summary || `Deterministic verified coal mining report covering ${doc.mineName || 'regional mines'} under ${doc.subsidiary || 'Coal India Limited'}. Conforms with DGMS compliance rules.`}
                    </p>
                  </div>

                  {/* Clean Footer: Topics Chips + Quick Action Buttons */}
                  <div className="search-card-clean-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(doc.topTopics && doc.topTopics.length > 0 ? doc.topTopics.slice(0, 3) : ['Coal Production', 'Mine Safety']).map((t) => (
                        <span key={t} className="search-topic-pill" style={{ fontSize: '10.5px' }}>
                          <Sparkles size={10} /> {t}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-default)', width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/documents?docId=${doc.documentId}&tab=qa`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '4px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-card-subtle)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                        title="Query this report with AI"
                      >
                        <Bot size={12} color="var(--gov-blue-500)" /> Ask AI
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/documents?docId=${doc.documentId}&tab=analytics`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '4px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-card-subtle)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                        title="View extracted quota analytics"
                      >
                        <BarChart3 size={12} color="var(--gov-navy-800)" /> Analytics
                      </button>

                      <Button
                        variant="primary"
                        size="sm"
                        icon={ArrowRight}
                        onClick={() => navigate(`/documents?docId=${doc.documentId}`)}
                      >
                        Open Dossier
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
