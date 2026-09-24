import React, { useState, useEffect, useCallback } from 'react';
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
  X
} from 'lucide-react';
import { searchDocuments, reindexSearch } from '../services/intelligence.service.js';

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
            Phase 9 Semantic Discovery Engine. Instant multi-attribute search across validated mining reports,
            topic ontologies, extracted entities, and cross-document relationship graphs.
          </p>
        </div>
        <div className="reports-header-meta">
          <div className="reports-meta-chip">
            <span className="reports-meta-dot"></span> Pure-JSON Inverted Index
          </div>
          <button
            className="reports-btn-refresh"
            onClick={handleReindex}
            disabled={isReindexing}
            title="Re-scan and rebuild search index"
          >
            <RotateCcw size={14} className={isReindexing ? 'spin' : ''} />
            <span>Re-Index Search</span>
          </button>
        </div>
      </div>

      {/* Notification Alert */}
      {notification && (
        <div className={`reports-alert reports-alert-${notification.type}`}>
          <span>{notification.message}</span>
          <button className="reports-alert-close" onClick={() => setNotification(null)}>
            <X size={16} />
          </button>
        </div>
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
          <button className="search-submit-btn" onClick={executeSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search Index'}
          </button>
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

          <button className="search-filter-reset" onClick={handleResetFilters} title="Reset all filters">
            <RotateCcw size={13} /> Reset
          </button>
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

        {results.length === 0 ? (
          <div className="reports-empty-state" style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <Search size={44} color="#94a3b8" />
            <h3>No Documents Match Query</h3>
            <p>Try broadening your search term or resetting the multi-attribute filters above.</p>
          </div>
        ) : (
          <div className="search-cards-grid">
            {results.map((doc) => (
              <div key={doc.documentId} className="search-result-card">
                <div className="search-card-top">
                  <div className="search-card-category-badge">
                    {doc.documentCategory || 'Report'}
                  </div>
                  {doc.searchScore && (
                    <span className="search-card-score">
                      Match Score: {doc.searchScore}
                    </span>
                  )}
                </div>

                <h3 className="search-card-title">{doc.reportTitle}</h3>

                <div className="search-card-meta-row">
                  <span><strong>Subsidiary:</strong> {doc.subsidiary}</span>
                  {doc.mineName && doc.mineName !== 'N/A' && (
                    <span><strong>Mine:</strong> {doc.mineName}</span>
                  )}
                  {doc.state && doc.state !== 'N/A' && (
                    <span><strong>State:</strong> {doc.state}</span>
                  )}
                  <span><strong>FY:</strong> {doc.financialYear}</span>
                  {doc.coalProduction > 0 && (
                    <span><strong>Production:</strong> {doc.coalProduction} {doc.productionUnit}</span>
                  )}
                </div>

                {doc.summary && (
                  <p className="search-card-summary">
                    {doc.summary}
                  </p>
                )}

                {doc.matchHighlights && doc.matchHighlights.length > 0 && (
                  <div className="search-card-highlights">
                    {doc.matchHighlights.map((hl, i) => (
                      <span key={i} className="highlight-tag">{hl}</span>
                    ))}
                  </div>
                )}

                <div className="search-card-footer">
                  <div className="search-card-topics">
                    {doc.topTopics?.map((t) => (
                      <span key={t} className="search-topic-pill">
                        <Sparkles size={11} /> {t}
                      </span>
                    ))}
                  </div>
                  {doc.relatedCount > 0 && (
                    <span className="search-related-count">
                      <Layers size={13} /> {doc.relatedCount} Related Record{doc.relatedCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
