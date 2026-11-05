import React from 'react';

export type SystemStatus =
  | 'online'
  | 'degraded'
  | 'critical'
  | 'offline'
  | 'healthy'
  | 'warning'
  | 'error'
  | 'optimal'
  | string;

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  status: SystemStatus;
  size?: BadgeSize;
  showPulse?: boolean;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

interface StatusTheme {
  label: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  dotColor: string;
  pingColor: string;
  glowShadow: string;
}

const STATUS_THEMES: Record<string, StatusTheme> = {
  online: {
    label: 'ONLINE',
    badgeBg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    pingColor: 'bg-emerald-400',
    glowShadow: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]',
  },
  healthy: {
    label: 'HEALTHY',
    badgeBg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    pingColor: 'bg-emerald-400',
    glowShadow: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]',
  },
  optimal: {
    label: 'OPTIMAL',
    badgeBg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    pingColor: 'bg-emerald-400',
    glowShadow: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]',
  },
  degraded: {
    label: 'DEGRADED',
    badgeBg: 'bg-amber-500/10 hover:bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-400',
    pingColor: 'bg-amber-400',
    glowShadow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  },
  warning: {
    label: 'WARNING',
    badgeBg: 'bg-amber-500/10 hover:bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-400',
    pingColor: 'bg-amber-400',
    glowShadow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  },
  critical: {
    label: 'CRITICAL',
    badgeBg: 'bg-rose-500/10 hover:bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
    textColor: 'text-rose-400',
    dotColor: 'bg-rose-400',
    pingColor: 'bg-rose-400',
    glowShadow: 'shadow-[0_0_14px_rgba(244,63,94,0.3)]',
  },
  error: {
    label: 'ERROR',
    badgeBg: 'bg-rose-500/10 hover:bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
    textColor: 'text-rose-400',
    dotColor: 'bg-rose-400',
    pingColor: 'bg-rose-400',
    glowShadow: 'shadow-[0_0_14px_rgba(244,63,94,0.3)]',
  },
  offline: {
    label: 'OFFLINE',
    badgeBg: 'bg-slate-800/60 hover:bg-slate-800/80',
    badgeBorder: 'border-slate-700/60',
    textColor: 'text-slate-400',
    dotColor: 'bg-slate-500',
    pingColor: 'transparent',
    glowShadow: 'shadow-none',
  },
};

const SIZE_STYLES: Record<BadgeSize, { badge: string; dot: string; ping: string; text: string }> = {
  sm: {
    badge: 'px-2 py-0.5 gap-1.5',
    dot: 'w-1.5 h-1.5',
    ping: 'w-1.5 h-1.5',
    text: 'text-[10px] tracking-wider',
  },
  md: {
    badge: 'px-2.5 py-1 gap-2',
    dot: 'w-2 h-2',
    ping: 'w-2 h-2',
    text: 'text-xs tracking-wider',
  },
  lg: {
    badge: 'px-3.5 py-1.5 gap-2.5',
    dot: 'w-2.5 h-2.5',
    ping: 'w-2.5 h-2.5',
    text: 'text-sm tracking-wide',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showPulse = true,
  label,
  className = '',
}) => {
  const normalizedKey = status.toLowerCase().trim();
  const theme = STATUS_THEMES[normalizedKey] || STATUS_THEMES.offline;
  const sizeStyle = SIZE_STYLES[size];

  const displayLabel = label ?? theme.label;
  const isPulsing = showPulse && normalizedKey !== 'offline';

  return (
    <span
      className={`inline-flex items-center justify-center font-medium font-mono rounded-full border transition-all duration-200 select-none backdrop-blur-sm ${theme.badgeBg} ${theme.badgeBorder} ${theme.textColor} ${theme.glowShadow} ${sizeStyle.badge} ${sizeStyle.text} ${className}`}
    >
      {/* Animated pulsing dot indicator */}
      <span className="relative flex items-center justify-center shrink-0">
        {isPulsing && (
          <span
            className={`absolute inline-flex rounded-full opacity-75 animate-ping duration-1000 ${sizeStyle.ping} ${theme.pingColor}`}
          />
        )}
        <span className={`relative inline-flex rounded-full shrink-0 ${sizeStyle.dot} ${theme.dotColor}`} />
      </span>

      {/* Label text */}
      <span className="font-semibold leading-none">{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
