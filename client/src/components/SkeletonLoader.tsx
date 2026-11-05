import React from 'react';
import { Server, Inbox, Activity, ShieldAlert, Cpu } from 'lucide-react';

export const ShimmerCard: React.FC<{ className?: string; height?: string }> = ({ 
  className = '', 
  height = 'h-32' 
}) => {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 ${height} ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-700/10 to-transparent" />
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-24 bg-slate-800 rounded animate-pulse" />
        <div className="h-6 w-6 bg-slate-800 rounded-lg animate-pulse" />
      </div>
      <div className="h-8 w-32 bg-slate-800/80 rounded mb-3 animate-pulse" />
      <div className="h-2 w-full bg-slate-800/60 rounded animate-pulse" />
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ columns?: number; rows?: number }> = ({ 
  columns = 5, 
  rows = 4 
}) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div 
          key={rIdx} 
          className="flex items-center gap-4 p-4 rounded-lg bg-slate-900/30 border border-slate-800/40 animate-pulse"
        >
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div 
              key={cIdx} 
              className={`h-3.5 bg-slate-800 rounded ${cIdx === 0 ? 'w-1/4' : cIdx === 1 ? 'w-1/6' : 'flex-1'}`} 
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const SparklineSkeleton: React.FC<{ height?: number }> = ({ height = 140 }) => {
  return (
    <div 
      className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 flex flex-col justify-between"
      style={{ height }}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-36 bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="w-full flex items-end gap-1.5 h-1/2 pt-4">
        {Array.from({ length: 24 }).map((_, idx) => (
          <div 
            key={idx}
            className="flex-1 bg-slate-800/60 rounded-t animate-pulse"
            style={{ height: `${20 + (idx % 7) * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ElementType;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-xl border border-slate-800/80 bg-slate-950/40 ${className}`}>
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner mb-4 text-slate-400">
        <Icon className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-bold text-slate-200 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-semibold transition-all shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
