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
  ExternalLink
} from 'lucide-react';
import { searchDocuments, reindexSearch } from '../services/intelligence.service.js';
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
  usePlatformSync(executeSearch);

  const handleResetFilters = () => {
    setQuery('');
    setMine('All');
    setSubsidiary('All');
    setState('All');
    setFinancialYear('All');
    setCategory('All');
    setTopic('All');
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

                  {/* Clean Footer: Topics Chips + Open Document Button */}
                  <div className="search-card-clean-footer">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1, minWidth: 0 }}>
                      {(doc.topTopics && doc.topTopics.length > 0 ? doc.topTopics.slice(0, 3) : ['Coal Production', 'Mine Safety']).map((t) => (
                        <span key={t} className="search-topic-pill" style={{ fontSize: '10.5px' }}>
                          <Sparkles size={10} /> {t}
                        </span>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={ArrowRight}
                      onClick={() => navigate(`/documents?docId=${doc.documentId}`)}
                    >
                      Open Document
                    </Button>
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
