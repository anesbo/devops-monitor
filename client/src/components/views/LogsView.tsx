import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Search, 
  Trash2, 
  Download, 
  Filter, 
  Play, 
  AlertOctagon, 
  AlertTriangle, 
  Cpu, 
  Layers, 
  Box, 
  Wifi, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  Clock, 
  Server, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useServerState } from '../../context/ServerContext';
import { LogEntry, LogLevel, Incident } from '../../types';
import { IncidentTable } from '../IncidentTable';
import { useToast } from '../AlertToast';
import { EmptyState } from '../SkeletonLoader';

interface SimulateOption {
  type: 'cpu' | 'ram' | 'container' | 'network';
  label: string;
  desc: string;
  icon: React.ElementType;
  severity: 'critical' | 'warning';
}

const SIMULATE_OPTIONS: SimulateOption[] = [
  {
    type: 'cpu',
    label: 'Simulate CPU Spike',
    desc: 'Burst utilization to 96.8% on primary node',
    icon: Cpu,
    severity: 'critical',
  },
  {
    type: 'ram',
    label: 'Simulate Memory Leak',
    desc: 'Simulate JVM/Node heap leak reaching 93.4%',
    icon: Layers,
    severity: 'warning',
  },
  {
    type: 'container',
    label: 'Simulate Container Crash',
    desc: 'Trigger CrashLoopBackOff in ingress pod',
    icon: Box,
    severity: 'critical',
  },
  {
    type: 'network',
    label: 'Simulate Network Saturation',
    desc: 'Simulate DDoS ingress flood exceeding 900 Mbps',
    icon: Wifi,
    severity: 'warning',
  },
];

export const LogsView: React.FC = () => {
  const { 
    logs, 
    selectedNodeId, 
    selectedNode, 
    nodes, 
    alerts, 
    acknowledgeAlert, 
    resolveAlert,
    setSelectedNodeId,
    setActiveTab
  } = useServerState();

  const { addToast } = useToast();

  // Log Filters
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isLiveTail, setIsLiveTail] = useState<boolean>(true);
  const [isSimulateMenuOpen, setIsSimulateMenuOpen] = useState<boolean>(false);

  // Local dynamically appended logs and incidents from simulation
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);
  const [localIncidents, setLocalIncidents] = useState<Incident[]>([]);

  // Incident detail drawer state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Combine context logs and simulated logs
  const allLogs = useMemo(() => {
    return [...localLogs, ...logs];
  }, [localLogs, logs]);

  // Combined incidents
  const mappedIncidents: Incident[] = useMemo(() => {
    const fromAlerts: Incident[] = alerts.map(a => ({
      id: a.id,
      nodeId: a.nodeId,
      nodeName: a.nodeName,
      title: a.title,
      description: a.description,
      severity: a.severity,
      status: a.resolved ? 'resolved' : a.acknowledged ? 'investigating' : 'open',
      timestamp: a.timestamp,
      metricType: a.metricType,
      currentValue: a.currentValue,
      threshold: a.threshold,
    }));

    const existingIds = new Set(fromAlerts.map(i => i.id));
    const uniqueLocal = localIncidents.filter(i => !existingIds.has(i.id));
    return [...uniqueLocal, ...fromAlerts];
  }, [alerts, localIncidents]);

  // Unique services in logs
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    allLogs.forEach(l => set.add(l.service));
    return Array.from(set);
  }, [allLogs]);

  // Filtered log entries
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
      const matchesService = serviceFilter === 'all' || log.service === serviceFilter;
      const matchesSearch = searchFilter === '' ||
        log.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
        log.service.toLowerCase().includes(searchFilter.toLowerCase()) ||
        log.nodeName.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesLevel && matchesService && matchesSearch;
    });
  }, [allLogs, levelFilter, serviceFilter, searchFilter]);

  // Auto-scroll when live tail is enabled
  useEffect(() => {
    if (isLiveTail && terminalEndRef.current && typeof terminalEndRef.current.scrollIntoView === 'function') {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, isLiveTail]);

  // Trigger synthetic incident simulation
  const handleSimulateIncident = (option: SimulateOption) => {
    setIsSimulateMenuOpen(false);

    const targetNode = selectedNode || nodes[0] || {
      id: 'node-us-east-1',
      name: 'Edge Gateway Alpha',
      hostname: 'gw-01.us-east.apexpulse.internal'
    };

    const incidentId = `sim-inc-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString();

    let title = '';
    let description = '';
    let metricType = '';
    let currentValue = '';
    let threshold = '';

    if (option.type === 'cpu') {
      title = `Simulated Core Compute Spike (${targetNode.name})`;
      description = `All cores reached 96.8% compute capacity under synthetic load testing flood.`;
      metricType = 'cpu';
      currentValue = '96.8%';
      threshold = '85.0%';
    } else if (option.type === 'ram') {
      title = `Simulated Heap Memory Exhaustion (${targetNode.name})`;
      description = `Buffer cache saturated 93.4% of total RAM; GC thrashing detected.`;
      metricType = 'ram';
      currentValue = '93.4%';
      threshold = '90.0%';
    } else if (option.type === 'container') {
      title = `Simulated Pod CrashLoopBackOff (${targetNode.name})`;
      description = `Critical microservice container exited with code 137 (OOMKilled).`;
      metricType = 'container_health';
      currentValue = '48/100';
      threshold = '70/100';
    } else {
      title = `Simulated Network Flood Anomaly (${targetNode.name})`;
      description = `Ingress NIC saturated with 920.4 Mbps sustained incoming packets.`;
      metricType = 'network';
      currentValue = '920.4 Mbps';
      threshold = '800 Mbps';
    }

    const newIncident: Incident = {
      id: incidentId,
      nodeId: targetNode.id,
      nodeName: targetNode.name,
      title,
      description,
      severity: option.severity,
      status: 'open',
      timestamp,
      metricType,
      currentValue,
      threshold,
    };

    // Prepend to incidents
    setLocalIncidents(prev => [newIncident, ...prev]);

    // Add log entries to terminal stream
    const errorLog: LogEntry = {
      id: `sim-log-${Date.now()}-1`,
      timestamp,
      nodeId: targetNode.id,
      nodeName: targetNode.name,
      service: option.type === 'container' ? 'containerd' : 'telemetry-daemon',
      level: option.severity === 'critical' ? 'error' : 'warn',
      message: `[ALERT TRIGGERED] ${title} - ${description}`,
    };

    const auditLog: LogEntry = {
      id: `sim-log-${Date.now()}-2`,
      timestamp,
      nodeId: targetNode.id,
      nodeName: targetNode.name,
      service: 'incident-router',
      level: 'info',
      message: `Dispatched automated incident ${incidentId} to pager/ops webhook.`,
    };

    setLocalLogs(prev => [errorLog, auditLog, ...prev]);

    // Trigger visual toast with audio alert!
    addToast({
      title,
      description,
      severity: option.severity,
      nodeName: targetNode.name,
      nodeId: targetNode.id,
      timestamp,
      onInspect: () => {
        setSelectedIncident(newIncident);
      },
      onAcknowledge: () => {
        handleAcknowledgeIncident(incidentId);
      }
    });
  };

  const handleAcknowledgeIncident = (id: string) => {
    setLocalIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: 'investigating' } : inc));
    acknowledgeAlert(id);
    if (selectedIncident?.id === id) {
      setSelectedIncident(prev => prev ? { ...prev, status: 'investigating' } : null);
    }
  };

  const handleResolveIncident = (id: string) => {
    setLocalIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: 'resolved' } : inc));
    resolveAlert(id);
    if (selectedIncident?.id === id) {
      setSelectedIncident(prev => prev ? { ...prev, status: 'resolved' } : null);
    }
  };

  const handleClearTerminal = () => {
    setLocalLogs([]);
  };

  const handleExportLogs = () => {
    const text = filteredLogs
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.nodeName} / ${l.service}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apexpulse-logs-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelStyle = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold';
      case 'warn':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold';
      case 'info':
        return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      case 'debug':
        return 'bg-slate-700/40 text-slate-400 border border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls with Simulate Incident */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-[#0b1222]/90 border border-slate-800/90 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Real-Time Audit Log & Incident Diagnostics
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-mono text-slate-400">
              {filteredLogs.length} live entries streaming
            </span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Live Cluster Telemetry Logs & Incident Dispatcher
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 relative">
          {/* Simulate Incident Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSimulateMenuOpen(prev => !prev)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-rose-900/20 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current stroke-none" />
              <span>Simulate Incident</span>
            </button>

            {/* Simulate Dropdown Menu */}
            {isSimulateMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0e1628] border border-slate-700 shadow-2xl p-2 z-40 text-left animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                    Interactive Incident Injection
                  </span>
                </div>
                {SIMULATE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => handleSimulateIncident(opt)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors flex items-start gap-3 group cursor-pointer"
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        opt.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {opt.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Export Logs */}
          <button
            type="button"
            onClick={handleExportLogs}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            title="Download Logs as File"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Clear Buffer */}
          <button
            type="button"
            onClick={handleClearTerminal}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Clear Stream Buffer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Live Tail Toggle */}
          <button
            type="button"
            onClick={() => setIsLiveTail(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              isLiveTail 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-800/80 text-slate-400 border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveTail ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{isLiveTail ? 'TAILING' : 'PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Log Filtering Bar */}
      <div className="p-4 bg-[#0b1222]/90 border border-slate-800/90 rounded-2xl shadow-md flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Grep logs (regex / string / service)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#11192b] text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500/60 font-mono transition-all"
          />
        </div>

        {/* Level Filter */}
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="bg-[#11192b] text-slate-300 text-xs rounded-xl px-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500/60 font-mono transition-all cursor-pointer"
        >
          <option value="all">ALL LEVELS</option>
          <option value="error">ERROR</option>
          <option value="warn">WARN</option>
          <option value="info">INFO</option>
          <option value="debug">DEBUG</option>
        </select>

        {/* Service Filter */}
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="bg-[#11192b] text-slate-300 text-xs rounded-xl px-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500/60 font-mono transition-all cursor-pointer"
        >
          <option value="all">ALL SERVICES</option>
          {availableServices.map(srv => (
            <option key={srv} value={srv}>{srv}</option>
          ))}
        </select>
      </div>

      {/* Terminal Screen Component */}
      <div className="rounded-2xl border border-slate-800/90 bg-[#060a12] shadow-2xl overflow-hidden font-mono text-xs">
        {/* Terminal Titlebar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0a0f1b] border-b border-slate-800/90 text-slate-400 select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/90 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/90 inline-block" />
            <span className="ml-2 text-[11px] font-semibold text-slate-300 font-sans">
              apexpulse-telemetry-stdout — {filteredLogs.length} buffered lines
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-slate-500">Node: {selectedNode ? selectedNode.name : 'All Nodes'}</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              LIVE STREAM
            </span>
          </div>
        </div>

        {/* Logs Lines Buffer */}
        <div className="p-4 space-y-1.5 max-h-[380px] overflow-y-auto font-mono text-[11px]">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 py-12 text-center">
              No log messages matching filter criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start gap-3 py-1 px-2 rounded hover:bg-slate-900/60 transition-colors group"
              >
                <span className="text-slate-500 shrink-0 select-none">
                  {log.timestamp}
                </span>

                <span className={`px-1.5 py-0.2 rounded text-[10px] shrink-0 uppercase ${getLevelStyle(log.level)}`}>
                  {log.level}
                </span>

                <span className="text-cyan-400/90 shrink-0 font-medium group-hover:text-cyan-300">
                  [{log.nodeName.split(' ')[0]} / {log.service}]
                </span>

                <span className="text-slate-300 break-all leading-relaxed">
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* SECTION: Embedded IncidentTable */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Active & Audited Incident Registry</h2>
              <p className="text-xs text-slate-400">Click any incident to open the forensic detail drawer</p>
            </div>
          </div>
        </div>

        <IncidentTable
          incidents={mappedIncidents}
          onAcknowledge={handleAcknowledgeIncident}
          onResolve={handleResolveIncident}
          onSelectNode={(nodeId) => {
            setSelectedNodeId(nodeId);
            setActiveTab('nodes');
          }}
        />
      </div>

      {/* Incident Detail Drawer / Modal */}
      {selectedIncident && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedIncident(null)}
        >
          <div 
            className="w-full max-w-xl h-full bg-[#0b101d] border-l border-slate-800 shadow-2xl p-6 overflow-y-auto space-y-6 text-slate-100 animate-in slide-in-from-right duration-250"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    selectedIncident.severity === 'critical'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {selectedIncident.severity}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{selectedIncident.id}</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">{selectedIncident.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Incident Summary Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-mono uppercase text-slate-400 font-bold">Anomaly Summary</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedIncident.description}
              </p>

              {selectedIncident.currentValue && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Trigger Value</span>
                    <strong className="text-rose-400 text-sm">{selectedIncident.currentValue}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Threshold Limit</span>
                    <strong className="text-slate-300 text-sm">{selectedIncident.threshold || 'N/A'}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Target Node Details */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                Impacted Node Infrastructure
              </h4>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Node Identifier:</span>
                <span className="text-white font-bold">{selectedIncident.nodeName || selectedIncident.nodeId}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Node ID:</span>
                <span className="text-cyan-400">{selectedIncident.nodeId}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedNodeId(selectedIncident.nodeId);
                  setActiveTab('nodes');
                  setSelectedIncident(null);
                }}
                className="w-full mt-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <span>Drill Down into Node Vitals</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Runbook Remediation Steps */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-mono uppercase text-cyan-400 font-bold flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Recommended Runbook Actions
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-mono">1.</span>
                  <span>Inspect service process stack traces on daemon agent.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-mono">2.</span>
                  <span>Scale replica worker pods or flush in-memory buffer cache.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-mono">3.</span>
                  <span>Verify ingress rate-limits and failover to replica region if sustained.</span>
                </li>
              </ul>
            </div>

            {/* Triage Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                selectedIncident.status === 'resolved'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : selectedIncident.status === 'investigating'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                Status: {selectedIncident.status}
              </span>

              <div className="flex items-center gap-2">
                {selectedIncident.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledgeIncident(selectedIncident.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
                {selectedIncident.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => handleResolveIncident(selectedIncident.id)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsView;
