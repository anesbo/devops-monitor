import React, { useState } from 'react';
import { Terminal, Search, Trash2, Download, Filter } from 'lucide-react';
import { useServerState } from '../../context/ServerContext';
import { LogEntry, LogLevel } from '../../types';

export const LogsView: React.FC = () => {
  const { logs, selectedNodeId, selectedNode } = useServerState();
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const filteredLogs = logs.filter(log => {
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSearch = searchFilter === '' ||
      log.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
      log.service.toLowerCase().includes(searchFilter.toLowerCase()) ||
      log.nodeName.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesLevel && matchesSearch;
  });

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
    <div className="space-y-4">
      {/* Log Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#0d1628]/90 border border-slate-800 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Live Cluster Telemetry Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {selectedNode ? `Showing stream from ${selectedNode.name}` : 'Streaming unified container and node daemon logs'}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search in logs */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Grep logs (pattern/service)..."
              className="w-full bg-[#111a2e] text-slate-200 placeholder-slate-400 text-xs rounded-lg pl-9 pr-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500/60 font-mono"
            />
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-[#111a2e] text-slate-300 text-xs rounded-lg px-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500/60 font-mono"
          >
            <option value="all">ALL LEVELS</option>
            <option value="error">ERROR</option>
            <option value="warn">WARN</option>
            <option value="info">INFO</option>
            <option value="debug">DEBUG</option>
          </select>
        </div>
      </div>

      {/* Terminal Display Screen */}
      <div className="rounded-xl border border-slate-800/90 bg-[#060a12] shadow-2xl overflow-hidden font-mono text-xs">
        {/* Terminal Titlebar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0b101c] border-b border-slate-800 text-slate-400 select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-[11px] font-semibold text-slate-300">
              apexpulse-telemetry-stdout — live buffer ({filteredLogs.length} entries)
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              TAIL STREAM
            </span>
          </div>
        </div>

        {/* Logs Lines Area */}
        <div className="p-4 space-y-1.5 max-h-[560px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-400 py-12 text-center">
              No log messages matching filter criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start gap-3 py-1 px-2 rounded hover:bg-slate-900/60 transition-colors group"
              >
                <span className="text-slate-400 shrink-0 select-none">
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
        </div>
      </div>
    </div>
  );
};
