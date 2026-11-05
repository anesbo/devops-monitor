import React from 'react';
import { 
  Activity, 
  Server, 
  AlertTriangle, 
  Terminal, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Database, 
  Cpu, 
  HardDrive, 
  ShieldCheck,
  Radio
} from 'lucide-react';
import { useServerState } from '../../context/ServerContext';
import { ViewTab, ServerNode } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedNodeId,
    setSelectedNodeId,
    nodes,
    activeIncidentsCount,
    unreadIncidentsCount,
    isSidebarCollapsed,
    toggleSidebar,
    telemetry
  } = useServerState();

  const navItems: { tab: ViewTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      tab: 'overview',
      label: 'Cluster Overview',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      tab: 'nodes',
      label: 'Fleet Nodes',
      icon: <Server className="w-5 h-5" />,
      badge: nodes.length,
      badgeColor: 'bg-slate-700 text-slate-300'
    },
    {
      tab: 'alerts',
      label: 'Incidents & Alerts',
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
      badgeColor: telemetry.criticalCount > 0 
        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold' 
        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold'
    },
    {
      tab: 'logs',
      label: 'Telemetry Logs',
      icon: <Terminal className="w-5 h-5" />,
    },
  ];

  const getNodeRoleIcon = (role: ServerNode['role']) => {
    switch (role) {
      case 'gateway': return <Radio className="w-3.5 h-3.5 text-cyan-400" />;
      case 'database': return <Database className="w-3.5 h-3.5 text-amber-400" />;
      case 'worker': return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
      case 'cache': return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
      case 'storage': return <HardDrive className="w-3.5 h-3.5 text-purple-400" />;
      default: return <Server className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: ServerNode['status']) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-400 shadow-emerald-400/50';
      case 'warning': return 'bg-amber-400 shadow-amber-400/50';
      case 'critical': return 'bg-rose-500 shadow-rose-500/50 animate-pulse';
      case 'offline': return 'bg-slate-500';
    }
  };

  return (
    <aside
      className={`relative flex flex-col bg-[#0c1322] border-r border-slate-800/80 transition-all duration-300 ease-in-out z-30 select-none ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800/80 justify-between">
        <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-emerald-400 shadow-lg shadow-cyan-500/20 text-white shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0c1322]" />
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
                ApexPulse
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-400">
                Observability Fleet
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="py-4 px-3 space-y-1">
        <div className={`px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
          Navigation
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              } ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {item.icon}
                </span>
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </div>

              {!isSidebarCollapsed && item.badge !== undefined && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                  {item.badge}
                </span>
              )}

              {isSidebarCollapsed && item.badge !== undefined && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Node Quick Selector Section */}
      <div className="flex-1 flex flex-col min-h-0 px-3 py-2 border-t border-slate-800/60 overflow-hidden">
        <div className={`flex items-center justify-between px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${isSidebarCollapsed ? 'hidden' : 'flex'}`}>
          <span>Quick Node Target</span>
          <span className="text-[10px] font-mono text-cyan-400/80">{nodes.length} online</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-1">
          {/* Option for ALL NODES */}
          <button
            onClick={() => setSelectedNodeId('all')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedNodeId === 'all'
                ? 'bg-slate-800/90 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent'
            } ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title="All Cluster Nodes"
          >
            <ShieldCheck className={`w-4 h-4 shrink-0 ${selectedNodeId === 'all' ? 'text-cyan-400' : 'text-slate-500'}`} />
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between w-full truncate">
                <span className="truncate">Entire Cluster (All)</span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">mesh</span>
              </div>
            )}
          </button>

          {/* Individual nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <button
                key={node.id}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  if (activeTab === 'overview') {
                    // keep on overview or toggle as preferred
                  }
                }}
                title={`${node.name} (${node.region}) - ${node.latencyMs}ms`}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 text-white border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50 border border-transparent'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(node.status)} shadow-sm`} />
                </div>

                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between w-full min-w-0">
                    <div className="flex flex-col text-left truncate mr-2">
                      <span className="font-medium text-slate-200 truncate">{node.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 truncate">{node.role} • {node.ip}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[10px] font-mono font-semibold text-slate-400">{node.latencyMs}ms</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapse Toggle & Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-[#090e1a]/60">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-slate-800/80 transition-all"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>

        {!isSidebarCollapsed && (
          <div className="mt-2 text-center">
            <span className="text-[10px] font-mono text-slate-400">
              v2.4.0 • Cluster Sync Active
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
