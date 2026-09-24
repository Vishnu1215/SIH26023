import React, { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Target,
  Award,
  Layers,
  FileText,
  Building2,
  MapPin,
  CheckCircle2,
  Gauge,
  ArrowRight,
  Filter,
  Sliders,
  Check,
  Clock,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';
import {
  fetchRecommendations,
  recomputeRecommendations
} from '../services/recommendation.service.js';
import { formatNumber, formatPercent } from '../utils/formatters.js';

export default function RecommendationsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'risk' | 'insights' | 'alerts' | 'trends'

  // Filters for Recommendations
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSubsidiary, setFilterSubsidiary] = useState('All');

  // Filter for Alerts
  const [filterSeverity, setFilterSeverity] = useState('All');

  const loadData = useCallback(async (force = false) => {
    if (force) setRecomputing(true);
    else setLoading(true);
    setError(null);

    try {
      if (force) {
        const updated = await recomputeRecommendations();
        setData(updated);
      } else {
        const res = await fetchRecommendations();
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError(err.message || 'Failed to connect to recommendation engine.');
    } finally {
      setLoading(false);
      setRecomputing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract nested payloads safely
  const summary = data?.summary || {};
  const risk = data?.risk || {};
  const recommendations = data?.recommendations || [];
  const alerts = data?.alerts || [];
  const insights = data?.insights || [];
  const trends = data?.trends || {};

  // Unique subsidiaries for filtering
  const allSubsidiaries = Array.from(
    new Set(
      recommendations.flatMap((r) => r.affectedSubsidiaries || []).filter(Boolean)
    )
  );

  // Filter recommendations
  const filteredRecs = recommendations.filter((r) => {
    if (filterPriority !== 'All' && r.priority !== filterPriority) return false;
    if (filterCategory !== 'All' && r.category !== filterCategory) return false;
    if (filterSubsidiary !== 'All') {
      const subs = (r.affectedSubsidiaries || []).map((s) => s.toLowerCase());
      if (!subs.includes(filterSubsidiary.toLowerCase())) return false;
    }
    return true;
  });

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity !== 'All' && a.severity !== filterSeverity) return false;
    return true;
  });

  // Helper for priority badge styling
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', label: 'Critical Priority' };
      case 'High':
        return { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa', label: 'High Priority' };
      case 'Medium':
        return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', label: 'Medium Priority' };
      default:
        return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', label: 'Low Priority' };
    }
  };

  // Helper for alert severity badge styling
  const getAlertBadge = (severity) => {
    switch (severity) {
      case 'Red':
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5', label: 'Red Alert' };
      case 'Orange':
        return { bg: '#fff7ed', text: '#c2410c', border: '#fdba74', label: 'Orange Alert' };
      case 'Yellow':
        return { bg: '#fefce8', text: '#a16207', border: '#fde047', label: 'Yellow Alert' };
      default:
        return { bg: '#f8fafc', text: '#475569', border: '#cbd5e1', label: 'Notice' };
    }
  };

  // Helper for trend badge styling
  const getTrendBadge = (trend) => {
    switch (trend) {
      case 'Increasing':
        return { icon: TrendingUp, color: '#16a34a', bg: '#ecfdf5', text: 'Increasing' };
      case 'Declining':
        return { icon: TrendingDown, color: '#dc2626', bg: '#fef2f2', text: 'Declining' };
      default:
        return { icon: Minus, color: '#2563eb', bg: '#eff6ff', text: 'Stable' };
    }
  };

  // Render Risk Meter Color
  const getRiskColor = (score) => {
    if (score >= 60) return '#dc2626'; // High
    if (score >= 30) return '#f59e0b'; // Medium
    return '#16a34a'; // Low
  };

  return (
    <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div className="card" style={{ padding: '1.25rem 1.75rem', marginBottom: '20px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)'
              }}
            >
              <Lightbulb size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  AI Recommendations &amp; Decision Support
                </h1>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: '#eff6ff',
                    color: '#1e40af',
                    border: '1px solid #bfdbfe',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}
                >
                  Phase 12
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Deterministic Operational Risk Auditing • Actionable Statutory Recommendations • Single Source of Truth
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {data?.lastUpdated && (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} />
                <span>Updated: {new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={() => loadData(true)}
              disabled={recomputing || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '0.84rem'
              }}
            >
              <RefreshCw size={14} className={recomputing ? 'animate-spin' : ''} />
              <span>{recomputing ? 'Recomputing...' : 'Recompute Decision Engine'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '20px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Section 1: Executive KPI Summary Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* KPI 1: Operational Risk */}
        <div className="card" style={{ padding: '1.25rem', background: '#ffffff', borderTop: `4px solid ${getRiskColor(summary.overallRisk || 0)}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Operational Risk Score
            </span>
            <Gauge size={20} color={getRiskColor(summary.overallRisk || 0)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              {summary.overallRisk !== undefined ? summary.overallRisk : '--'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>/ 100</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: summary.riskLevel === 'High' ? '#fef2f2' : summary.riskLevel === 'Medium' ? '#fffbeb' : '#ecfdf5',
                color: summary.riskLevel === 'High' ? '#b91c1c' : summary.riskLevel === 'Medium' ? '#b45309' : '#047857',
                border: `1px solid ${summary.riskLevel === 'High' ? '#fca5a5' : summary.riskLevel === 'Medium' ? '#fde68a' : '#a7f3d0'}`
              }}
            >
              {summary.riskLevel || 'Low'} Risk
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>
            Weighted index over production, validation &amp; completeness
          </p>
        </div>

        {/* KPI 2: Actionable Recommendations */}
        <div className="card" style={{ padding: '1.25rem', background: '#ffffff', borderTop: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Actionable Recommendations
            </span>
            <Lightbulb size={20} color="#0284c7" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              {summary.totalRecommendations || 0}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
              ({summary.highPriorityRecommendations || 0} High/Critical)
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>
            Prioritized operational interventions for leadership
          </p>
        </div>

        {/* KPI 3: Operational Alerts */}
        <div className="card" style={{ padding: '1.25rem', background: '#ffffff', borderTop: '4px solid #ea580c' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Operational Alerts
            </span>
            <AlertTriangle size={20} color="#ea580c" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              {summary.totalAlerts || 0}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>
              ({summary.criticalAlertsCount || 0} Critical)
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>
            Discrepancies, missing metadata &amp; output variances
          </p>
        </div>

        {/* KPI 4: Executive Insights */}
        <div className="card" style={{ padding: '1.25rem', background: '#ffffff', borderTop: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Executive Insights
            </span>
            <Sparkles size={20} color="#16a34a" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              {summary.insightsCount || 0}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
              Factual Findings
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>
            Zero-hallucination key statistics &amp; macro indicators
          </p>
        </div>
      </section>

      {/* Navigation Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          { key: 'recommendations', label: `Recommendations (${recommendations.length})`, icon: Lightbulb },
          { key: 'risk', label: 'Operational Risk Breakdown', icon: Gauge },
          { key: 'insights', label: `Executive Insights (${insights.length})`, icon: Sparkles },
          { key: 'alerts', label: `Alerts (${alerts.length})`, icon: AlertTriangle },
          { key: 'trends', label: 'Historical Trajectories', icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '0.88rem',
                fontWeight: isActive ? 700 : 600,
                color: isActive ? '#1e3a8a' : '#64748b',
                background: isActive ? '#eff6ff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #1e3a8a' : '3px solid transparent',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} color={isActive ? '#1e3a8a' : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#1e3a8a' }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
            Analyzing single source of truth analytics, statutory validation, and colliery records...
          </p>
        </div>
      )}

      {!loading && (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: AI RECOMMENDATIONS GRID */}
          {/* ========================================================================= */}
          {activeTab === 'recommendations' && (
            <div>
              {/* Filter Controls Bar */}
              <div
                className="card"
                style={{
                  padding: '1rem 1.25rem',
                  marginBottom: '20px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                  <Filter size={15} />
                  <span>Filter By:</span>
                </div>

                {/* Priority Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Priority:</span>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                  >
                    <option value="All">All Priorities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Category:</span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                  >
                    <option value="All">All Categories</option>
                    <option value="Production">Production</option>
                    <option value="Validation">Validation</option>
                    <option value="Data Quality">Data Quality</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Operational">Operational</option>
                  </select>
                </div>

                {/* Subsidiary Filter */}
                {allSubsidiaries.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Subsidiary:</span>
                    <select
                      value={filterSubsidiary}
                      onChange={(e) => setFilterSubsidiary(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                    >
                      <option value="All">All Subsidiaries</option>
                      {allSubsidiaries.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Showing {filteredRecs.length} of {recommendations.length} recommendations
                </span>
              </div>

              {/* Recommendations Cards Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredRecs.length === 0 ? (
                  <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                      No recommendations match the selected filters.
                    </p>
                  </div>
                ) : (
                  filteredRecs.map((rec) => {
                    const badge = getPriorityBadge(rec.priority);
                    return (
                      <div
                        key={rec.id}
                        className="card"
                        style={{
                          padding: '1.5rem',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderLeft: `5px solid ${badge.text}`,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Top Metadata Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                background: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}
                            >
                              {badge.label}
                            </span>

                            <span
                              style={{
                                padding: '3px 8px',
                                background: '#f1f5f9',
                                color: '#334155',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 600
                              }}
                            >
                              {rec.category}
                            </span>

                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                              #{rec.id}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                background: '#ecfdf5',
                                color: '#065f46',
                                borderRadius: '10px',
                                fontWeight: 600
                              }}
                            >
                              {Math.round((rec.confidence || 0.95) * 100)}% Model Confidence
                            </span>
                          </div>
                        </div>

                        {/* Recommendation Title & Description */}
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                          {rec.title}
                        </h3>
                        <p style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                          {rec.description}
                        </p>

                        {/* Underlying Reason / Trigger Basis */}
                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            marginBottom: '12px',
                            fontSize: '0.8rem',
                            color: '#334155'
                          }}
                        >
                          <strong style={{ color: '#1e3a8a' }}>Diagnostic Reason: </strong>
                          {rec.reason}
                        </div>

                        {/* Supporting Metrics Callout Strip */}
                        {rec.supportingMetrics && Object.keys(rec.supportingMetrics).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                            {Object.entries(rec.supportingMetrics).map(([k, v]) => (
                              <span
                                key={k}
                                style={{
                                  fontSize: '0.76rem',
                                  padding: '3px 8px',
                                  background: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  color: '#334155'
                                }}
                              >
                                <span style={{ color: '#64748b' }}>{k.replace(/([A-Z])/g, ' $1')}: </span>
                                <strong>{typeof v === 'number' ? (v > 1000 ? formatNumber(v) : v) : String(v)}</strong>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Recommended Statutory Action Box */}
                        <div
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            marginBottom: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                            <CheckCircle2 size={15} color="#2563eb" />
                            <span>Recommended Action for CMPDI / Ministry Officials:</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                            {rec.recommendedAction}
                          </p>
                        </div>

                        {/* Affected Entities / Subsidiaries footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#64748b' }}>
                            <span>Affected Scope:</span>
                            {rec.affectedSubsidiaries?.length > 0 ? (
                              rec.affectedSubsidiaries.map((s) => (
                                <span key={s} style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, color: '#334155' }}>
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span>National / Platform-wide</span>
                            )}
                          </div>

                          {rec.affectedDocuments?.length > 0 && (
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              {rec.affectedDocuments.length} document(s) referenced
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: OPERATIONAL RISK DASHBOARD */}
          {/* ========================================================================= */}
          {activeTab === 'risk' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {/* Risk Score Card */}
              <div className="card" style={{ padding: '1.75rem', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Gauge size={22} color={getRiskColor(risk.overallRisk || 0)} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Operational Risk Index
                  </h3>
                </div>

                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div
                    style={{
                      width: '130px',
                      height: '130px',
                      borderRadius: '50%',
                      margin: '0 auto 16px',
                      border: `8px solid ${getRiskColor(risk.overallRisk || 0)}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#fafafa'
                    }}
                  >
                    <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a' }}>
                      {risk.overallRisk}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      out of 100
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      padding: '4px 14px',
                      borderRadius: '16px',
                      background: risk.riskLevel === 'High' ? '#fef2f2' : risk.riskLevel === 'Medium' ? '#fffbeb' : '#ecfdf5',
                      color: risk.riskLevel === 'High' ? '#b91c1c' : risk.riskLevel === 'Medium' ? '#b45309' : '#047857',
                      border: `1px solid ${risk.riskLevel === 'High' ? '#fca5a5' : risk.riskLevel === 'Medium' ? '#fde68a' : '#a7f3d0'}`
                    }}
                  >
                    {risk.riskLevel || 'Low'} Operational Risk
                  </span>

                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '12px', lineHeight: 1.4 }}>
                    Evaluated deterministically across production target achievement, statutory validation accuracy, data completeness, and OCR reliability.
                  </p>
                </div>
              </div>

              {/* Risk Breakdown Bars Card */}
              <div className="card" style={{ padding: '1.75rem', background: '#ffffff' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
                  Factor-by-Factor Risk Breakdown
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { label: 'Production Deficit & Concentration', key: 'productionRisk', weight: '30%' },
                    { label: 'Statutory Validation Inaccuracies', key: 'validationRisk', weight: '25%' },
                    { label: 'Data Quality & Field Clarity', key: 'qualityRisk', weight: '20%' },
                    { label: 'Mandatory Field Omissions', key: 'completenessRisk', weight: '15%' },
                    { label: 'Pipeline / Ingestion Failures', key: 'processingRisk', weight: '10%' }
                  ].map((item) => {
                    const valScore = risk.riskBreakdown?.[item.key] || 0;
                    return (
                      <div key={item.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '0.82rem' }}>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{item.label}</span>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Weight: {item.weight} &bull; <strong>{valScore}/100</strong></span>
                        </div>
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, valScore))}%`,
                              height: '100%',
                              background: getRiskColor(valScore),
                              transition: 'width 0.4s ease'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contributing Factors Card (Full Width) */}
              <div className="card" style={{ gridColumn: '1 / -1', padding: '1.5rem', background: '#ffffff' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
                  Specific Contributing Risk Drivers
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {risk.riskFactors?.map((rf, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem', marginBottom: '2px' }}>
                          {rf.factor}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                          {rf.description}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: rf.impact === 'High' ? '#fef2f2' : rf.impact === 'Medium' ? '#fff7ed' : '#ecfdf5',
                          color: rf.impact === 'High' ? '#991b1b' : rf.impact === 'Medium' ? '#9a3412' : '#065f46',
                          border: `1px solid ${rf.impact === 'High' ? '#fecaca' : rf.impact === 'Medium' ? '#fed7aa' : '#a7f3d0'}`
                        }}
                      >
                        {rf.impact} Impact
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: EXECUTIVE INSIGHTS TIMELINE */}
          {/* ========================================================================= */}
          {activeTab === 'insights' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {insights.map((ins) => (
                <div
                  key={ins.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                        {ins.category}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: ins.impact === 'Action Required' ? '#fef2f2' : ins.impact === 'Warning' ? '#fff7ed' : '#ecfdf5',
                          color: ins.impact === 'Action Required' ? '#991b1b' : ins.impact === 'Warning' ? '#9a3412' : '#065f46'
                        }}
                      >
                        {ins.impact}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                      {ins.title}
                    </h4>
                    <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                      {ins.statement}
                    </p>
                  </div>

                  <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a' }}>
                      {ins.metric}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      Source: {ins.source?.split('(')[0]?.trim()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: OPERATIONAL ALERTS */}
          {/* ========================================================================= */}
          {activeTab === 'alerts' && (
            <div>
              {/* Severity Filter */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Filter Severity:</span>
                {['All', 'Red', 'Orange', 'Yellow'].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setFilterSeverity(sev)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.78rem',
                      fontWeight: filterSeverity === sev ? 700 : 500,
                      borderRadius: '16px',
                      border: '1px solid #cbd5e1',
                      background: filterSeverity === sev ? '#1e3a8a' : '#ffffff',
                      color: filterSeverity === sev ? '#ffffff' : '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    {sev === 'All' ? 'All Alerts' : `${sev} Tier`}
                  </button>
                ))}
              </div>

              {/* Alerts List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredAlerts.length === 0 ? (
                  <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <CheckCircle2 size={24} color="#16a34a" style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No operational alerts in this severity category.</p>
                  </div>
                ) : (
                  filteredAlerts.map((alt) => {
                    const badge = getAlertBadge(alt.severity);
                    return (
                      <div
                        key={alt.id}
                        className="card"
                        style={{
                          padding: '1.25rem 1.5rem',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderLeft: `5px solid ${badge.text}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}
                          >
                            {badge.label}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{alt.id}</span>
                        </div>

                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                          {alt.title}
                        </h4>
                        <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.45, margin: '0 0 10px 0' }}>
                          {alt.description}
                        </p>

                        <div
                          style={{
                            background: '#f8fafc',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.8rem',
                            color: '#1e3a8a'
                          }}
                        >
                          <strong>Remediation: </strong>
                          {alt.recommendation}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: HISTORICAL TRAJECTORIES */}
          {/* ========================================================================= */}
          {activeTab === 'trends' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {[
                { title: 'Production Trajectory', data: trends.productionTrend },
                { title: 'Validation Accuracy Trajectory', data: trends.validationTrend },
                { title: 'Document Ingestion Trajectory', data: trends.documentIngestionTrend },
                { title: 'Statutory Reporting Cadence', data: trends.reportGenerationTrend }
              ].map((item, idx) => {
                const tBadge = getTrendBadge(item.data?.trend || 'Stable');
                const Icon = tBadge.icon;
                return (
                  <div key={idx} className="card" style={{ padding: '1.5rem', background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {item.title}
                      </h4>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: tBadge.bg,
                          color: tBadge.color,
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        <Icon size={14} />
                        <span>{tBadge.text}</span>
                      </span>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                      {item.data?.reason}
                    </p>

                    {item.data?.supportingMetrics && (
                      <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '0.76rem', color: '#334155' }}>
                        {Object.entries(item.data.supportingMetrics).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ color: '#64748b' }}>{k.replace(/([A-Z])/g, ' $1')}:</span>
                            <strong>{typeof v === 'number' ? (v > 1000 ? formatNumber(v) : v) : String(v)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
