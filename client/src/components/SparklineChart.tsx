import React, { useId, useMemo, useRef, useState } from 'react';

export type SparklineColor = 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple' | 'blue' | string;

export interface SparklinePoint {
  timestamp?: string | number;
  value: number;
}

export interface SparklineChartProps {
  data: Array<number | SparklinePoint>;
  color?: SparklineColor;
  height?: number;
  className?: string;
  unit?: string;
  label?: string;
  showMinMax?: boolean;
  showArea?: boolean;
  showCrosshair?: boolean;
  min?: number;
  max?: number;
  strokeWidth?: number;
  formatValue?: (val: number) => string;
}

const COLOR_MAP: Record<string, { stroke: string; fill: string; glow: string; text: string }> = {
  emerald: {
    stroke: '#10b981',
    fill: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    text: 'text-emerald-400',
  },
  amber: {
    stroke: '#f59e0b',
    fill: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.4)',
    text: 'text-amber-400',
  },
  rose: {
    stroke: '#f43f5e',
    fill: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.4)',
    text: 'text-rose-400',
  },
  cyan: {
    stroke: '#06b6d4',
    fill: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.4)',
    text: 'text-cyan-400',
  },
  purple: {
    stroke: '#a855f7',
    fill: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    text: 'text-purple-400',
  },
  blue: {
    stroke: '#3b82f6',
    fill: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.4)',
    text: 'text-blue-400',
  },
};

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color = 'cyan',
  height = 80,
  className = '',
  unit = '',
  label,
  showMinMax = true,
  showArea = true,
  showCrosshair = true,
  min: customMin,
  max: customMax,
  strokeWidth = 2,
  formatValue,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const gradientId = useId();

  // Color config resolution
  const colorConfig = useMemo(() => {
    if (COLOR_MAP[color]) {
      return COLOR_MAP[color];
    }
    return {
      stroke: color,
      fill: color,
      glow: `${color}66`,
      text: 'text-cyan-400',
    };
  }, [color]);

  // Normalize data points
  const normalizedData: SparklinePoint[] = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item, index) => {
      if (typeof item === 'number') {
        return { value: Number.isFinite(item) ? item : 0, timestamp: `Point ${index + 1}` };
      }
      return {
        value: Number.isFinite(item.value) ? item.value : 0,
        timestamp: item.timestamp ?? `Point ${index + 1}`,
      };
    });
  }, [data]);

  // Coordinate viewBox specs
  const viewBoxWidth = 400;
  const viewBoxHeight = height;
  const paddingX = 10;
  const paddingTop = 12;
  const paddingBottom = 12;
  const effectiveWidth = viewBoxWidth - paddingX * 2;
  const effectiveHeight = viewBoxHeight - paddingTop - paddingBottom;

  // Min, Max and Range calculation
  const { dataMin, dataMax, minIndex, maxIndex } = useMemo(() => {
    if (normalizedData.length === 0) {
      return { dataMin: 0, dataMax: 100, minIndex: -1, maxIndex: -1 };
    }
    let minVal = normalizedData[0].value;
    let maxVal = normalizedData[0].value;
    let minIdx = 0;
    let maxIdx = 0;

    normalizedData.forEach((pt, idx) => {
      if (pt.value < minVal) {
        minVal = pt.value;
        minIdx = idx;
      }
      if (pt.value > maxVal) {
        maxVal = pt.value;
        maxIdx = idx;
      }
    });

    const finalMin = customMin !== undefined ? customMin : minVal;
    const finalMax = customMax !== undefined ? customMax : maxVal;
    return {
      dataMin: finalMin,
      dataMax: finalMax === finalMin ? finalMin + 1 : finalMax,
      minIndex: minIdx,
      maxIndex: maxIdx,
    };
  }, [normalizedData, customMin, customMax]);

  // Convert points to SVG (x, y) coordinates
  const points = useMemo(() => {
    if (normalizedData.length === 0) return [];
    if (normalizedData.length === 1) {
      return [
        {
          x: viewBoxWidth / 2,
          y: viewBoxHeight / 2,
          raw: normalizedData[0],
        },
      ];
    }

    const range = dataMax - dataMin || 1;
    const stepX = effectiveWidth / (normalizedData.length - 1);

    return normalizedData.map((pt, i) => {
      const x = paddingX + i * stepX;
      // Invert Y since SVG (0,0) is top-left
      const normalizedY = (pt.value - dataMin) / range;
      const clampedY = Math.max(0, Math.min(1, normalizedY));
      const y = paddingTop + (1 - clampedY) * effectiveHeight;
      return { x, y, raw: pt };
    });
  }, [normalizedData, dataMin, dataMax, effectiveWidth, effectiveHeight]);

  // Generate Smooth Catmull-Rom cubic bezier SVG path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    if (points.length === 1) {
      return {
        linePath: `M ${points[0].x} ${points[0].y}`,
        areaPath: '',
      };
    }

    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      // Cubic control points with tension factor 1/6
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      let cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      let cp2y = p2.y - (p3.y - p1.y) / 6;

      // Soft clamp control points within bounding box
      cp1y = Math.max(paddingTop - 4, Math.min(viewBoxHeight - paddingBottom + 4, cp1y));
      cp2y = Math.max(paddingTop - 4, Math.min(viewBoxHeight - paddingBottom + 4, cp2y));

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    const baselineY = viewBoxHeight - paddingBottom + 8;
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const area = `${d} L ${lastPoint.x.toFixed(2)} ${baselineY} L ${firstPoint.x.toFixed(2)} ${baselineY} Z`;

    return { linePath: d, areaPath: area };
  }, [points, viewBoxHeight]);

  // Mouse move handler for responsive hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, mouseX / rect.width));
    const targetIdx = Math.round(fraction * (points.length - 1));

    setHoverIndex(targetIdx);
    setTooltipPos({
      x: mouseX,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setTooltipPos(null);
  };

  const hoveredPoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  const displayFormatter = (val: number): string => {
    if (formatValue) return formatValue(val);
    if (Number.isInteger(val)) return val.toString();
    return val.toFixed(1);
  };

  const formatTimestamp = (rawTs: string | number | undefined): string => {
    if (!rawTs) return '';
    if (typeof rawTs === 'number') {
      const d = new Date(rawTs > 1e11 ? rawTs : rawTs * 1000);
      return isNaN(d.getTime()) ? String(rawTs) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    // If it's an ISO timestamp
    if (rawTs.includes('T') || !isNaN(Date.parse(rawTs))) {
      const d = new Date(rawTs);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }
    return rawTs;
  };

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-slate-800/80 bg-slate-900/40 text-xs text-slate-500 ${className}`}
        style={{ height }}
      >
        No telemetry data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full select-none overflow-hidden rounded-lg bg-slate-950/40 p-1 group ${className}`}
      style={{ height }}
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Smooth vertical gradient fill */}
          <linearGradient id={`grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorConfig.fill} stopOpacity="0.38" />
            <stop offset="50%" stopColor={colorConfig.fill} stopOpacity="0.12" />
            <stop offset="100%" stopColor={colorConfig.fill} stopOpacity="0.01" />
          </linearGradient>

          {/* Glow filter for highlight points */}
          <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Subtle grid guidelines */}
        <line
          x1={paddingX}
          y1={paddingTop}
          x2={viewBoxWidth - paddingX}
          y2={paddingTop}
          stroke="#334155"
          strokeOpacity="0.25"
          strokeDasharray="2 4"
        />
        <line
          x1={paddingX}
          y1={viewBoxHeight - paddingBottom}
          x2={viewBoxWidth - paddingX}
          y2={viewBoxHeight - paddingBottom}
          stroke="#334155"
          strokeOpacity="0.35"
        />

        {/* Gradient Area Fill */}
        {showArea && areaPath && (
          <path
            d={areaPath}
            fill={`url(#grad-${gradientId})`}
            className="transition-opacity duration-300"
          />
        )}

        {/* Sparkline Cubic Bezier Curve */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={colorConfig.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
        )}

        {/* Min Point Marker */}
        {showMinMax && minIndex >= 0 && points[minIndex] && points.length > 2 && (
          <g>
            <circle
              cx={points[minIndex].x}
              cy={points[minIndex].y}
              r="3.5"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <circle
              cx={points[minIndex].x}
              cy={points[minIndex].y}
              r="1.5"
              fill="#38bdf8"
            />
          </g>
        )}

        {/* Max Point Marker */}
        {showMinMax && maxIndex >= 0 && points[maxIndex] && points.length > 2 && (
          <g filter={`url(#glow-${gradientId})`}>
            <circle
              cx={points[maxIndex].x}
              cy={points[maxIndex].y}
              r="4"
              fill="#0f172a"
              stroke={colorConfig.stroke}
              strokeWidth="2"
            />
            <circle
              cx={points[maxIndex].x}
              cy={points[maxIndex].y}
              r="2"
              fill={colorConfig.stroke}
            />
          </g>
        )}

        {/* Hover Crosshair & Active Point */}
        {showCrosshair && hoveredPoint && (
          <g>
            {/* Vertical crosshair line */}
            <line
              x1={hoveredPoint.x}
              y1={paddingTop - 4}
              x2={hoveredPoint.x}
              y2={viewBoxHeight - paddingBottom + 4}
              stroke={colorConfig.stroke}
              strokeWidth="1.25"
              strokeDasharray="3 3"
              strokeOpacity="0.75"
            />
            {/* Glowing target dot */}
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="8"
              fill={colorConfig.stroke}
              fillOpacity="0.25"
              className="animate-pulse"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4.5"
              fill="#090d16"
              stroke={colorConfig.stroke}
              strokeWidth="2.5"
            />
          </g>
        )}
      </svg>

      {/* Floating Dynamic Tooltip */}
      {hoveredPoint && tooltipPos && (
        <div
          className="pointer-events-none absolute z-20 flex flex-col items-center transform -translate-x-1/2 -translate-y-full transition-transform duration-75 ease-out"
          style={{
            left: `${Math.max(50, Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 300) - 50))}px`,
            top: `${Math.max(20, (hoveredPoint.y / viewBoxHeight) * (containerRef.current?.clientHeight || height) - 8)}px`,
          }}
        >
          <div className="flex flex-col items-center rounded-md border border-slate-700/80 bg-slate-900/95 px-2.5 py-1 shadow-2xl backdrop-blur-md">
            {label && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {label}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold tracking-tight text-white font-mono">
                {displayFormatter(hoveredPoint.raw.value)}
              </span>
              {unit && <span className="text-[10px] font-semibold text-slate-400">{unit}</span>}
            </div>
            {hoveredPoint.raw.timestamp && (
              <span className="text-[9px] text-slate-400 font-mono">
                {formatTimestamp(hoveredPoint.raw.timestamp)}
              </span>
            )}
          </div>
          {/* Tooltip arrow */}
          <div className="h-1.5 w-2 bg-slate-800 rotate-45 transform -translate-y-1 border-r border-b border-slate-700/80" />
        </div>
      )}
    </div>
  );
};

export default SparklineChart;
