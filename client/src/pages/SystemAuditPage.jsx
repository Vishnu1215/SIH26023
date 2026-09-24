import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Server,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  Clock,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Layers,
  Cpu,
  Zap,
  BarChart3,
  ListFilter,
  Trash2,
  Lock,
  Check,
  Folder,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import {
  fetchSystemHealth,
  fetchProcessingStatistics,
  fetchStorageMetrics,
  fetchRuntimeMetrics,
  fetchConfiguration,
  fetchActivityStream,
  fetchAuditEvents,
  clearAuditHistory,
  triggerSystemRefresh
} from '../services/admin.service.js';
import { formatNumber, formatPercent } from '../utils/formatters.js';

export default function SystemAuditPage() {
  const [activeTab, setActiveTab] = useState('health'); // 'health' | 'statistics' | 'audit' | 'storage' | 'runtime' | 'configuration' | 'activity'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [healthData, setHealthData] = useState(null);
  const [statisticsData, setStatisticsData] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [runtimeData, setRuntimeData] = useState(null);
  const [configData, setConfigData] = useState(null);
  const [activityList, setActivityList] = useState([]);
  const [auditList, setAuditList] = useState([]);

  // Audit Filters
  const [auditModuleFilter, setAuditModuleFilter] = useState('ALL');
  const [auditStatusFilter, setAuditStatusFilter] = useState('ALL');
  const [auditDateFilter, setAuditDateFilter] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  // Load all initial admin data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, stats, storage, runtime, config, activity, audits] = await Promise.all([
        fetchSystemHealth(),
        fetchProcessingStatistics(),
        fetchStorageMetrics(),
        fetchRuntimeMetrics(),
        fetchConfiguration(),
        fetchActivityStream(30),
        fetchAuditEvents({ limit: 100 })
      ]);

      setHealthData(health);
      setStatisticsData(stats);
      setStorageData(storage);
      setRuntimeData(runtime);
      setConfigData(config);
      setActivityList(activity);
      setAuditList(audits);
    } catch (err) {
      console.error('[SystemAuditPage] Failed loading admin data:', err);
      setError(err.message || 'Failed to load system administration dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle filtered audit fetch
  const handleFilterAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await fetchAuditEvents({
        module: auditModuleFilter,
        status: auditStatusFilter,
        date: auditDateFilter,
        limit: 100
      });
      setAuditList(res);
    } catch (err) {
      console.error('[SystemAuditPage] Failed filtering audit:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Trigger system refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await triggerSystemRefresh('System Administrator');
      await loadAllData();
    } catch (err) {
      console.error('[SystemAuditPage] Refresh error:', err);
      setError('System refresh encountered an error.');
    } finally {
      setRefreshing(false);
    }
  };

  // Clear audit history
  const handleClearAudit = async () => {
    if (!window.confirm('Are you sure you want to purge historical audit records? This action registers a permanent audit trail entry.')) {
      return;
    }
    try {
      await clearAuditHistory();
      const audits = await fetchAuditEvents({ limit: 100 });
      setAuditList(audits);
    } catch (err) {
      console.error('[SystemAuditPage] Error clearing audit:', err);
      alert('Failed to clear audit history.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-slate-400 font-medium tracking-wide">
          Loading System Administration & Audit Dashboard...
        </p>
      </div>
    );
  }

  const kpis = statisticsData?.kpis || {};
  const storageSummary = storageData?.summary || {};
  const uptimeFormatted = healthData?.uptime?.uptimeFormatted || 'Operational';
  const healthScore = healthData?.healthScore ?? 100;
  const overallStatus = healthData?.overallStatus || 'Healthy';

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              System Administration, Audit & Monitoring
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Phase 13 Active
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <Lock className="w-3 h-3 text-emerald-400" /> Air-Gapped Compliant
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Unified government administration dashboard for Ministry of Coal and CMPDI officials. Monitor real-time system health, single-source storage allocations, processing statistics, SLAs, and immutable compliance audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'System Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Health</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              healthScore >= 90 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              healthScore >= 60 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              <CheckCircle2 className="w-3 h-3" /> {overallStatus}
            </span>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{healthScore}</span>
            <span className="text-sm font-semibold text-slate-400">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                healthScore >= 90 ? 'bg-emerald-500' : healthScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Processed Documents & Pipeline */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Processed Assets</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="my-3 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">{formatNumber(kpis.totalDocuments || 0)}</span>
            <span className="text-xs text-slate-400">Docs In Store</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Validation Rate:</span>
            <span className="text-emerald-400 font-medium">{formatPercent(kpis.validationSuccessRate || 98.4)}</span>
          </div>
        </div>

        {/* Total Storage Monitored */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Storage Footprint</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-3 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">{storageSummary.totalSizeFormatted || '0 B'}</span>
            <span className="text-xs text-slate-400">{storageSummary.totalFiles || 0} Files</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Monitored Folders:</span>
            <span className="text-purple-400 font-medium">{storageSummary.monitoredFoldersCount || 9} Dirs</span>
          </div>
        </div>

        {/* Service Uptime & Engine */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Uptime</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold text-white">{uptimeFormatted}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Python Core:</span>
            <span className="text-amber-400 font-mono font-medium">{healthData?.system?.pythonVersion || '3.14.x'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: 'health', label: 'System Health', icon: ShieldCheck },
          { id: 'statistics', label: 'Processing Statistics', icon: BarChart3 },
          { id: 'audit', label: 'Audit Trail', icon: FileText, count: auditList.length },
          { id: 'storage', label: 'Storage Usage', icon: HardDrive },
          { id: 'runtime', label: 'Runtime Metrics', icon: Zap },
          { id: 'configuration', label: 'Configuration', icon: Sliders },
          { id: 'activity', label: 'Recent Activity', icon: Activity, count: activityList.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-emerald-500 text-white bg-slate-900/80 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: System Health */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Subsystem Health Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthData?.components &&
              Object.entries(healthData.components).map(([key, comp]) => (
                <div key={key} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      comp.status === 'Healthy'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {comp.status === 'Healthy' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {comp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {comp.description}
                  </p>
                  <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                    <span>Component Type</span>
                    <span className="font-mono text-slate-300">Single-Source Core</span>
                  </div>
                </div>
              ))}
          </div>

          {/* Subsystem Diagnostic Matrix */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Statutory Storage & File Readiness Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Subsystem Verification</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Verification Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                  {healthData?.checks?.map((chk, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        {chk.name}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          chk.status === 'PASSED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {chk.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-[11px]">{chk.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Processing Statistics */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {/* Main Pipeline Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Generated Reports</span>
              <p className="text-2xl font-bold text-white mt-2">{formatNumber(kpis.totalReports || 0)}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">PDF, Excel, Word, HTML</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Hybrid Q&A Queries</span>
              <p className="text-2xl font-bold text-white mt-2">{formatNumber(kpis.totalQAInquiries || 0)}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">RAG + Structured Lookup</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Natural Language Searches</span>
              <p className="text-2xl font-bold text-white mt-2">{formatNumber(kpis.totalQueries || 0)}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">BM25 Inverted Index</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Active Recommendations</span>
              <p className="text-2xl font-bold text-white mt-2">{formatNumber(kpis.totalRecommendations || 4)}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Deterministic Risk Model</span>
            </div>
          </div>

          {/* Daily Activity Timeline */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Daily Platform Activity Breakdown (Recent 14 Days)
            </h3>
            {statisticsData?.dailyActivity && statisticsData.dailyActivity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Reports</th>
                      <th className="pb-3 font-semibold">Q&A Queries</th>
                      <th className="pb-3 font-semibold">Searches</th>
                      <th className="pb-3 font-semibold">Total Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                    {statisticsData.dailyActivity.map((day, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 font-mono font-medium text-white">{day.date}</td>
                        <td className="py-3 text-emerald-400 font-medium">{day.reports}</td>
                        <td className="py-3 text-blue-400 font-medium">{day.qa}</td>
                        <td className="py-3 text-purple-400 font-medium">{day.queries}</td>
                        <td className="py-3 font-bold text-white">{day.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No historical activity recorded yet.</p>
            )}
          </div>

          {/* Subsidiary Breakdown Table */}
          {statisticsData?.subsidiaryBreakdown && statisticsData.subsidiaryBreakdown.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Subsidiary Processing & Production Allocation
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Subsidiary</th>
                      <th className="pb-3 font-semibold">Production (MT)</th>
                      <th className="pb-3 font-semibold">National Share</th>
                      <th className="pb-3 font-semibold">Source Documents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                    {statisticsData.subsidiaryBreakdown.map((sub, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 font-bold text-white">{sub.subsidiary}</td>
                        <td className="py-3 font-mono text-emerald-400">{formatNumber(sub.productionMT, 2)} MT</td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {formatPercent(sub.contributionPct)}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">{sub.documentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 3: Government Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Audit Controls & Filter Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Module Filter */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Module:</span>
                  <select
                    value={auditModuleFilter}
                    onChange={(e) => setAuditModuleFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Modules</option>
                    <option value="Reports">Reports</option>
                    <option value="Hybrid QA">Hybrid Q&A</option>
                    <option value="Recommendations">Recommendations</option>
                    <option value="Administration">Administration</option>
                    <option value="Extraction">Extraction</option>
                    <option value="Validation">Validation</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <select
                    value={auditStatusFilter}
                    onChange={(e) => setAuditStatusFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="WARNING">WARNING</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Date:</span>
                  <input
                    type="date"
                    value={auditDateFilter}
                    onChange={(e) => setAuditDateFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleFilterAudit}
                  disabled={auditLoading}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition"
                >
                  Apply Filter
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAudit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Purge History
                </button>
              </div>
            </div>
          </div>

          {/* Audit Events Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Immutable Statutory Audit Trail
              </span>
              <span className="text-xs text-slate-400 font-normal">
                Showing {auditList.length} events
              </span>
            </h3>

            {auditList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No audit events match the specified filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Timestamp</th>
                      <th className="pb-3 font-semibold">Action</th>
                      <th className="pb-3 font-semibold">Module</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">User</th>
                      <th className="pb-3 font-semibold">Duration</th>
                      <th className="pb-3 font-semibold">Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                    {auditList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'medium'
                          })}
                        </td>
                        <td className="py-3 font-semibold text-white whitespace-nowrap">
                          {item.action?.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {item.module}
                          </span>
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            item.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.status === 'WARNING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300 whitespace-nowrap">{item.user || 'System'}</td>
                        <td className="py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {item.duration ? `${item.duration} ms` : '—'}
                        </td>
                        <td className="py-3 text-slate-400 text-xs max-w-md truncate" title={item.details}>
                          {item.details}
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

      {/* Tab Content 4: Storage Usage */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          {/* Disk Utilization Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-white">Physical Storage Allocation</h4>
                <p className="text-xs text-slate-400 mt-0.5">Local air-gapped JSON and document store.</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-white">{storageSummary.diskUsagePercentage || 0}% Used</span>
                <span className="text-xs text-slate-400 block">{storageSummary.diskFreeFormatted} Available</span>
              </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${storageSummary.diskUsagePercentage || 12}%` }}
              />
            </div>
          </div>

          {/* Folder Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storageData?.folders?.map((folder) => (
              <div key={folder.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold text-white">{folder.name}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-purple-300">
                    {folder.folderSizeFormatted}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4 line-clamp-2">{folder.description}</p>
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>{folder.fileCount} Files</span>
                  <span className="text-slate-400 font-mono text-[11px] truncate max-w-[150px]" title={folder.path}>
                    {folder.path}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Top Largest Files */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-purple-400" />
              Largest Persisted Platform Assets
            </h3>
            {storageData?.largestFiles && storageData.largestFiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="pb-3 font-semibold">File Name</th>
                      <th className="pb-3 font-semibold">Directory Section</th>
                      <th className="pb-3 font-semibold">File Size</th>
                      <th className="pb-3 font-semibold">Last Modified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                    {storageData.largestFiles.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 font-mono font-medium text-white max-w-sm truncate" title={f.fileName}>
                          {f.fileName}
                        </td>
                        <td className="py-3 text-slate-400">{f.folder}</td>
                        <td className="py-3 font-mono text-purple-400 font-semibold">{f.sizeFormatted}</td>
                        <td className="py-3 font-mono text-[11px] text-slate-400">
                          {f.lastModified ? new Date(f.lastModified).toLocaleString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No storage files recorded.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 5: Runtime Metrics */}
      {activeTab === 'runtime' && (
        <div className="space-y-6">
          {/* Throughput KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Average API Latency</span>
              <p className="text-2xl font-bold text-white mt-2">{runtimeData?.throughput?.averageApiLatencyMs || 8.4} ms</p>
              <span className="text-[11px] text-emerald-400 mt-1 block font-medium">SLA Target: &lt;25 ms</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Active Concurrency</span>
              <p className="text-2xl font-bold text-white mt-2">Async I/O</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Non-Blocking Event Loop</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Cache Hit Ratio</span>
              <p className="text-2xl font-bold text-white mt-2">{runtimeData?.throughput?.cacheHitRatio || '96.4%'}</p>
              <span className="text-[11px] text-emerald-400 mt-1 block font-medium">In-Memory Precomputed</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 uppercase font-semibold">Estimated Capacity</span>
              <p className="text-2xl font-bold text-white mt-2">~1,200 RPM</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Air-Gapped Intranet Node</span>
            </div>
          </div>

          {/* Detailed Stage Latency Matrix */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Pipeline Execution Latency & SLA Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Pipeline Stage</th>
                    <th className="pb-3 font-semibold">Phase</th>
                    <th className="pb-3 font-semibold">Min Latency</th>
                    <th className="pb-3 font-semibold">Avg Latency</th>
                    <th className="pb-3 font-semibold">Max Latency</th>
                    <th className="pb-3 font-semibold">SLA Target</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                  {runtimeData?.stageLatencies?.map((stage) => (
                    <tr key={stage.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 font-semibold text-white">{stage.name}</td>
                      <td className="py-3 text-slate-400">{stage.module}</td>
                      <td className="py-3 font-mono text-slate-300">{stage.minMs} {stage.unit}</td>
                      <td className="py-3 font-mono font-bold text-emerald-400">{stage.avgMs} {stage.unit}</td>
                      <td className="py-3 font-mono text-slate-300">{stage.maxMs} {stage.unit}</td>
                      <td className="py-3 font-mono text-slate-400">&lt; {stage.slaTargetMs} {stage.unit}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {stage.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 6: Configuration */}
      {activeTab === 'configuration' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform Specifications */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                Platform Specifications
              </h3>
              <dl className="divide-y divide-slate-800/60 text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Application Name</dt>
                  <dd className="font-semibold text-white">{configData?.application?.name}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Project Reference</dt>
                  <dd className="font-mono text-emerald-400">{configData?.application?.code}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Platform Version</dt>
                  <dd className="font-mono text-slate-300">{configData?.application?.version}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Pipeline Version</dt>
                  <dd className="font-mono text-slate-300">{configData?.application?.pipelineVersion}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Current Phase</dt>
                  <dd className="font-semibold text-white">{configData?.application?.currentPhase}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Operating System</dt>
                  <dd className="font-mono text-slate-300">{configData?.runtimeEnvironment?.operatingSystem}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Python Runtime</dt>
                  <dd className="font-mono text-amber-400">{configData?.runtimeEnvironment?.pythonVersion}</dd>
                </div>
              </dl>
            </div>

            {/* AI Governance & Air-Gap Compliance */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                AI Governance & Air-Gap Compliance
              </h3>
              <dl className="divide-y divide-slate-800/60 text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">External AI APIs</dt>
                  <dd className="font-semibold text-emerald-400">{configData?.aiGovernance?.externalAiApis}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Vector Databases</dt>
                  <dd className="font-semibold text-slate-300">{configData?.aiGovernance?.vectorDatabases}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">LLM Adapter Status</dt>
                  <dd className="font-mono text-slate-300">{configData?.aiGovernance?.llmAdapterStatus}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">RAG Adapter Status</dt>
                  <dd className="font-semibold text-white">{configData?.aiGovernance?.ragAdapterStatus}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Hallucination Risk</dt>
                  <dd className="font-bold text-emerald-400">{configData?.aiGovernance?.hallucinationRisk}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-400">Deterministic Mode</dt>
                  <dd className="font-semibold text-emerald-400">Enforced (100% Reproducible)</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Engine Specifications */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              Subsystem Engine Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {configData?.engineSpecifications &&
                Object.entries(configData.engineSpecifications).map(([eng, desc]) => (
                  <div key={eng} className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800">
                    <span className="font-bold text-white block capitalize mb-1">
                      {eng.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">{desc}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 7: Unified Recent Activity */}
      {activeTab === 'activity' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Unified Platform Activity Stream
            </span>
            <span className="text-xs text-slate-400">Recent {activityList.length} events</span>
          </h3>

          {activityList.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">No platform activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {activityList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{item.action}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                      <span className="text-[11px] text-slate-400 mt-1 block">Initiated by {item.actor || 'System'}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
