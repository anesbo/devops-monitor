import React, { useMemo, useState } from 'react';
import { Cpu, Flame, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface CoreData {
  id: number;
  load: number; // 0 to 100
  temp?: number; // Optional temperature in °C
  frequencyGhz?: number;
}

export interface CoreMatrixProps {
  cores?: number[] | CoreData[];
  coreCount?: number;
  title?: string;
  className?: string;
  onCoreSelect?: (coreIndex: number) => void;
  selectedCore?: number | null;
  compact?: boolean;
}

// Generate realistic mock cores if none supplied
const generateFallbackCores = (count: number = 16): CoreData[] => {
  return Array.from({ length: count }, (_, idx) => {
    // Generate realistic variance across cores
    const base = 25 + Math.sin(idx * 0.8) * 20;
    const isHot = idx === 3 || idx === 11;
    const load = Math.min(99, Math.max(5, Math.round(isHot ? 88 + Math.random() * 9 : base + Math.random() * 15)));
    const temp = Math.round(42 + (load / 100) * 44);
    const frequencyGhz = Number((2.8 + (load / 100) * 1.8).toFixed(2));
    return { id: idx, load, temp, frequencyGhz };
  });
};

interface HeatColorLevel {
  bg: string;
  border: string;
  text: string;
  barColor: string;
  glow: string;
  label: string;
  isCritical: boolean;
}

const getHeatLevel = (load: number): HeatColorLevel => {
  if (load >= 85) {
    return {
      bg: 'bg-rose-500/15 hover:bg-rose-500/25',
      border: 'border-rose-500/40 hover:border-rose-400',
      text: 'text-rose-400',
      barColor: 'bg-rose-500',
      glow: 'shadow-[0_0_12px_rgba(244,63,94,0.35)]',
      label: 'Critical',
      isCritical: true,
    };
  }
  if (load >= 65) {
    return {
      bg: 'bg-orange-500/15 hover:bg-orange-500/25',
      border: 'border-orange-500/35 hover:border-orange-400',
      text: 'text-orange-400',
      barColor: 'bg-orange-500',
      glow: 'shadow-[0_0_10px_rgba(249,115,22,0.25)]',
      label: 'High',
      isCritical: false,
    };
  }
  if (load >= 40) {
    return {
      bg: 'bg-amber-500/10 hover:bg-amber-500/20',
      border: 'border-amber-500/30 hover:border-amber-400',
      text: 'text-amber-400',
      barColor: 'bg-amber-400',
      glow: 'shadow-none',
      label: 'Moderate',
      isCritical: false,
    };
  }
  return {
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    border: 'border-emerald-500/25 hover:border-emerald-400',
    text: 'text-emerald-400',
    barColor: 'bg-emerald-400',
    glow: 'shadow-none',
    label: 'Optimal',
    isCritical: false,
  };
};

export const CoreMatrix: React.FC<CoreMatrixProps> = ({
  cores: inputCores,
  coreCount = 16,
  title = 'Per-Core CPU Heat Matrix',
  className = '',
  onCoreSelect,
  selectedCore: controlledSelectedCore,
  compact = false,
}) => {
  const [internalSelectedCore, setInternalSelectedCore] = useState<number | null>(null);
  const activeSelected = controlledSelectedCore !== undefined ? controlledSelectedCore : internalSelectedCore;

  // Normalized core list
  const normalizedCores: CoreData[] = useMemo(() => {
    if (!inputCores || inputCores.length === 0) {
      return generateFallbackCores(coreCount);
    }
    return inputCores.map((item, idx) => {
      if (typeof item === 'number') {
        const load = Math.min(100, Math.max(0, Math.round(item)));
        return {
          id: idx,
          load,
          temp: Math.round(38 + (load / 100) * 45),
          frequencyGhz: Number((2.6 + (load / 100) * 2.0).toFixed(2)),
        };
      }
      return {
        id: item.id ?? idx,
        load: Math.min(100, Math.max(0, Math.round(item.load))),
        temp: item.temp ?? Math.round(38 + (item.load / 100) * 45),
        frequencyGhz: item.frequencyGhz ?? Number((2.6 + (item.load / 100) * 2.0).toFixed(2)),
      };
    });
  }, [inputCores, coreCount]);

  // Matrix Summary Statistics
  const { avgLoad, maxCore, minCore, distribution } = useMemo(() => {
    if (normalizedCores.length === 0) {
      return {
        avgLoad: 0,
        maxCore: null,
        minCore: null,
        distribution: { optimal: 0, moderate: 0, high: 0, critical: 0 },
      };
    }

    let total = 0;
    let max = normalizedCores[0];
    let min = normalizedCores[0];
    const dist = { optimal: 0, moderate: 0, high: 0, critical: 0 };

    normalizedCores.forEach((c) => {
      total += c.load;
      if (c.load > max.load) max = c;
      if (c.load < min.load) min = c;

      if (c.load >= 85) dist.critical++;
      else if (c.load >= 65) dist.high++;
      else if (c.load >= 40) dist.moderate++;
      else dist.optimal++;
    });

    return {
      avgLoad: Math.round(total / normalizedCores.length),
      maxCore: max,
      minCore: min,
      distribution: dist,
    };
  }, [normalizedCores]);

  const handleCoreClick = (coreId: number) => {
    setInternalSelectedCore((prev) => (prev === coreId ? null : coreId));
    if (onCoreSelect) {
      onCoreSelect(coreId);
    }
  };

  return (
    <div className={`flex flex-col w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-2xl backdrop-blur-md ${className}`}>
      {/* Header & High-Level Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <span>{title}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300">
                {normalizedCores.length} Cores
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Average Cluster Load: <span className="font-bold text-slate-200">{avgLoad}%</span>
            </p>
          </div>
        </div>

        {/* Heat Distribution Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          {distribution.critical > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold animate-pulse">
              <Flame className="w-3 h-3 text-rose-400" />
              {distribution.critical} Critical (&gt;85%)
            </span>
          )}
          {distribution.high > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-orange-300">
              {distribution.high} High
            </span>
          )}
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            {distribution.optimal} Optimal
          </span>
        </div>
      </div>

      {/* Grid of CPU Cores */}
      <div
        className={`grid gap-2 mt-4 transition-all ${
          compact
            ? 'grid-cols-4 sm:grid-cols-8 md:grid-cols-12'
            : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-8'
        }`}
      >
        {normalizedCores.map((core) => {
          const heat = getHeatLevel(core.load);
          const isSelected = activeSelected === core.id;

          return (
            <button
              key={core.id}
              type="button"
              onClick={() => handleCoreClick(core.id)}
              className={`relative flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-200 text-left select-none group ${
                heat.bg
              } ${heat.border} ${heat.glow} ${
                isSelected
                  ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 scale-[1.03] z-10'
                  : 'hover:scale-[1.02]'
              }`}
            >
              {/* Critical pulsating badge */}
              {heat.isCritical && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </span>
              )}

              {/* Core Index & Temp */}
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 group-hover:text-slate-200">
                  C{core.id < 10 ? `0${core.id}` : core.id}
                </span>
                {core.temp && (
                  <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-300">
                    {core.temp}°C
                  </span>
                )}
              </div>

              {/* Core Load Display */}
              <div className="flex items-baseline justify-between my-0.5">
                <span className={`text-sm font-bold font-mono tracking-tight ${heat.text}`}>
                  {core.load}%
                </span>
                {core.frequencyGhz && !compact && (
                  <span className="text-[9px] font-mono text-slate-500">
                    {core.frequencyGhz}GHz
                  </span>
                )}
              </div>

              {/* Mini Heat Progress Bar */}
              <div className="w-full bg-slate-950/60 rounded-full h-1.5 overflow-hidden mt-1 border border-slate-800/60">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${heat.barColor}`}
                  style={{ width: `${core.load}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info: Hottest & Coolest Core */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          {maxCore && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Peak Load:</span>
              <span className="text-rose-400 font-bold">
                Core #{maxCore.id} ({maxCore.load}%)
              </span>
            </div>
          )}
          {minCore && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Lowest Load:</span>
              <span className="text-emerald-400 font-bold">
                Core #{minCore.id} ({minCore.load}%)
              </span>
            </div>
          )}
        </div>

        {activeSelected !== null && (
          <div className="flex items-center gap-2 text-cyan-300 bg-cyan-950/50 px-2.5 py-0.5 rounded border border-cyan-800/50">
            <Zap className="w-3.5 h-3.5" />
            <span>Focused Core #{activeSelected}</span>
            <button
              type="button"
              onClick={() => handleCoreClick(activeSelected)}
              className="text-slate-400 hover:text-white text-xs ml-1"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoreMatrix;
