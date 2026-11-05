import React, { useState, useMemo } from 'react';
import { 
  Server, 
  Search, 
  Filter, 
  HardDrive, 
  Cpu, 
  Layers, 
  Clock, 
  Radio, 
  Tag, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Plus, 
  LayoutGrid, 
  List, 
  Box, 
  ShieldCheck, 
  Activity, 
  ArrowRight, 
  X,
  Gauge
} from 'lucide-react';
import { useServerState } from '../../context/ServerContext';
import { ServerNode, NodeStatus, NodeRole } from '../../types';
import { StatusBadge, CoreMatrix, SparklineChart } from '../index';
import { RegisterNodeModal } from '../RegisterNodeModal';
import { ShimmerCard, TableRowSkeleton, EmptyState } from '../SkeletonLoader';

export const NodesView: React.FC = () => {
  const { 
    nodes, 
    isLoadingNodes, 
    selectedNodeId, 
    setSelectedNodeId, 
    selectedNode 
  } = useServerState();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [localNodes, setLocalNodes] = useState<ServerNode[]>([]);

  // Combined nodes list (context nodes + locally registered nodes)
  const combinedNodes = useMemo(() => {
    const existingIds = new Set(nodes.map(n => n.id));
    const newlyAdded = localNodes.filter(n => !existingIds.has(n.id));
    return [...nodes, ...newlyAdded];
  }, [nodes, localNodes]);

  const filteredNodes = useMemo(() => {
    return combinedNodes.filter(node => {
      const matchesRole = roleFilter === 'all' || node.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || node.status === statusFilter;
      const matchesSearch = localSearch === '' || 
        node.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        node.hostname.toLowerCase().includes(localSearch.toLowerCase()) ||
        node.ip.includes(localSearch) ||
        node.region.toLowerCase().includes(localSearch.toLowerCase()) ||
        node.tags.some(t => t.toLowerCase().includes(localSearch.toLowerCase()));
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [combinedNodes, roleFilter, statusFilter, localSearch]);

  const activeDrillDownNode = useMemo(() => {
    if (selectedNodeId === 'all') return combinedNodes[0] || undefined;
    return combinedNodes.find(n => n.id === selectedNodeId) || combinedNodes[0];
  }, [combinedNodes, selectedNodeId]);

  // Container metrics calculation for drill-down node
  const containerStats = useMemo(() => {
    if (!activeDrillDownNode) return { total: 16, running: 16, failed: 0, score: 100 };
    // Realistic simulation based on node status and cores
    const total = Math.max(8, activeDrillDownNode.cores * 2);
    let failed = 0;
    if (activeDrillDownNode.status === 'critical') failed = 3;
    else if (activeDrillDownNode.status === 'warning') failed = 1;
    const running = total - failed;

    // Formula: Math.max(0, Math.min(100, Math.round(((running / Math.max(1, total)) * 100) - (failed * 15))))
    const score = Math.max(0, Math.min(100, Math.round(((running / Math.max(1, total)) * 100) - (failed * 15))));

    return { total, running, failed, score };
  }, [activeDrillDownNode]);

  // RAM breakdown
  const ramBreakdown = useMemo(() => {
    if (!activeDrillDownNode) return { usedGb: 16, totalGb: 32, cachedGb: 4, freeGb: 12 };
    const totalGb = activeDrillDownNode.totalMemoryGb || 64;
    const usedGb = Math.round((totalGb * (activeDrillDownNode.memory / 100)) * 10) / 10;
    const cachedGb = Math.round(totalGb * 0.12 * 10) / 10;
    const freeGb = Math.max(0, Math.round((totalGb - usedGb - cachedGb) * 10) / 10);
    return { usedGb, totalGb, cachedGb, freeGb };
  }, [activeDrillDownNode]);

  const handleRegisterNode = (newNode: ServerNode) => {
    setLocalNodes(prev => [newNode, ...prev]);
    setSelectedNodeId(newNode.id);
  };

  return (
    <div className="space-y-6">
      {/* View Header with Filters and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white border border-slate-200 text-slate-900 dark:bg-[#0b1222]/90 dark:border-slate-800/90 dark:text-slate-100 rounded-2xl shadow-lg transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold">
              Compute Fleet Infrastructure
            </span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Showing {filteredNodes.length} of {combinedNodes.length} registered nodes
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Server className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Server Node Explorer & Core Matrix
          </h1>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search by name, IP, region, tag..."
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-xs rounded-xl pl-9 pr-3 py-2 border border-slate-200 focus:outline-none focus:border-cyan-500/60 dark:bg-[#11192b] dark:text-slate-200 dark:placeholder-slate-500 dark:border-slate-800 font-mono transition-all"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 text-xs rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:border-cyan-500/60 dark:bg-[#11192b] dark:text-slate-300 dark:border-slate-800 transition-all cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="worker">Worker</option>
            <option value="gateway">Gateway</option>
            <option value="database">Database</option>
            <option value="cache">Cache</option>
            <option value="storage">Storage</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 text-xs rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:border-cyan-500/60 dark:bg-[#11192b] dark:text-slate-300 dark:border-slate-800 transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy / Online</option>
            <option value="warning">Warning / Degraded</option>
            <option value="critical">Critical Anomaly</option>
            <option value="offline">Offline</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 border border-slate-200 dark:bg-[#11192b] dark:border-slate-800 rounded-xl p-1 text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-cyan-600 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-400' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white text-cyan-600 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-400' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Register New Node Button */}
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Register Node</span>
          </button>
        </div>
      </div>

      {/* Active Server Drill-Down View (Top Inspection Stage) */}
      {activeDrillDownNode && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 text-slate-900 dark:bg-[#0b1222]/95 dark:border-cyan-500/40 dark:text-slate-100 shadow-2xl relative overflow-hidden backdrop-blur-md transition-colors duration-200">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

          {/* Drill-down Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800/80 gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5">
                <Server className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {activeDrillDownNode.name}
                  </h2>
                  <StatusBadge status={activeDrillDownNode.status} size="md" />
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                    {activeDrillDownNode.role}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                  <span>Host: <strong className="text-slate-800 dark:text-slate-200">{activeDrillDownNode.hostname}</strong></span>
                  <span>•</span>
                  <span>IP: <strong className="text-cyan-600 dark:text-cyan-400">{activeDrillDownNode.ip}</strong></span>
                  <span>•</span>
                  <span>Region: <strong className="text-slate-800 dark:text-slate-200">{activeDrillDownNode.region}</strong></span>
                  <span>•</span>
                  <span>Uptime: <strong className="text-emerald-600 dark:text-emerald-400">{activeDrillDownNode.uptime}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Round-Trip Latency: <strong className="text-cyan-600 dark:text-cyan-400">{activeDrillDownNode.latencyMs}ms</strong>
              </span>
              {selectedNodeId !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedNodeId('all')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 transition-colors"
                >
                  Unfocus
                </button>
              )}
            </div>
          </div>

          {/* Drill-down Sub-Panels: Per-Core CPU Matrix, RAM Breakdown, Container Health Card */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Per-Core CPU Matrix */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 transition-colors duration-200">
                <CoreMatrix
                  coreCount={activeDrillDownNode.cores}
                  title={`Per-Core Compute Matrix (${activeDrillDownNode.cores} Dedicated Cores)`}
                />
              </div>

              {/* 2. RAM Breakdown Bar */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 space-y-3 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Memory Allocation Breakdown</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {ramBreakdown.usedGb} / {ramBreakdown.totalGb} GB Used ({activeDrillDownNode.memory}%)
                  </span>
                </div>

                {/* Multi-segment RAM bar */}
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-300 dark:border-slate-800">
                  <div 
                    className="h-full bg-blue-500 rounded-l transition-all duration-500"
                    style={{ width: `${(ramBreakdown.usedGb / ramBreakdown.totalGb) * 100}%` }}
                    title={`Used: ${ramBreakdown.usedGb} GB`}
                  />
                  <div 
                    className="h-full bg-cyan-400 transition-all duration-500"
                    style={{ width: `${(ramBreakdown.cachedGb / ramBreakdown.totalGb) * 100}%` }}
                    title={`Cached: ${ramBreakdown.cachedGb} GB`}
                  />
                  <div 
                    className="h-full bg-slate-400 dark:bg-slate-800 rounded-r"
                    style={{ width: `${(ramBreakdown.freeGb / ramBreakdown.totalGb) * 100}%` }}
                    title={`Free: ${ramBreakdown.freeGb} GB`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Used: {ramBreakdown.usedGb} GB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span>Cached/Buffers: {ramBreakdown.cachedGb} GB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-700" />
                    <span>Available Free: {ramBreakdown.freeGb} GB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Container Health Card */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 flex flex-col justify-between space-y-4 transition-colors duration-200">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Container Health Score</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    containerStats.score >= 85 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                    containerStats.score >= 60 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                    'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  }`}>
                    {containerStats.score >= 85 ? 'OPTIMAL' : containerStats.score >= 60 ? 'DEGRADED' : 'UNHEALTHY'}
                  </span>
                </div>

                {/* Score Big Meter */}
                <div className="my-5 text-center">
                  <div className="inline-flex items-baseline justify-center gap-1">
                    <span className={`text-4xl font-extrabold font-mono tracking-tight ${
                      containerStats.score >= 85 ? 'text-emerald-600 dark:text-emerald-400' :
                      containerStats.score >= 60 ? 'text-amber-600 dark:text-amber-400' :
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      {containerStats.score}
                    </span>
                    <span className="text-base font-bold text-slate-400 dark:text-slate-500 font-mono">/100</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Calculated via active container lifecycle & failure penalties
                  </p>
                </div>

                {/* Running vs Failed breakdown */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg bg-white border border-slate-200 dark:bg-slate-950/80 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Running Containers:
                    </span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{containerStats.running}</strong>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200 dark:bg-slate-950/80 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Failed / CrashLoop:
                    </span>
                    <strong className={containerStats.failed > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400 font-bold'}>
                      {containerStats.failed}
                    </strong>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200 dark:bg-slate-950/80 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-600 dark:text-slate-400">Total Pod Capacity:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{containerStats.total}</strong>
                  </div>
                </div>
              </div>

              {/* Tags and OS info */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span className="block mb-1.5 text-slate-500">Configured Node Tags:</span>
                <div className="flex flex-wrap gap-1">
                  {activeDrillDownNode.tags.map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explorer Section: List / Grid View of All Registered Nodes */}
      {filteredNodes.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No Server Nodes Found"
          description="No servers matched your current filter or search criteria. Try adjusting filters or registering a new node."
          actionText="Clear Filters"
          onAction={() => {
            setRoleFilter('all');
            setStatusFilter('all');
            setLocalSearch('');
          }}
        />
      ) : viewMode === 'grid' ? (
        /* Grid Explorer */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(isSelected ? 'all' : node.id)}
                className={`flex flex-col justify-between p-5 rounded-2xl border transition-colors duration-200 cursor-pointer shadow-md ${
                  isSelected
                    ? 'bg-cyan-50/70 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/50 dark:bg-[#101c36] dark:border-cyan-500'
                    : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50/70 dark:bg-[#0b1222]/90 dark:border-slate-800/90 dark:hover:border-slate-700 dark:hover:bg-[#0e172e] dark:text-slate-100'
                }`}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{node.name}</h3>
                      <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 truncate mt-0.5">{node.hostname}</div>
                    </div>
                    <StatusBadge status={node.status} size="sm" />
                  </div>

                  {/* Sub info */}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/80 dark:text-slate-400 dark:border-slate-800/80 px-2 py-0.5 rounded-md border">{node.ip}</span>
                    <span className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/80 dark:text-slate-400 dark:border-slate-800/80 px-2 py-0.5 rounded-md border">{node.region}</span>
                    <span className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800/80 px-2 py-0.5 rounded-md border uppercase font-semibold">{node.role}</span>
                  </div>

                  {/* Metrics bars */}
                  <div className="mt-5 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-medium font-mono">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-sans">
                          <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> CPU Load ({node.cores} Cores)
                        </span>
                        <span className={`font-bold ${node.cpu > 85 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {node.cpu}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${node.cpu > 85 ? 'bg-rose-500' : node.cpu > 70 ? 'bg-amber-400' : 'bg-cyan-500'}`}
                          style={{ width: `${node.cpu}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1 font-medium font-mono">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-sans">
                          <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> RAM ({node.totalMemoryGb} GB)
                        </span>
                        <span className={`font-bold ${node.memory > 85 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {node.memory}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${node.memory > 85 ? 'bg-rose-500' : node.memory > 70 ? 'bg-amber-400' : 'bg-blue-500'}`}
                          style={{ width: `${node.memory}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1 font-medium font-mono">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-sans">
                          <HardDrive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Disk Volume
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold">{node.disk}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${node.disk}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-1">
                    {node.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/80 dark:text-slate-400 dark:border-slate-800 px-2 py-0.5 rounded-md border flex items-center gap-1 font-mono">
                        <Tag className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Uptime: {node.uptime}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(isSelected ? 'all' : node.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isSelected ? 'Focused ✓' : 'Inspect Vitals'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Explorer Table */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800/90 dark:bg-[#0b1222]/90 overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 dark:bg-[#0e162a] dark:border-slate-800 dark:text-slate-400 font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Node Name & Host</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Region / IP</th>
                  <th className="py-3 px-4 font-semibold">CPU</th>
                  <th className="py-3 px-4 font-semibold">RAM</th>
                  <th className="py-3 px-4 font-semibold">Latency</th>
                  <th className="py-3 px-4 font-semibold">Uptime</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {filteredNodes.map(node => {
                  const isSelected = selectedNodeId === node.id;
                  return (
                    <tr
                      key={node.id}
                      onClick={() => setSelectedNodeId(isSelected ? 'all' : node.id)}
                      className={`hover:bg-slate-50 dark:hover:bg-[#121c36] transition-colors cursor-pointer ${
                        isSelected ? 'bg-cyan-50/70 dark:bg-[#101c36]' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{node.name}</div>
                        <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">{node.hostname}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={node.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 uppercase font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {node.role}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        <div>{node.region}</div>
                        <div className="text-[11px] text-slate-500">{node.ip}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={`font-bold ${node.cpu > 85 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {node.cpu}%
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">({node.cores}c)</span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={`font-bold ${node.memory > 85 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {node.memory}%
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">({node.totalMemoryGb}GB)</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                        {node.latencyMs}ms
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {node.uptime}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(isSelected ? 'all' : node.id);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {isSelected ? 'Focused ✓' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register New Node Modal */}
      <RegisterNodeModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegister={handleRegisterNode}
      />
    </div>
  );
};

export default NodesView;
