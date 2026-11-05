import React from 'react';
import { 
  Cpu, 
  HardDrive, 
  Clock, 
  Activity, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight, 
  Server, 
  Layers,
  Radio,
  Zap
} from 'lucide-react';
import { useServerState } from '../../context/ServerContext';
import { ServerNode } from '../../types';
import { SparklineChart, StatusBadge, CoreMatrix } from '../index';

export const OverviewView: React.FC = () => {
  const {
    telemetry,
    nodes,
    setSelectedNodeId,
    selectedNodeId,
    selectedNode,
    metricsHistory,
    setActiveTab
  } = useServerState();

  const getStatusBadge = (status: ServerNode['status']) => {
    switch (status) {
      case 'healthy':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Healthy</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">Degraded</span>;
      case 'critical':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">Critical</span>;
      case 'offline':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">Offline</span>;
    }
  };

  const currentCpu = selectedNode ? selectedNode.cpu : telemetry.avgCpu;
  const currentMem = selectedNode ? selectedNode.memory : telemetry.avgMemory;
  const currentDisk = selectedNode ? selectedNode.disk : telemetry.avgDisk;
  const currentLatency = selectedNode ? selectedNode.latencyMs : telemetry.avgLatencyMs;

  return (
    <div className="space-y-6">
      {/* Cluster Banner / Target Notice */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-gradient-to-r from-[#0d1628] via-[#0e1b33] to-[#0c182c] p-6 shadow-xl">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-56 h-56 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-bold text-cyan-400">
                {selectedNode ? 'Target Node Inspection' : 'Cluster Telemetry Mesh'}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span className="text-xs font-mono text-slate-400">
                {selectedNode ? selectedNode.region : `${telemetry.totalNodes} Managed Instances`}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {selectedNode ? selectedNode.name : 'Real-Time Global Observability'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {selectedNode 
                ? `Role: ${selectedNode.role.toUpperCase()} | Host: ${selectedNode.hostname} | Uptime: ${selectedNode.uptime}` 
                : telemetry.systemMessage}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedNodeId !== 'all' && (
              <button
                onClick={() => setSelectedNodeId('all')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              >
                Reset to All Nodes
              </button>
            )}
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-lg transition-all ${
                telemetry.activeAlertsCount > 0
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-rose-900/40 hover:from-rose-500 hover:to-rose-600'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-emerald-900/40 hover:from-emerald-500 hover:to-emerald-600'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{telemetry.activeAlertsCount} Active Incidents</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Utilization */}
        <div className="p-5 rounded-xl bg-[#0d1628]/90 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">CPU Compute Load</span>
            <div className={`p-2 rounded-lg ${currentCpu > 85 ? 'bg-rose-500/10 text-rose-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">{currentCpu}%</span>
            <span className="text-xs font-medium text-slate-400">
              {selectedNode ? `${selectedNode.cores} Cores` : 'Cluster avg'}
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                currentCpu > 85 ? 'bg-rose-500' : currentCpu > 70 ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, currentCpu)}%` }}
            />
          </div>
        </div>

        {/* Memory Pressure */}
        <div className="p-5 rounded-xl bg-[#0d1628]/90 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Memory Utilization</span>
            <div className={`p-2 rounded-lg ${currentMem > 85 ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'}`}>
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">{currentMem}%</span>
            <span className="text-xs font-medium text-slate-400">
              {selectedNode ? `${selectedNode.totalMemoryGb} GB RAM` : 'Cluster avg'}
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                currentMem > 85 ? 'bg-rose-500' : currentMem > 70 ? 'bg-amber-400' : 'bg-blue-400'
              }`}
              style={{ width: `${Math.min(100, currentMem)}%` }}
            />
          </div>
        </div>

        {/* Storage / Disk Volume */}
        <div className="p-5 rounded-xl bg-[#0d1628]/90 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Disk I/O Capacity</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">{currentDisk}%</span>
            <span className="text-xs font-medium text-slate-400">Mounted volumes</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, currentDisk)}%` }}
            />
          </div>
        </div>

        {/* Latency / SLA */}
        <div className="p-5 rounded-xl bg-[#0d1628]/90 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Network Latency (RTT)</span>
            <div className={`p-2 rounded-lg ${currentLatency > 100 ? 'bg-rose-500/10 text-rose-400' : 'bg-purple-500/10 text-purple-400'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">{currentLatency}</span>
            <span className="text-xs font-semibold text-slate-400 font-mono">ms</span>
            <span className={`text-[11px] font-medium ml-auto ${currentLatency < 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {currentLatency < 50 ? 'Sub-50ms SLA' : 'Elevated'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Throughput: {telemetry.totalThroughputMbps} MB/s</span>
            <span>Packet drop: 0.00%</span>
          </div>
        </div>
      </div>

      {/* Telemetry Sparkline Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CPU Telemetry Sparkline */}
        <div className="p-5 rounded-xl bg-[#0d1628]/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                CPU Utilization Curve
              </h2>
              <p className="text-[11px] text-slate-400">
                Smooth cubic spline with interactive crosshair and min/max telemetry points
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/60">
              {currentCpu}% Live
            </span>
          </div>

          <SparklineChart
            data={metricsHistory.map((m) => ({ timestamp: m.timestamp, value: m.cpu }))}
            color={currentCpu > 85 ? 'rose' : currentCpu > 70 ? 'amber' : 'cyan'}
            height={110}
            unit="%"
            label="CPU Utilization"
            min={0}
            max={100}
            showMinMax
            showArea
            showCrosshair
          />
        </div>

        {/* Memory Telemetry Sparkline */}
        <div className="p-5 rounded-xl bg-[#0d1628]/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-400" />
                RAM Consumption Curve
              </h2>
              <p className="text-[11px] text-slate-400">
                Continuous memory buffer telemetry with gradient area fill
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/60">
              {currentMem}% Live
            </span>
          </div>

          <SparklineChart
            data={metricsHistory.map((m) => ({ timestamp: m.timestamp, value: m.memory }))}
            color="blue"
            height={110}
            unit="%"
            label="Memory Used"
            min={0}
            max={100}
            showMinMax
            showArea
            showCrosshair
          />
        </div>
      </div>

      {/* Per-Core Heat Matrix */}
      <CoreMatrix
        coreCount={selectedNode ? selectedNode.cores : 16}
        title={selectedNode ? `Hardware Cores: ${selectedNode.name} (${selectedNode.cores} Cores)` : 'Cluster Per-Core Heat Matrix'}
      />

      {/* Fleet Node Matrix Preview */}
      <div className="p-6 rounded-xl bg-[#0d1628]/90 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Fleet Node Cluster Health
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any node to focus telemetry and inspect detailed vitals
            </p>
          </div>
          <button
            onClick={() => setActiveTab('nodes')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View All Nodes →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(isSelected ? 'all' : node.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-[#101a30]/80 border-slate-800 hover:border-slate-700 hover:bg-[#131f3b]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{node.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{node.ip} • {node.region}</span>
                  </div>
                  <StatusBadge status={node.status} size="sm" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                  <div>
                    <span className="block text-[10px] text-slate-400">CPU</span>
                    <span className={`text-xs font-mono font-bold ${node.cpu > 85 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {node.cpu}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">RAM</span>
                    <span className={`text-xs font-mono font-bold ${node.memory > 85 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {node.memory}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">LATENCY</span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {node.latencyMs}ms
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
