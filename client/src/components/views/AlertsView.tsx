import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  CheckCircle2, 
  Plus, 
  Sliders, 
  ShieldAlert, 
  Bell, 
  Clock, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  Check, 
  Server,
  Activity,
  History
} from 'lucide-react';
import { useServerState } from '../../context/ServerContext';
import { AlertModal } from '../AlertModal';
import { AlertRule, AlertSeverity, Incident } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { EmptyState } from '../SkeletonLoader';

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-cpu-85',
    name: 'Critical CPU Saturation Guard',
    metricName: 'cpu',
    operator: '>=',
    threshold: 85,
    severity: 'critical',
    isActive: true,
    duration: '3m window',
    nodeId: null,
    nodeName: 'All Fleet Nodes (Global)',
    createdAt: Date.now() - 7 * 86400 * 1000,
  },
  {
    id: 'rule-ram-90',
    name: 'Memory Exhaustion Warning',
    metricName: 'ram',
    operator: '>=',
    threshold: 90,
    severity: 'warning',
    isActive: true,
    duration: '5m window',
    nodeId: null,
    nodeName: 'All Fleet Nodes (Global)',
    createdAt: Date.now() - 5 * 86400 * 1000,
  },
  {
    id: 'rule-net-800',
    name: 'High Network Ingress Spike',
    metricName: 'network',
    operator: '>=',
    threshold: 800,
    severity: 'warning',
    isActive: true,
    duration: '1m window',
    nodeId: null,
    nodeName: 'All Fleet Nodes (Global)',
    createdAt: Date.now() - 3 * 86400 * 1000,
  },
  {
    id: 'rule-container-70',
    name: 'Container Pod Degradation Threshold',
    metricName: 'container_health',
    operator: '<=',
    threshold: 70,
    severity: 'critical',
    isActive: true,
    duration: '2m window',
    nodeId: null,
    nodeName: 'All Fleet Nodes (Global)',
    createdAt: Date.now() - 2 * 86400 * 1000,
  },
  {
    id: 'rule-latency-100',
    name: 'SLA RTT Latency Breach',
    metricName: 'latency',
    operator: '>=',
    threshold: 100,
    severity: 'info',
    isActive: false,
    duration: '5m window',
    nodeId: null,
    nodeName: 'All Fleet Nodes (Global)',
    createdAt: Date.now() - 1 * 86400 * 1000,
  },
];

export const AlertsView: React.FC = () => {
  const { 
    alerts, 
    acknowledgeAlert, 
    resolveAlert, 
    nodes, 
    setSelectedNodeId, 
    setActiveTab 
  } = useServerState();

  const [rules, setRules] = useState<AlertRule[]>(DEFAULT_ALERT_RULES);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Alert history filter state
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [historySeverityFilter, setHistorySeverityFilter] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Rules handlers
  const handleToggleRule = (ruleId?: string) => {
    if (!ruleId) return;
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, isActive: !r.isActive } : r));
  };

  const handleDeleteRule = (ruleId?: string) => {
    if (!ruleId) return;
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleSaveRule = (savedRule: AlertRule) => {
    if (savedRule.id) {
      setRules(prev => {
        const exists = prev.some(r => r.id === savedRule.id);
        if (exists) {
          return prev.map(r => r.id === savedRule.id ? savedRule : r);
        }
        return [savedRule, ...prev];
      });
    } else {
      const newRule: AlertRule = {
        ...savedRule,
        id: `rule-${Date.now()}`,
        createdAt: Date.now()
      };
      setRules(prev => [newRule, ...prev]);
    }
    setEditingRule(null);
    setIsModalOpen(false);
  };

  const handleOpenEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  // Filtered Alert History records
  const filteredHistory = useMemo(() => {
    return alerts.filter(alert => {
      const matchesStatus = historyStatusFilter === 'all' 
        ? true 
        : historyStatusFilter === 'active' 
          ? !alert.resolved 
          : alert.resolved;
      
      const matchesSeverity = historySeverityFilter === 'all' || alert.severity === historySeverityFilter;

      const matchesSearch = historySearch === '' ||
        alert.title.toLowerCase().includes(historySearch.toLowerCase()) ||
        alert.description.toLowerCase().includes(historySearch.toLowerCase()) ||
        alert.nodeName.toLowerCase().includes(historySearch.toLowerCase());

      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [alerts, historyStatusFilter, historySeverityFilter, historySearch]);

  const activeRulesCount = rules.filter(r => r.isActive).length;

  return (
    <div className="space-y-6">
      {/* View Header with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#0b1222]/90 border border-slate-800/90 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              Alert Rules & Anomaly Engine
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-mono text-slate-400">
              {activeRulesCount} active rules running
            </span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Alert Rule Management & Trigger Log
          </h1>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Alert Rule</span>
        </button>
      </div>

      {/* SECTION 1: Active Alert Rules Management Table */}
      <div className="rounded-2xl border border-slate-800/90 bg-[#0b1222]/90 shadow-xl overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Active Alert Rules</h2>
              <p className="text-xs text-slate-400">
                Evaluation thresholds continuously monitored against streaming telemetry
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {rules.length} Total Rules
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e162a] border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Rule Name</th>
                <th className="py-3 px-4 font-semibold">Metric</th>
                <th className="py-3 px-4 font-semibold">Condition</th>
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold">Target Node</th>
                <th className="py-3 px-4 font-semibold">Window</th>
                <th className="py-3 px-4 font-semibold">Active Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {rules.map((rule) => {
                const isCrit = rule.severity === 'critical';
                const isWarn = rule.severity === 'warning';

                return (
                  <tr 
                    key={rule.id}
                    className="hover:bg-[#111a30] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-sans font-bold text-white">
                      {rule.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-semibold uppercase text-[10px]">
                        {rule.metricName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      {rule.operator} {rule.threshold}
                      {rule.metricName === 'cpu' || rule.metricName === 'ram' ? '%' : rule.metricName === 'network' ? ' Mbps' : ''}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        isCrit 
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                          : isWarn 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                          : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                      }`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans text-xs">
                      {rule.nodeName || 'All Nodes (Global)'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {rule.duration || '1m window'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          rule.isActive 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${rule.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span>{rule.isActive ? 'ENABLED' : 'DISABLED'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rule)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit Rule"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Alert History & Triggered Conditions Log */}
      <div className="rounded-2xl border border-slate-800/90 bg-[#0b1222]/90 shadow-xl overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Alert Trigger History & Conditions Log</h2>
              <p className="text-xs text-slate-400">
                Audited timeline of metric threshold violations and triage states
              </p>
            </div>
          </div>

          {/* Filters for history */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter triggers..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full bg-[#11192b] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={historySeverityFilter}
              onChange={e => setHistorySeverityFilter(e.target.value)}
              className="bg-[#11192b] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/60 cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            {/* Status Tabs */}
            <div className="flex bg-[#11192b] border border-slate-800 rounded-xl p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setHistoryStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  historyStatusFilter === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setHistoryStatusFilter('active')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  historyStatusFilter === 'active' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Open ({alerts.filter(a => !a.resolved).length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryStatusFilter('resolved')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  historyStatusFilter === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>
        </div>

        {/* History Table */}
        {filteredHistory.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No Triggered Conditions Recorded"
            description="No alert conditions matched your current filters. System health is within normal baseline thresholds."
            actionText="Reset Filters"
            onAction={() => {
              setHistoryStatusFilter('all');
              setHistorySeverityFilter('all');
              setHistorySearch('');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e162a] border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Severity</th>
                  <th className="py-3 px-4 font-semibold">Triggered Condition</th>
                  <th className="py-3 px-4 font-semibold">Target Node</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Triage Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredHistory.map((item) => {
                  const isCrit = item.severity === 'critical';
                  const isWarn = item.severity === 'warning';

                  return (
                    <tr key={item.id} className="hover:bg-[#111a30] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {item.timestamp}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          isCrit 
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                            : isWarn 
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                            : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                        }`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">{item.title}</div>
                        <div className="text-[11px] text-slate-300 mt-0.5 max-w-md">{item.description}</div>
                        {item.currentValue && item.threshold && (
                          <div className="mt-1 font-mono text-[10px] text-cyan-400">
                            Current Value: {item.currentValue} | Threshold: {item.threshold}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {item.nodeName || item.nodeId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          item.resolved 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : item.acknowledged
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse'
                        }`}>
                          {item.resolved ? 'RESOLVED' : item.acknowledged ? 'INVESTIGATING' : 'OPEN'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!item.acknowledged && !item.resolved && (
                            <button
                              type="button"
                              onClick={() => acknowledgeAlert(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                            >
                              Ack
                            </button>
                          )}
                          {!item.resolved && (
                            <button
                              type="button"
                              onClick={() => resolveAlert(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Resolve
                            </button>
                          )}
                          {item.resolved && (
                            <span className="text-[11px] text-slate-500 font-mono flex items-center justify-end gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              Closed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alert Rule Create / Edit Modal */}
      <AlertModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRule(null);
        }}
        onSave={handleSaveRule}
        initialRule={editingRule}
        nodes={nodes.map(n => ({ id: n.id, name: n.name, region: n.region }))}
      />
    </div>
  );
};

export default AlertsView;
