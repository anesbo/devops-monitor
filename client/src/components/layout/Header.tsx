import React, { useState } from 'react';
import { 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Clock, 
  Globe, 
  SlidersHorizontal,
  Bell
} from 'lucide-react';
import { useServerState } from '../../context/ServerContext';
import { TimeRange } from '../../types';
import { ThemeToggle } from '../ThemeToggle';

export const Header: React.FC = () => {
  const {
    telemetry,
    timeRange,
    setTimeRange,
    isPolling,
    togglePolling,
    pollingInterval,
    setPollingInterval,
    lastRefreshed,
    manualRefresh,
    selectedNode,
    searchQuery,
    setSearchQuery,
    activeIncidentsCount,
    setActiveTab,
  } = useServerState();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showIntervalMenu, setShowIntervalMenu] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await manualRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const timeRanges: TimeRange[] = ['5m', '15m', '1h', '24h'];

  const getHealthBadge = () => {
    if (telemetry.criticalCount > 0) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <AlertOctagon className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
          <span>{telemetry.criticalCount} CRITICAL {telemetry.criticalCount > 1 ? 'NODES' : 'NODE'}</span>
        </div>
      );
    }
    if (telemetry.warningCount > 0) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span>{telemetry.warningCount} DEGRADED {telemetry.warningCount > 1 ? 'NODES' : 'NODE'}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
        <span>ALL SYSTEMS OPERATIONAL</span>
      </div>
    );
  };

  return (
    <header className="h-16 bg-white/90 border-b border-slate-200 text-slate-800 dark:bg-[#0c1322]/90 dark:border-slate-800/80 dark:text-slate-100 px-6 flex items-center justify-between z-20 sticky top-0 transition-colors duration-200 backdrop-blur-md">
      {/* Left side: Context badge & Cluster Health Status */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Selected target indicator */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-slate-500 dark:text-slate-400">Target:</span>
          <span className="font-semibold text-slate-900 bg-slate-100 border border-slate-200 dark:text-slate-100 dark:bg-slate-800/80 dark:border-slate-700/60 px-2 py-0.5 rounded truncate max-w-[180px]">
            {selectedNode ? selectedNode.name : 'Entire Cluster'}
          </span>
          {selectedNode && (
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400/90 hidden sm:inline">
              ({selectedNode.ip})
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

        {/* Global Cluster Health Badge */}
        <div className="hidden lg:block">
          {getHealthBadge()}
        </div>
      </div>

      {/* Middle: Universal Search */}
      <div className="relative max-w-xs w-full mx-4 hidden xl:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes, metrics, logs..."
            className="w-full bg-slate-100 text-slate-900 placeholder-slate-400 text-xs rounded-lg pl-9 pr-8 py-2 border border-slate-200 dark:bg-[#111a2e] dark:text-slate-200 dark:border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right side: Time Range, Live Auto-refresh switch, Refresh Button, Theme Toggle, Alerts */}
      <div className="flex items-center gap-3">
        {/* Time range selector */}
        <div className="flex items-center bg-slate-100 border border-slate-200 dark:bg-[#111a2e] dark:border-slate-800 rounded-lg p-0.5 text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 hidden sm:block" />
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                timeRange === range
                  ? 'bg-white text-cyan-700 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-300 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Live Auto-Refresh Switch with pulsing heartbeat */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 dark:bg-[#111a2e] dark:border-slate-800 rounded-lg px-2.5 py-1">
          <button
            onClick={togglePolling}
            className={`flex items-center gap-2 text-xs font-medium transition-colors ${
              isPolling ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title={isPolling ? 'Live auto-refresh enabled' : 'Auto-refresh paused'}
          >
            {isPolling ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
            )}
            <span className="hidden sm:inline font-mono tracking-tight text-[11px]">
              {isPolling ? 'LIVE' : 'PAUSED'}
            </span>
          </button>

          {/* Quick polling interval selector */}
          <div className="relative">
            <button
              onClick={() => setShowIntervalMenu(!showIntervalMenu)}
              className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
              title="Polling Interval"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>

            {showIntervalMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-700/80 rounded-lg shadow-xl py-1 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  Sync Interval
                </div>
                {[1500, 2500, 5000, 10000].map(ms => (
                  <button
                    key={ms}
                    onClick={() => {
                      setPollingInterval(ms);
                      setShowIntervalMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      pollingInterval === ms ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {ms / 1000}s interval
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          title={`Last updated: ${lastRefreshed.toLocaleTimeString()}`}
          className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:text-cyan-600 border border-slate-200 hover:border-slate-300 dark:bg-[#111a2e] dark:text-slate-300 dark:hover:text-cyan-400 dark:border-slate-800 dark:hover:border-slate-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-500' : ''}`} />
        </button>

        {/* Theme Mode Toggle (Sun / Moon) */}
        <ThemeToggle variant="header" />

        {/* Incidents Pill Notification shortcut */}
        <button
          onClick={() => setActiveTab('alerts')}
          className="relative p-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-slate-300 dark:bg-[#111a2e] dark:text-slate-300 dark:hover:text-white dark:border-slate-800 dark:hover:border-slate-700 transition-all"
          title={`${activeIncidentsCount} active incidents`}
        >
          <Bell className="w-4 h-4" />
          {activeIncidentsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
              {activeIncidentsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
export default Header;
