import React, { useState } from 'react';
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
  AlertOctagon
} from 'lucide-react';
import { useServerState } from '../../context/ServerContext';
import { ServerNode, NodeStatus, NodeRole } from '../../types';
import { StatusBadge, CoreMatrix } from '../index';

export const NodesView: React.FC = () => {
  const { nodes, selectedNodeId, setSelectedNodeId } = useServerState();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>('');

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const filteredNodes = nodes.filter(node => {
    const matchesRole = roleFilter === 'all' || node.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || node.status === statusFilter;
    const matchesSearch = localSearch === '' || 
      node.name.toLowerCase().includes(localSearch.toLowerCase()) ||
      node.hostname.toLowerCase().includes(localSearch.toLowerCase()) ||
      node.ip.includes(localSearch) ||
      node.tags.some(t => t.toLowerCase().includes(localSearch.toLowerCase()));
    return matchesRole && matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: NodeStatus) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'critical': return <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />;
      case 'offline': return <Server className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-[#0d1628]/90 border border-slate-800 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            Infrastructure Fleet Nodes ({filteredNodes.length} of {nodes.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status, hardware capacity, and health checks across hybrid cloud clusters
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter by name, ip, tag..."
              className="w-full bg-[#111a2e] text-slate-200 placeholder-slate-400 text-xs rounded-lg pl-9 pr-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#111a2e] text-slate-300 text-xs rounded-lg px-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="all">All Roles</option>
            <option value="gateway">Gateway</option>
            <option value="worker">Worker</option>
            <option value="database">Database</option>
            <option value="cache">Cache</option>
            <option value="storage">Storage</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111a2e] text-slate-300 text-xs rounded-lg px-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning / Degraded</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Selected Node Per-Core Matrix */}
      {selectedNode && (
        <CoreMatrix
          coreCount={selectedNode.cores}
          title={`Per-Core Telemetry: ${selectedNode.name} (${selectedNode.hostname} • ${selectedNode.cores} Cores)`}
        />
      )}

      {/* Node Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredNodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          return (
            <div
              key={node.id}
              className={`flex flex-col justify-between p-5 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-[#101c36] border-cyan-500 shadow-lg shadow-cyan-900/20'
                  : 'bg-[#0d1628]/90 border-slate-800 hover:border-slate-700/80 hover:bg-[#101b33]'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-bold text-slate-100 text-base truncate">{node.name}</h3>
                    <div className="text-[11px] font-mono text-cyan-400 truncate mt-0.5">{node.hostname}</div>
                  </div>
                  <StatusBadge status={node.status} size="sm" />
                </div>

                {/* Sub info */}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400 font-mono">
                  <span className="bg-slate-900/70 px-2 py-0.5 rounded border border-slate-800/80">{node.ip}</span>
                  <span className="bg-slate-900/70 px-2 py-0.5 rounded border border-slate-800/80">{node.region}</span>
                  <span className="bg-slate-900/70 px-2 py-0.5 rounded border border-slate-800/80 capitalize">{node.role}</span>
                </div>

                {/* Metrics bars */}
                <div className="mt-5 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-medium">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU Load ({node.cores} Cores)
                      </span>
                      <span className="text-slate-200 font-mono font-bold">{node.cpu}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${node.cpu > 85 ? 'bg-rose-500' : node.cpu > 70 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                        style={{ width: `${node.cpu}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 font-medium">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-400" /> RAM ({node.totalMemoryGb} GB)
                      </span>
                      <span className="text-slate-200 font-mono font-bold">{node.memory}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${node.memory > 85 ? 'bg-rose-500' : node.memory > 70 ? 'bg-amber-400' : 'bg-blue-400'}`}
                        style={{ width: `${node.memory}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 font-medium">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Disk Volume
                      </span>
                      <span className="text-slate-200 font-mono font-bold">{node.disk}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${node.disk}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-1">
                  {node.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" /> {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom footer button */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Uptime: {node.uptime}</span>
                <button
                  onClick={() => setSelectedNodeId(isSelected ? 'all' : node.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {isSelected ? 'Focused ✓' : 'Inspect Node'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
