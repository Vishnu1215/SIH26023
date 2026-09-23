import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Target,
  Gauge,
  Clock,
  RotateCcw,
  Building2,
  MapPin,
  Calendar,
  Layers,
  Award,
  TrendingUp,
  BarChart3,
  Copy,
  Sliders,
  Check,
  Sparkles,
  HelpCircle,
  FileCheck2,
  ArrowUpRight,
  ArrowDownRight,
  UploadCloud
} from 'lucide-react';
import StatCard from '../components/common/StatCard.jsx';
import { fetchDashboardAnalytics } from '../services/document.service.js';
import {
  formatNumber,
  formatProduction,
  formatPercent,
  formatTime,
  formatCount
} from '../utils/formatters.js';
import {
  ProductionTrendChart,
  HorizontalBarChart,
  ValidationStatusDonut
} from '../components/common/Charts.jsx';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await fetchDashboardAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
      setError(err.message || 'Failed to connect to analytics engine.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Extract analytics objects with safe defaults
  const docs = analytics?.documents || {};
  const prod = analytics?.production || {};
  const val = analytics?.validation || {};
  const quality = analytics?.quality || {};
  const subsidiaries = analytics?.subsidiaries || [];
  const states = analytics?.states || [];
  const financialYears = analytics?.financialYears || [];
  const rankings = analytics?.rankings || {};
  const charts = analytics?.charts || {};

  const totalDocsCount = docs.totalDocuments ?? docs.documentsUploaded ?? 0;
  const isDatasetEmpty = !isLoading && totalDocsCount === 0;

  // Rating badge class helper
  const getRatingBadgeClass = (rating) => {
    const r = (rating || '').toLowerCase();
    if (r === 'excellent') return 'rating-badge rating-excellent';
    if (r === 'good') return 'rating-badge rating-good';
    if (r === 'average') return 'rating-badge rating-average';
    return 'rating-badge rating-poor';
  };

  // Section 1: Executive Overview
  const executiveOverviewStats = [
    {
      title: 'Total Documents',
      value: formatCount(totalDocsCount),
      subtitle: 'Ingested mining & geological files',
      icon: FileText,
      color: 'blue'
    },
    {
      title: 'Validated Documents',
      value: formatCount(val.validatedDocuments ?? val.totalValidated ?? 0),
      subtitle: 'Evaluated against compliance rules',
      icon: ShieldCheck,
      color: 'indigo'
    },
    {
      title: 'Validation Accuracy',
      value: formatPercent(val.validationAccuracy ?? 0),
      subtitle: 'Clean records / validated docs',
      icon: Target,
      color: (val.validationAccuracy || 0) >= 80 ? 'emerald' : (val.validationAccuracy || 0) >= 50 ? 'amber' : 'rose'
    },
    {
      title: 'Overall Data Quality Score',
      value: `${val.averageValidationScore != null ? val.averageValidationScore : 0} / 100`,
      subtitle: val.overallQualityRating ? `${val.overallQualityRating} System Rating` : 'Standard Compliance Score',
      icon: Gauge,
      badge: val.overallQualityRating || null,
      color: (val.averageValidationScore || 0) >= 80 ? 'emerald' : (val.averageValidationScore || 0) >= 50 ? 'amber' : 'rose'
    }
  ];

  // Section 2: Mining Operations
  const miningOperationsStats = [
    {
      title: 'Total Coal Production',
      value: formatProduction(prod.totalCoalProduction),
      subtitle: 'Consolidated achieved output',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      title: 'Target Production',
      value: formatProduction(prod.totalTargetProduction),
      subtitle: 'Prescribed operational targets',
      icon: Target,
      color: 'slate'
    },
    {
      title: 'Achievement %',
      value: formatPercent(prod.productionAchievement ?? 0),
      subtitle: 'Achieved vs target ratio',
      icon: BarChart3,
      color: (prod.productionAchievement || 0) >= 100 ? 'emerald' : (prod.productionAchievement || 0) >= 80 ? 'blue' : 'amber'
    },
    {
      title: 'Active Subsidiaries',
      value: formatCount(subsidiaries.filter(s => s.subsidiary !== 'Other / Unassigned').length || subsidiaries.length),
      subtitle: 'Reporting coal producing companies',
      icon: Building2,
      color: 'purple'
    }
  ];

  // Section 3: Platform Health
  const platformHealthStats = [
    {
      title: 'OCR Complete',
      value: formatCount(docs.ocrComplete),
      subtitle: 'Extracted digital layers',
      icon: CheckCircle2,
      color: 'emerald'
    },
    {
      title: 'Average OCR Time',
      value: formatTime(docs.averageOcrTime),
      subtitle: 'Text extraction latency',
      icon: Clock,
      color: 'blue'
    },
    {
      title: 'Duplicate Documents',
      value: formatCount(quality.duplicateRecords ?? quality.duplicateDocuments ?? docs.duplicateDocuments ?? 0),
      subtitle: 'SHA-256 duplicate alerts',
      icon: Copy,
      color: (quality.duplicateRecords || quality.duplicateDocuments) > 0 ? 'rose' : 'slate'
    },
    {
      title: 'States Covered',
      value: formatCount(states.filter(s => s.state !== 'Not Available').length || docs.statesCovered || 0),
      subtitle: 'Mining state jurisdictions',
      icon: MapPin,
      color: 'indigo'
    }
  ];

  // Production variance and remaining target calculations
  const achievedProd = prod.totalAchievedProduction ?? prod.totalCoalProduction ?? 0;
  const targetProd = prod.totalTargetProduction ?? 0;
  const targetVariance = prod.targetVariance ?? Math.round((achievedProd - targetProd) * 100) / 100;
  const remainingTarget = prod.remainingTarget ?? Math.max(0, Math.round((targetProd - achievedProd) * 100) / 100);
  const achievementPct = prod.productionAchievement ?? 0;

  const maxSubProd = Math.max(...subsidiaries.map(s => s.production || 0), 1);

  if (isLoading && !analytics) {
    return (
      <div className="analytics-loading-box">
        <RotateCcw size={28} className="animate-spin text-blue-600" />
        <span className="loading-label">Loading Executive Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* ========================================================= */}
      {/* Executive Header Banner */}
      {/* ========================================================= */}
      <div className="page-header executive-header-banner">
        <div>
          <h2 className="page-title">Executive Dashboard</h2>
          <p className="page-subtitle">
            Ministry of Coal | CMPDI Mining Analytics & Production Monitoring Platform
          </p>
        </div>

        <div className="page-actions-group executive-meta-strip">
          {analytics?.generatedAt && (
            <div className="header-meta-chip" title="Timestamp when analytics summary was compiled">
              <Clock size={13} />
              <span>Generated: {new Date(analytics.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          )}

          {analytics?.lastRefresh && (
            <div className="header-meta-chip" title="Last automated or manual synchronization">
              <span>Last Refresh: {new Date(analytics.lastRefresh).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          <div className="header-meta-chip">
            <span>Processed: <strong>{formatCount(analytics?.documentsProcessed || docs.structuredRecords || 0)}</strong> Records</span>
          </div>

          <div className="header-meta-chip badge-version">
            <span>v{analytics?.analyticsVersion || 1}.0 Deterministic</span>
          </div>

          <button
            className="btn-refresh-analytics"
            onClick={() => loadAnalytics(true)}
            disabled={isRefreshing || isLoading}
            title="Synchronize and recompute all executive analytics"
          >
            <RotateCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Synchronizing...' : 'Refresh Analytics'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="analytics-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => loadAnalytics(true)}>Retry</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* Empty State Banner (Requirement 10) */}
      {/* ========================================================= */}
      {isDatasetEmpty && (
        <div className="empty-dataset-banner">
          <div className="empty-banner-icon">
            <UploadCloud size={32} />
          </div>
          <div className="empty-banner-content">
            <h4>No Mining Documents Uploaded Yet</h4>
            <p>
              The executive dashboard currently has no document records to evaluate.
              Upload mining reports, annual production summaries, or load the official sample dataset to view real-time analytics.
            </p>
            <div className="empty-banner-actions">
              <Link to="/documents" className="btn-primary-action">
                Go to Document Ingestion
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. Executive KPI Reorganization (Requirement 1) */}
      {/* ========================================================= */}
      <div className="executive-kpi-container">
        {/* Row 1: Executive Overview */}
        <div className="stats-row-group">
          <div className="row-group-label">
            <ShieldCheck size={14} />
            <span>Executive Overview</span>
          </div>
          <div className="stats-grid-row">
            {executiveOverviewStats.map((stat, idx) => (
              <StatCard
                key={idx}
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                badge={stat.badge}
                color={stat.color}
              />
            ))}
          </div>
        </div>

        {/* Row 2: Mining Operations */}
        <div className="stats-row-group">
          <div className="row-group-label">
            <TrendingUp size={14} />
            <span>Mining Operations</span>
          </div>
          <div className="stats-grid-row">
            {miningOperationsStats.map((stat, idx) => (
              <StatCard
                key={idx}
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                badge={stat.badge}
                color={stat.color}
              />
            ))}
          </div>
        </div>

        {/* Row 3: Platform Health */}
        <div className="stats-row-group">
          <div className="row-group-label">
            <Layers size={14} />
            <span>Platform Health</span>
          </div>
          <div className="stats-grid-row">
            {platformHealthStats.map((stat, idx) => (
              <StatCard
                key={idx}
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                badge={stat.badge}
                color={stat.color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Production Performance Executive Summary (Requirement 6) */}
      {/* ========================================================= */}
      <section className="analytics-section-card">
        <div className="analytics-section-header">
          <div className="section-title-group">
            <TrendingUp size={20} className="text-blue-700" />
            <h3 className="section-title">Production Performance</h3>
          </div>
          <span className="section-badge">
            Operational Summary &bull; Million Tonnes (MT)
          </span>
        </div>

        {/* Executive Production Grid */}
        <div className="production-kpi-grid">
          <div className="prod-kpi-card">
            <span className="prod-kpi-label">Achieved Output</span>
            <span className="prod-kpi-value text-blue-700">
              {formatProduction(achievedProd)}
            </span>
            <span className="prod-kpi-sub">Total verified coal extraction</span>
          </div>

          <div className="prod-kpi-card">
            <span className="prod-kpi-label">Target Production</span>
            <span className="prod-kpi-value text-slate-700">
              {formatProduction(targetProd)}
            </span>
            <span className="prod-kpi-sub">Prescribed operational targets</span>
          </div>

          <div className="prod-kpi-card">
            <span className="prod-kpi-label">Target Variance</span>
            <span className={`prod-kpi-value ${targetVariance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {targetVariance >= 0 ? `+${formatProduction(targetVariance)}` : formatProduction(targetVariance)}
            </span>
            <span className="prod-kpi-sub">
              {targetVariance >= 0 ? 'Production surplus vs target' : 'Production deficit vs target'}
            </span>
          </div>

          <div className="prod-kpi-card">
            <span className="prod-kpi-label">Remaining Target</span>
            <span className={`prod-kpi-value ${remainingTarget === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {formatProduction(remainingTarget)}
            </span>
            <span className="prod-kpi-sub">
              {remainingTarget === 0 ? 'Annual target fully achieved' : 'Remaining volume to meet target'}
            </span>
          </div>
        </div>

        {/* Supporting Operational Secondary Indicators */}
        <div className="production-secondary-grid">
          <div className="sec-item">
            <span className="sec-label">Achievement Rate:</span>
            <span className={`sec-value ${achievementPct >= 100 ? 'text-emerald-700' : achievementPct >= 80 ? 'text-blue-700' : 'text-amber-700'}`}>
              {formatPercent(achievementPct)}
            </span>
          </div>
          <div className="sec-item">
            <span className="sec-label">Average Production:</span>
            <span className="sec-value text-slate-800">
              {formatProduction(prod.averageProduction)}
            </span>
          </div>
          <div className="sec-item">
            <span className="sec-label">Top Producing Record:</span>
            <span className="sec-value text-slate-800" title={prod.bestPerformingRecord?.name || 'N/A'}>
              {prod.bestPerformingRecord ? `${prod.bestPerformingRecord.name} (${formatProduction(prod.bestPerformingRecord.production)})` : 'N/A'}
            </span>
          </div>
          <div className="sec-item">
            <span className="sec-label">Minimum Output Record:</span>
            <span className="sec-value text-slate-800" title={prod.lowestPerformingRecord?.name || 'N/A'}>
              {prod.lowestPerformingRecord ? `${prod.lowestPerformingRecord.name} (${formatProduction(prod.lowestPerformingRecord.production)})` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Progress Bar & Equation Box */}
        <div className="production-equation-box">
          <div className="equation-header">
            <span className="equation-title">Target Fulfillment Progress:</span>
            <span className={`equation-status-pill ${achievementPct >= 100 ? 'status-green' : 'status-amber'}`}>
              {achievementPct >= 100 ? 'Target Met / Exceeded' : 'In Progress'}
            </span>
          </div>

          <div className="equation-math">
            <span className="math-term"><strong>{formatProduction(achievedProd)}</strong> Achieved</span>
            <span className="math-operator">/</span>
            <span className="math-term"><strong>{formatProduction(targetProd)}</strong> Target</span>
            <span className="math-operator">=</span>
            <span className="math-total">Achievement: <strong>{formatPercent(achievementPct)}</strong></span>
          </div>

          <div className="equation-progress-track">
            <div
              className="equation-progress-bar"
              style={{
                width: `${Math.min(100, Math.max(0, achievementPct))}%`,
                backgroundColor: achievementPct >= 100 ? '#16a34a' : achievementPct >= 80 ? '#0284c7' : '#d97706'
              }}
            />
          </div>
          <div className="equation-progress-labels">
            <span>0%</span>
            <span>50%</span>
            <span>100% Target Benchmark</span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. Visual Distributions: Multi-Year Trend & Validation Health */}
      {/* ========================================================= */}
      <div className="analytics-two-col-grid">
        {/* Multi-Year Production Trend */}
        <section className="analytics-section-card">
          <div className="analytics-section-header">
            <div className="section-title-group">
              <BarChart3 size={20} className="text-blue-700" />
              <h3 className="section-title">Production Trend by Financial Year</h3>
            </div>
            <span className="section-badge">Chronological Output</span>
          </div>
          <ProductionTrendChart data={charts.productionTrend || []} height={220} />
        </section>

        {/* Validation Summary & Unified Donut Widget (Requirement 5) */}
        <section className="analytics-section-card">
          <div className="analytics-section-header">
            <div className="section-title-group">
              <ShieldCheck size={20} className="text-emerald-700" />
              <h3 className="section-title">Validation Summary</h3>
            </div>
            <span className="section-badge">System Quality & Verification</span>
          </div>
          <ValidationStatusDonut
            data={charts.validationScoreDistribution || []}
            total={val.validatedDocuments || val.totalValidated || 0}
            accuracy={val.validationAccuracy || 0}
            score={val.averageValidationScore || 0}
            qualityRating={val.overallQualityRating || val.qualityRating || 'Good'}
          />
        </section>
      </div>

      {/* ========================================================= */}
      {/* 4. Visual Progress Bars for Subsidiaries and States (Requirement 3 & 8) */}
      {/* ========================================================= */}
      <div className="analytics-two-col-grid">
        {/* Subsidiary Leaderboard with Horizontal Bars */}
        <section className="analytics-section-card">
          <div className="analytics-section-header">
            <div className="section-title-group">
              <Building2 size={20} className="text-blue-700" />
              <h3 className="section-title">Subsidiary Performance</h3>
            </div>
            <span className="section-badge">Ranked by Production Output</span>
          </div>
          <HorizontalBarChart
            data={charts.subsidiaryDistribution || subsidiaries}
            unit="MT"
            maxItems={7}
          />
        </section>

        {/* State Distribution with Horizontal Bars */}
        <section className="analytics-section-card">
          <div className="analytics-section-header">
            <div className="section-title-group">
              <MapPin size={20} className="text-indigo-700" />
              <h3 className="section-title">State Distribution</h3>
            </div>
            <span className="section-badge">Mining Jurisdictions</span>
          </div>
          <HorizontalBarChart
            data={charts.stateDistribution || states}
            unit="MT"
            maxItems={7}
          />
        </section>
      </div>

      {/* ========================================================= */}
      {/* 5. Detailed Comparative Tables (Requirement 4 & 8) */}
      {/* ========================================================= */}
      <div className="analytics-two-col-grid">
        {/* Top Producing Coal Mines */}
        <section className="analytics-section-card">
          <div className="analytics-section-header">
            <div className="section-title-group">
              <Award size={20} className="text-amber-700" />
              <h3 className="section-title">Top Producing Coal Mines</h3>
            </div>
            <span className="section-badge">Individual Mine Output</span>
          </div>

          {rankings.topMines && rankings.topMines.length > 0 ? (
            <div className="table-responsive">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rank</th>
                    <th>Mine Name</th>
                    <th>Subsidiary</th>
                    <th>State</th>
                    <th style={{ textAlign: 'right' }}>Output</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.topMines.map((m, idx) => {
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                    return (
                      <tr key={idx}>
                        <td>
                          {medal ? (
                            <span className="medal-icon" title={`Rank #${idx + 1}`}>{medal}</span>
                          ) : (
                            <span className="rank-badge rank-default">#{idx + 1}</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{m.mineName || m.mine}</td>
                        <td>
                          <span className="subsidiary-pill">{m.subsidiary}</span>
                        </td>
                        <td style={{ color: '#64748b' }}>{m.state}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {formatProduction(m.production)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-analytics-box">No mine-specific output records available.</div>
          )}
        </section>

        {/* Financial Year Multi-Year Performance Table (Requirement 4) */}
        <section className="analytics-section-card">
          <div className="analytics-section-header">
            <div className="section-title-group">
              <Calendar size={20} className="text-blue-700" />
              <h3 className="section-title">Financial Year Performance</h3>
            </div>
            <span className="section-badge">Chronological Performance</span>
          </div>

          {financialYears.length > 0 ? (
            <div className="table-responsive">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Financial Year</th>
                    <th style={{ width: '85px', textAlign: 'center' }}>Documents</th>
                    <th style={{ textAlign: 'right' }}>Production</th>
                    <th style={{ textAlign: 'right' }}>Achievement</th>
                    <th style={{ textAlign: 'center' }}>Quality Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {financialYears.map((fy) => {
                    const rating = fy.qualityRating || (
                      (fy.averageValidationScore || 0) >= 90 ? 'Excellent' :
                      (fy.averageValidationScore || 0) >= 80 ? 'Good' :
                      (fy.averageValidationScore || 0) >= 50 ? 'Average' : 'Poor'
                    );
                    return (
                      <tr key={fy.financialYear}>
                        <td>
                          <span className="fy-tag">{fy.financialYear}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge-count badge-info">{fy.documents} docs</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {formatProduction(fy.production)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {fy.targetProduction > 0 ? (
                            <span className={fy.averageAchievement >= 100 ? 'text-emerald-700' : 'text-blue-700'}>
                              {formatPercent(fy.averageAchievement)}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={getRatingBadgeClass(rating)}>
                            {rating} ({fy.averageValidationScore || 0}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-analytics-box">No multi-year financial records available.</div>
          )}
        </section>
      </div>

      {/* ========================================================= */}
      {/* 6. Document Quality & Completeness (Requirement 7) */}
      {/* ========================================================= */}
      <section className="analytics-section-card" style={{ marginTop: '24px' }}>
        <div className="analytics-section-header">
          <div className="section-title-group">
            <Sliders size={20} className="text-indigo-700" />
            <h3 className="section-title">Document Quality & Completeness</h3>
          </div>
          <span className="section-badge">16 Standardized Compliance Fields</span>
        </div>

        <div className="quality-indicators-grid">
          {/* Field Completeness */}
          <div className="quality-item">
            <span className="quality-label">Field Completeness</span>
            <span className="quality-val text-blue-700">
              {formatPercent(quality.fieldCompletenessPercentage || quality.averageFieldCompleteness || 100 - (quality.missingFieldsPercentage || 0))}
            </span>
            <span className="quality-sub">Overall population of mandatory and optional fields</span>
          </div>

          {/* Average Fields Extracted */}
          <div className="quality-item">
            <span className="quality-label">Average Fields Extracted</span>
            <span className="quality-val text-slate-800">
              {quality.averageStructuredFields || 0} / {quality.totalStandardFields || 16}
            </span>
            <span className="quality-sub">Standard fields identified per document</span>
          </div>

          {/* Missing Mandatory Fields */}
          <div className="quality-item">
            <span className="quality-label">Missing Mandatory Fields</span>
            <span className={`quality-val ${(quality.missingMandatoryFields || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {formatCount(quality.missingMandatoryFields || 0)}
            </span>
            <span className="quality-sub">VAL001 mandatory field discrepancy flags</span>
          </div>

          {/* Duplicate Records */}
          <div className="quality-item">
            <span className="quality-label">Duplicate Records</span>
            <span className={`quality-val ${(quality.duplicateRecords || quality.duplicateDocuments || 0) > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
              {formatCount(quality.duplicateRecords || quality.duplicateDocuments || 0)}
            </span>
            <span className="quality-sub">VAL007 duplicate checksum occurrences</span>
          </div>

          {/* Unknown Units */}
          <div className="quality-item">
            <span className="quality-label">Unknown Units Flagged</span>
            <span className={`quality-val ${(quality.unknownUnits || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {formatCount(quality.unknownUnits || 0)}
            </span>
            <span className="quality-sub">VAL003 unit normalization flags</span>
          </div>

          {/* Low OCR Confidence */}
          <div className="quality-item">
            <span className="quality-label">Low OCR Confidence</span>
            <span className={`quality-val ${(quality.lowOcrConfidence || quality.lowOcrConfidenceCount || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {formatCount(quality.lowOcrConfidence || quality.lowOcrConfidenceCount || 0)}
            </span>
            <span className="quality-sub">VAL009 documents with OCR confidence &lt; 50%</span>
          </div>

          {/* Documents Requiring Review */}
          <div className="quality-item">
            <span className="quality-label">Requiring Manual Review</span>
            <span className={`quality-val ${(quality.documentsRequiringReview || quality.manualReviewRequired || val.errorDocuments || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {formatCount(quality.documentsRequiringReview || quality.manualReviewRequired || val.errorDocuments || 0)}
            </span>
            <span className="quality-sub">Documents with error findings or low scores</span>
          </div>
        </div>
      </section>
    </div>
  );
}
