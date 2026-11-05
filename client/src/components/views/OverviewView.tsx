import React, { useMemo } from 'react';
import { 
  Cpu, 
  Layers, 
  HardDrive, 
  Clock, 
  Activity, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight, 
  Server, 
  Zap, 
  Wifi, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useServerState } from '../../context/ServerContext';
import { SparklineChart, StatusBadge } from '../index';
import { ShimmerCard, SparklineSkeleton } from '../SkeletonLoader';

export const OverviewView: React.FC = () => {
  const {
    telemetry,
    nodes,
    isLoadingNodes,
    selectedNodeId,
    setSelectedNodeId,
    selectedNode,
    metricsHistory,
    isLoadingMetrics,
    alerts,
    acknowledgeAlert,
    resolveAlert,
    setActiveTab,
    manualRefresh,
  } = useServerState();

  // Active or unresolved incidents feed
  const recentIncidents = useMemo(() => {
    return alerts
      .filter(a => !a.resolved)
      .slice(0, 5);
  }, [alerts]);

  // Sparkline data series
  const cpuSparklineData = useMemo(() => {
    return metricsHistory.map(m => ({
      timestamp: m.timestamp,
      value: m.cpu
    }));
  }, [metricsHistory]);

  const memorySparklineData = useMemo(() => {
    return metricsHistory.map(m => ({
      timestamp: m.timestamp,
      value: m.memory
    }));
  }, [metricsHistory]);

  const networkSparklineData = useMemo(() => {
    return metricsHistory.map(m => ({
      timestamp: m.timestamp,
      value: Math.round((m.networkIn + m.networkOut) * 10) / 10
    }));
  }, [metricsHistory]);

  // Current values
  const currentCpu = selectedNode ? selectedNode.cpu : telemetry.avgCpu;
  const currentMem = selectedNode ? selectedNode.memory : telemetry.avgMemory;
  const currentDisk = selectedNode ? selectedNode.disk : telemetry.avgDisk;
  const currentLatency = selectedNode ? selectedNode.latencyMs : telemetry.avgLatencyMs;

  // Approximate RX and TX breakdown from throughput
  const totalThroughput = telemetry.totalThroughputMbps || 268.4;
  const rxThroughput = Math.round(totalThroughput * 0.44 * 10) / 10;
  const txThroughput = Math.round(totalThroughput * 0.56 * 10) / 10;

  // Node status breakdown
  const onlineCount = nodes.filter(n => n.status === 'healthy').length;
  const warningCount = nodes.filter(n => n.status === 'warning').length;
  const criticalCount = nodes.filter(n => n.status === 'critical').length;
  const offlineCount = nodes.filter(n => n.status === 'offline').length;

  // Total RAM GB in cluster or selected node
  const totalClusterRamGb = useMemo(() => {
    if (selectedNode) return selectedNode.totalMemoryGb;
    return nodes.reduce((sum, n) => sum + (n.totalMemoryGb || 64), 0);
  }, [nodes, selectedNode]);

  const usedRamGb = Math.round((totalClusterRamGb * (currentMem / 100)) * 10) / 10;

  if (isLoadingNodes && nodes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ShimmerCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SparklineSkeleton key={i} height={200} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Target Focus Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-100 via-white to-slate-50 text-slate-900 dark:border-slate-800/80 dark:bg-gradient-to-r dark:from-[#0c1322] dark:via-[#0f1930] dark:to-[#0c1527] dark:text-white p-6 shadow-xl backdrop-blur-sm transition-colors duration-200">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-8 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                {selectedNode ? 'Focused Target Inspection' : 'Cluster Mesh Observability'}
              </span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {selectedNode ? `${selectedNode.region} (${selectedNode.ip})` : `${nodes.length} Fleet Nodes Connected`}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {selectedNode ? selectedNode.name : 'Unified Observability & Fleet Telemetry'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {selectedNode
                ? `Role: ${selectedNode.role.toUpperCase()} | Host: ${selectedNode.hostname} | Uptime: ${selectedNode.uptime}`
                : telemetry.systemMessage || 'Autonomous telemetry engine streaming live metrics and detecting anomaly events'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {selectedNodeId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedNodeId('all')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
              >
                Reset to All Nodes
              </button>
            )}
            <button
              type="button"
              onClick={manualRefresh}
              className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 transition-colors"
              title="Manual Telemetry Poll"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold shadow-lg transition-all cursor-pointer ${
                telemetry.activeAlertsCount > 0
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-900/40'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-900/40'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{telemetry.activeAlertsCount} Active Incidents</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Primary Global Summary KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Nodes */}
        <div 
          onClick={() => setActiveTab('nodes')}
          className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 hover:border-cyan-500/50 transition-colors duration-200 shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Total Nodes</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">{nodes.length}</span>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">99.8% Online</span>
          </div>
          {/* Node Breakdown Badges */}
          <div className="mt-3.5 flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {onlineCount} OK
            </span>
            {warningCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {warningCount} DEG
              </span>
            )}
            {criticalCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                {criticalCount} CRIT
              </span>
            )}
            {offlineCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
                {offlineCount} OFF
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Cluster CPU Load % */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cluster CPU Load</span>
            <div className={`p-2 rounded-xl ${
              currentCpu > 85 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">{currentCpu}%</span>
            <span className={`text-[11px] font-mono font-semibold flex items-center ${currentCpu > 70 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              <TrendingUp className="w-3 h-3 mr-0.5" />
              {currentCpu > 70 ? 'Elevated' : 'Optimal'}
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                currentCpu > 85 ? 'bg-rose-500' : currentCpu > 70 ? 'bg-amber-400' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, currentCpu)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span>Peak: {Math.min(99, Math.round(currentCpu * 1.2))}%</span>
            <span>{selectedNode ? `${selectedNode.cores} Cores` : 'Cluster Avg'}</span>
          </div>
        </div>

        {/* Card 3: Cluster RAM Used */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cluster RAM Used</span>
            <div className={`p-2 rounded-xl ${
              currentMem > 85 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
            }`}>
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">{currentMem}%</span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {usedRamGb}/{totalClusterRamGb} GB
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                currentMem > 85 ? 'bg-rose-500' : currentMem > 70 ? 'bg-amber-400' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, currentMem)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span>Free: {Math.round((totalClusterRamGb - usedRamGb) * 10) / 10} GB</span>
            <span>Allocated</span>
          </div>
        </div>

        {/* Card 4: Network Throughput rx/tx */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Network Throughput</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">{totalThroughput}</span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">Mbps</span>
          </div>
          {/* Separate RX and TX stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[11px] font-mono">
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <ArrowDownRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>RX: <strong className="text-slate-900 dark:text-white">{rxThroughput}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>TX: <strong className="text-slate-900 dark:text-white">{txThroughput}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 5: Active Incidents Count */}
        <div 
          onClick={() => setActiveTab('alerts')}
          className={`p-5 rounded-2xl border transition-colors duration-200 shadow-md cursor-pointer group ${
            telemetry.activeAlertsCount > 0
              ? 'bg-rose-50/80 border-rose-200 text-slate-900 dark:bg-[#180a0e]/90 dark:border-rose-500/40 hover:border-rose-400 dark:text-slate-100'
              : 'bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Active Incidents</span>
            <div className={`p-2 rounded-xl ${
              telemetry.activeAlertsCount > 0 ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono tracking-tight ${
              telemetry.activeAlertsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {telemetry.activeAlertsCount}
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Unresolved</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/70">
            <span className="text-rose-600 dark:text-rose-400 font-mono font-semibold">{criticalCount} Critical</span>
            <span className="text-amber-600 dark:text-amber-400 font-mono font-semibold">{warningCount} Warning</span>
          </div>
        </div>
      </div>

      {/* Aggregate Live Sparklines for Cluster CPU, RAM, and Network */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Live Cluster CPU Sparkline */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 shadow-lg relative overflow-hidden transition-colors duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Cluster CPU Compute History</h3>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">{currentCpu}% current</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">Time-series load across sample cycle (0-100%)</p>
          <div className="h-32 w-full">
            <SparklineChart
              data={cpuSparklineData}
              color="cyan"
              height={125}
              unit="%"
              showMinMax
              showArea
              showCrosshair
              min={0}
              max={100}
            />
          </div>
        </div>

        {/* Live Cluster RAM Sparkline */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 shadow-lg relative overflow-hidden transition-colors duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Cluster RAM Utilization History</h3>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{currentMem}% current</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">Memory saturation and buffer pressure (0-100%)</p>
          <div className="h-32 w-full">
            <SparklineChart
              data={memorySparklineData}
              color="blue"
              height={125}
              unit="%"
              showMinMax
              showArea
              showCrosshair
              min={0}
              max={100}
            />
          </div>
        </div>

        {/* Live Network Throughput Sparkline */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 shadow-lg relative overflow-hidden transition-colors duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Network I/O Throughput Stream</h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{totalThroughput} Mbps</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">Aggregated interface rx/tx bandwidth rate</p>
          <div className="h-32 w-full">
            <SparklineChart
              data={networkSparklineData}
              color="emerald"
              height={125}
              unit=" Mbps"
              showMinMax
              showArea
              showCrosshair
            />
          </div>
        </div>
      </div>

      {/* Split Section: Quick Node Status Grid & Recent Incidents Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Node Status Grid (2 cols on large) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 shadow-lg space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Fleet Node Status Matrix</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Click any server node to focus telemetry vitals</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('nodes')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <span>Explore All Nodes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nodes.map(node => {
              const isSelected = selectedNodeId === node.id;
              // Mini sparkline mock data for each node
              const miniPoints = [
                Math.max(5, node.cpu - 15),
                Math.max(5, node.cpu - 5),
                Math.max(5, node.cpu + 8),
                Math.max(5, node.cpu - 2),
                node.cpu
              ];

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(isSelected ? 'all' : node.id)}
                  className={`p-4 rounded-xl border transition-colors duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-50/70 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/50 dark:bg-[#101b33] dark:border-cyan-500'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 dark:bg-[#0f172a]/70 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-[#121c33]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{node.name}</h4>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {node.ip} • {node.region}
                      </p>
                    </div>
                    <StatusBadge status={node.status} size="sm" />
                  </div>

                  {/* Mini Sparkline + Core Stats */}
                  <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div>
                        <span className="block text-[10px] text-slate-500">CPU</span>
                        <span className={`font-bold ${node.cpu > 85 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {node.cpu}%
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500">RAM</span>
                        <span className={`font-bold ${node.memory > 85 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {node.memory}%
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500">RTT</span>
                        <span className="font-bold text-cyan-600 dark:text-cyan-400">
                          {node.latencyMs}ms
                        </span>
                      </div>
                    </div>

                    <div className="w-20 h-9">
                      <SparklineChart
                        data={miniPoints}
                        color={node.status === 'critical' ? 'rose' : node.status === 'warning' ? 'amber' : 'cyan'}
                        height={36}
                        showArea={false}
                        showMinMax={false}
                        showCrosshair={false}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Unresolved Incidents Feed (1 col on large) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 shadow-lg space-y-4 flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Recent Active Incidents</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                {recentIncidents.length} Unresolved
              </span>
            </div>

            {recentIncidents.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 dark:text-emerald-400 mb-2 opacity-80" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">All Systems Operational</p>
                <p className="text-[11px] text-slate-500 mt-0.5">No open incidents or threshold violations detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentIncidents.map(incident => (
                  <div
                    key={incident.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 dark:bg-slate-800/60 dark:border-slate-700/80 dark:hover:border-slate-600/80 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase mb-1 ${
                          incident.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}>
                          {incident.severity}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{incident.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                        {incident.nodeName || incident.nodeId}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {incident.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      <span>{incident.timestamp}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => acknowledgeAlert(incident.id)}
                          className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors"
                        >
                          Ack
                        </button>
                        <button
                          type="button"
                          onClick={() => resolveAlert(incident.id)}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors font-semibold"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white dark:border-slate-700 text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>View Full Live Logs & Audit Stream</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
