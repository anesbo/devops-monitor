import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Search,
  RotateCcw,
  Clock,
  Server,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { Incident, IncidentSeverity, IncidentStatus } from '../types';

export interface IncidentTableProps {
  incidents?: Incident[];
  onAcknowledge?: (id: string) => void | Promise<void>;
  onResolve?: (id: string) => void | Promise<void>;
  onSelectNode?: (nodeId: string) => void;
  isLoading?: boolean;
  className?: string;
}

// Sample fallback data if none provided
const DEFAULT_INCIDENTS: Incident[] = [
  {
    id: 'inc-9021',
    nodeId: 'node-us-east-1',
    nodeName: 'us-east-prod-api-01',
    alertRuleId: 'rule-cpu-85',
    title: 'High CPU Sustained Over 92%',
    description: 'CPU load exceeded 90% threshold for >3 minutes across all 16 cores due to API burst.',
    severity: 'critical',
    status: 'open',
    timestamp: Date.now() - 4 * 60 * 1000,
    metricType: 'cpu',
    currentValue: '94.2%',
    threshold: '85.0%',
  },
  {
    id: 'inc-9020',
    nodeId: 'node-eu-west-1',
    nodeName: 'eu-west-db-replica-02',
    alertRuleId: 'rule-ram-90',
    title: 'Memory Exhaustion Warning',
    description: 'Postgres buffer cache allocation reached 91.4% of total 64GB RAM.',
    severity: 'warning',
    status: 'investigating',
    timestamp: Date.now() - 28 * 60 * 1000,
    metricType: 'ram',
    currentValue: '91.4%',
    threshold: '90.0%',
  },
  {
    id: 'inc-9019',
    nodeId: 'node-ap-south-1',
    nodeName: 'ap-south-cache-01',
    alertRuleId: 'rule-cont-health',
    title: 'Redis Worker Container Restart Loop',
    description: 'Healthcheck timeout triggered crash loop backoff on worker container #3.',
    severity: 'critical',
    status: 'investigating',
    timestamp: Date.now() - 65 * 60 * 1000,
    metricType: 'container_health',
    currentValue: '1 failed',
    threshold: '0 failed',
  },
  {
    id: 'inc-9018',
    nodeId: 'node-us-west-2',
    nodeName: 'us-west-worker-04',
    alertRuleId: 'rule-net-out',
    title: 'Egress Traffic Spike Detected',
    description: 'Outbound network throughput reached 850 MB/s approaching NIC saturation.',
    severity: 'warning',
    status: 'open',
    timestamp: Date.now() - 140 * 60 * 1000,
    metricType: 'network',
    currentValue: '850 MB/s',
    threshold: '750 MB/s',
  },
  {
    id: 'inc-9017',
    nodeId: 'node-us-east-2',
    nodeName: 'us-east-batch-02',
    alertRuleId: 'rule-disk-space',
    title: 'Ephemeral Disk Usage Alert',
    description: 'Log partition cleanup completed successfully after reaching 82% threshold.',
    severity: 'info',
    status: 'resolved',
    timestamp: Date.now() - 320 * 60 * 1000,
    resolvedAt: Date.now() - 290 * 60 * 1000,
    metricType: 'disk',
    currentValue: '62.0%',
    threshold: '80.0%',
  },
];

export const IncidentTable: React.FC<IncidentTableProps> = ({
  incidents: initialIncidents = DEFAULT_INCIDENTS,
  onAcknowledge,
  onResolve,
  onSelectNode,
  isLoading = false,
  className = '',
}) => {
  // Local state copy for instant responsive UI feedback
  const [items, setItems] = useState<Incident[]>(initialIncidents);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionInProgress, setActionInProgress] = useState<Record<string, 'ack' | 'resolve' | null>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sync when prop updates
  React.useEffect(() => {
    if (initialIncidents && initialIncidents.length > 0) {
      setItems(initialIncidents);
    }
  }, [initialIncidents]);

  // Relative time helper
  const getRelativeTime = (ts: string | number): string => {
    const timestampMs = typeof ts === 'number' ? (ts > 1e11 ? ts : ts * 1000) : Date.parse(ts);
    if (isNaN(timestampMs)) return String(ts);
    const diffSec = Math.floor((Date.now() - timestampMs) / 1000);

    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getFullTimestamp = (ts: string | number): string => {
    const timestampMs = typeof ts === 'number' ? (ts > 1e11 ? ts : ts * 1000) : Date.parse(ts);
    if (isNaN(timestampMs)) return String(ts);
    return new Date(timestampMs).toLocaleString();
  };

  // Severity rendering helper
  const renderSeverityBadge = (severity: IncidentSeverity) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono">
            <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
            CRITICAL
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
            <AlertCircle className="w-3 h-3 stroke-[2.5]" />
            WARNING
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono">
            <Info className="w-3 h-3 stroke-[2.5]" />
            INFO
          </span>
        );
    }
  };

  // Status rendering helper
  const renderStatusBadge = (status: IncidentStatus) => {
    switch (status.toLowerCase()) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-rose-950/60 text-rose-300 border border-rose-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            OPEN
          </span>
        );
      case 'investigating':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-amber-950/60 text-amber-300 border border-amber-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            INVESTIGATING
          </span>
        );
      case 'resolved':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-950/50 text-emerald-300 border border-emerald-800/70">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            RESOLVED
          </span>
        );
    }
  };

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return items.filter((inc) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = inc.title.toLowerCase().includes(query);
        const matchesDesc = inc.description.toLowerCase().includes(query);
        const matchesNodeId = inc.nodeId.toLowerCase().includes(query);
        const matchesNodeName = inc.nodeName ? inc.nodeName.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesDesc && !matchesNodeId && !matchesNodeName) {
          return false;
        }
      }

      // Severity filter
      if (severityFilter !== 'ALL') {
        if (inc.severity.toUpperCase() !== severityFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (inc.status.toUpperCase() !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, severityFilter, statusFilter]);

  // Quick stats
  const stats = useMemo(() => {
    let openCount = 0;
    let criticalCount = 0;
    let investigatingCount = 0;
    let resolvedCount = 0;

    items.forEach((item) => {
      if (item.status === 'open') openCount++;
      if (item.status === 'investigating') investigatingCount++;
      if (item.status === 'resolved') resolvedCount++;
      if (item.severity === 'critical' && item.status !== 'resolved') criticalCount++;
    });

    return { openCount, criticalCount, investigatingCount, resolvedCount };
  }, [items]);

  // Actions with immediate state feedback
  const handleAcknowledge = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionInProgress((prev) => ({ ...prev, [id]: 'ack' }));
    try {
      if (onAcknowledge) {
        await onAcknowledge(id);
      }
      // Optimistic local update
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'investigating' as IncidentStatus } : item))
      );
    } finally {
      setActionInProgress((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleResolve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionInProgress((prev) => ({ ...prev, [id]: 'resolve' }));
    try {
      if (onResolve) {
        await onResolve(id);
      }
      // Optimistic local update
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'resolved' as IncidentStatus, resolvedAt: Date.now() } : item
        )
      );
    } finally {
      setActionInProgress((prev) => ({ ...prev, [id]: null }));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`flex flex-col w-full rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md overflow-hidden ${className}`}>
      {/* Table Header Controls */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Incident Audit Log
            </h2>
            <div className="flex items-center gap-1.5">
              {stats.criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {stats.criticalCount} Critical
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                {stats.openCount} Open
              </span>
            </div>
          </div>

          {/* Quick Severity Tab Filters */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  severityFilter === sev
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by incident title, node ID, or description..."
              className="w-full pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 bg-slate-900/90 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">All Statuses</option>
                <option value="OPEN" className="bg-slate-900 text-rose-300">Open</option>
                <option value="INVESTIGATING" className="bg-slate-900 text-amber-300">Investigating</option>
                <option value="RESOLVED" className="bg-slate-900 text-emerald-300">Resolved</option>
              </select>
            </div>

            {(searchQuery || severityFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSeverityFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
              <th className="py-3 px-4 w-12 text-center">Sev</th>
              <th className="py-3 px-4 min-w-[200px]">Incident Details</th>
              <th className="py-3 px-4 min-w-[140px]">Target Node</th>
              <th className="py-3 px-4 min-w-[110px]">Status</th>
              <th className="py-3 px-4 min-w-[120px]">Triggered</th>
              <th className="py-3 px-4 min-w-[170px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>Loading real-time incidents...</span>
                  </div>
                </td>
              </tr>
            ) : filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500/60 stroke-[1.5]" />
                    <span className="text-sm font-semibold text-slate-300">No Incidents Found</span>
                    <span className="text-xs text-slate-500 max-w-sm">
                      {searchQuery || severityFilter !== 'ALL' || statusFilter !== 'ALL'
                        ? 'No incidents match your active search or filters.'
                        : 'All cluster nodes and services are operating normally with zero active alerts.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredIncidents.map((incident) => {
                const isExpanded = expandedId === incident.id;
                const currentAction = actionInProgress[incident.id];
                const isResolved = incident.status === 'resolved';

                return (
                  <React.Fragment key={incident.id}>
                    <tr
                      onClick={() => toggleExpand(incident.id)}
                      className={`group cursor-pointer transition-colors hover:bg-slate-800/40 ${
                        isExpanded ? 'bg-slate-800/30' : ''
                      } ${incident.status === 'open' ? 'bg-rose-950/10' : ''}`}
                    >
                      {/* Severity */}
                      <td className="py-3 px-4 text-center align-top">
                        {renderSeverityBadge(incident.severity)}
                      </td>

                      {/* Details & Title */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                            <span>{incident.title}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 max-w-md">
                            {incident.description}
                          </p>
                        </div>
                      </td>

                      {/* Target Node */}
                      <td className="py-3 px-4 align-top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectNode) onSelectNode(incident.nodeId);
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/70 hover:bg-slate-700/70 text-slate-300 hover:text-white border border-slate-700/50 transition-colors font-mono text-[11px]"
                        >
                          <Server className="w-3 h-3 text-cyan-400" />
                          <span>{incident.nodeName || incident.nodeId}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-top">
                        {renderStatusBadge(incident.status)}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 align-top">
                        <div
                          className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]"
                          title={getFullTimestamp(incident.timestamp)}
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{getRelativeTime(incident.timestamp)}</span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isResolved && (
                            <>
                              {incident.status === 'open' && (
                                <button
                                  type="button"
                                  disabled={currentAction === 'ack'}
                                  onClick={(e) => handleAcknowledge(incident.id, e)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/40 transition-colors disabled:opacity-50"
                                >
                                  {currentAction === 'ack' ? (
                                    <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Sliders className="w-3 h-3" />
                                  )}
                                  <span>Ack</span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={currentAction === 'resolve'}
                                onClick={(e) => handleResolve(incident.id, e)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/40 transition-colors disabled:opacity-50"
                              >
                                {currentAction === 'resolve' ? (
                                  <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>Resolve</span>
                              </button>
                            </>
                          )}

                          {isResolved && (
                            <span className="text-[11px] font-mono text-emerald-400/80 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Incident Details Row */}
                    {isExpanded && (
                      <tr className="bg-slate-950/70 border-y border-slate-800/80">
                        <td colSpan={6} className="py-3 px-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="flex flex-col gap-1 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                              <span className="text-slate-400 text-[10px] uppercase font-mono">Incident Metadata</span>
                              <div className="flex items-center justify-between text-slate-300">
                                <span>Incident ID:</span>
                                <span className="font-mono text-cyan-300">{incident.id}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-300">
                                <span>Rule Ref:</span>
                                <span className="font-mono text-slate-400">{incident.alertRuleId || 'Rule-Auto-Check'}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-300">
                                <span>Timestamp:</span>
                                <span className="font-mono text-slate-300">{getFullTimestamp(incident.timestamp)}</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                              <span className="text-slate-400 text-[10px] uppercase font-mono">Telemetry Snapshot</span>
                              <div className="flex items-center justify-between text-slate-300">
                                <span>Metric Type:</span>
                                <span className="font-mono text-amber-300 uppercase">{incident.metricType || 'General'}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-300">
                                <span>Trigger Value:</span>
                                <span className="font-mono text-rose-400 font-bold">{incident.currentValue || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-300">
                                <span>Configured Threshold:</span>
                                <span className="font-mono text-slate-400">{incident.threshold || 'N/A'}</span>
                              </div>
                            </div>

                            <div className="flex flex-col justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                              <div>
                                <span className="text-slate-400 text-[10px] uppercase font-mono">Recommended Remediation</span>
                                <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
                                  Inspect server process thread pools or re-route network load balancing if degradation persists.
                                </p>
                              </div>
                              {onSelectNode && (
                                <button
                                  type="button"
                                  onClick={() => onSelectNode(incident.nodeId)}
                                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 self-start"
                                >
                                  <span>View Node Metrics Dashboard</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
        <span>
          Showing {filteredIncidents.length} of {items.length} incidents
        </span>
        <div className="flex items-center gap-3">
          <span>{stats.investigatingCount} in progress</span>
          <span>•</span>
          <span className="text-emerald-400">{stats.resolvedCount} resolved</span>
        </div>
      </div>
    </div>
  );
};

export default IncidentTable;
