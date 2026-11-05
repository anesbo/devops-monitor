import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Cpu,
  HardDrive,
  Activity,
  Layers,
  AlertTriangle,
  Info,
  AlertCircle,
  Save,
  Server,
  Sliders,
  Check,
} from 'lucide-react';
import { AlertRule, AlertSeverity, AlertMetricType, AlertOperator } from '../types';

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: AlertRule) => void | Promise<void>;
  initialRule?: AlertRule | null;
  nodes?: Array<{ id: string; name: string; region?: string }>;
}

const METRIC_OPTIONS: Array<{
  id: AlertMetricType;
  label: string;
  icon: React.ElementType;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultVal: number;
  description: string;
}> = [
  {
    id: 'cpu',
    label: 'CPU Usage',
    icon: Cpu,
    unit: '%',
    min: 1,
    max: 100,
    step: 1,
    defaultVal: 85,
    description: 'Trigger when aggregate CPU utilization crosses threshold',
  },
  {
    id: 'ram',
    label: 'RAM Usage',
    icon: HardDrive,
    unit: '%',
    min: 1,
    max: 100,
    step: 1,
    defaultVal: 90,
    description: 'Trigger when system memory consumption crosses threshold',
  },
  {
    id: 'network',
    label: 'Network I/O Throughput',
    icon: Activity,
    unit: 'MB/s',
    min: 10,
    max: 2000,
    step: 10,
    defaultVal: 500,
    description: 'Trigger when inbound or outbound traffic exceeds throughput limit',
  },
  {
    id: 'container_health',
    label: 'Container Failures',
    icon: Layers,
    unit: 'failed containers',
    min: 1,
    max: 20,
    step: 1,
    defaultVal: 1,
    description: 'Trigger when one or more application containers crash or restart',
  },
  {
    id: 'disk',
    label: 'Disk Volume Space',
    icon: HardDrive,
    unit: '%',
    min: 1,
    max: 100,
    step: 1,
    defaultVal: 85,
    description: 'Trigger when root volume storage capacity is critically low',
  },
  {
    id: 'latency',
    label: 'Network Latency / RTT',
    icon: Activity,
    unit: 'ms',
    min: 5,
    max: 1000,
    step: 5,
    defaultVal: 200,
    description: 'Trigger when round-trip probe latency exceeds threshold',
  },
];

const DEFAULT_NODES = [
  { id: 'all', name: 'Global (All Cluster Nodes)', region: 'Global' },
  { id: 'node-us-east-1', name: 'us-east-prod-api-01', region: 'us-east-1' },
  { id: 'node-us-west-2', name: 'us-west-worker-04', region: 'us-west-2' },
  { id: 'node-eu-west-1', name: 'eu-west-db-replica-02', region: 'eu-west-1' },
  { id: 'node-ap-south-1', name: 'ap-south-cache-01', region: 'ap-south-1' },
];

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRule,
  nodes = DEFAULT_NODES,
}) => {
  const isEditing = Boolean(initialRule && initialRule.id);

  // Form State
  const [name, setName] = useState('');
  const [metricName, setMetricName] = useState<AlertMetricType>('cpu');
  const [operator, setOperator] = useState<AlertOperator>('>=');
  const [threshold, setThreshold] = useState<number>(85);
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [targetNodeId, setTargetNodeId] = useState<string>('all');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [duration, setDuration] = useState<string>('3m');

  // Validation & Submission State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Metric Config
  const activeMetricConfig =
    METRIC_OPTIONS.find((m) => m.id === metricName) || METRIC_OPTIONS[0];

  // Initialize or reset form
  useEffect(() => {
    if (initialRule) {
      setName(initialRule.name || '');
      setMetricName((initialRule.metricName as AlertMetricType) || 'cpu');
      setOperator(initialRule.operator || '>=');
      setThreshold(initialRule.threshold ?? 85);
      setSeverity(initialRule.severity || 'warning');
      setTargetNodeId(initialRule.nodeId || 'all');
      setIsActive(initialRule.isActive ?? true);
      setDuration(initialRule.duration || '3m');
    } else {
      setName('');
      setMetricName('cpu');
      setOperator('>=');
      setThreshold(85);
      setSeverity('warning');
      setTargetNodeId('all');
      setIsActive(true);
      setDuration('3m');
    }
    setErrors({});
  }, [initialRule, isOpen]);

  // Handle metric change and adjust threshold bounds
  const handleMetricChange = (newMetric: AlertMetricType) => {
    setMetricName(newMetric);
    const config = METRIC_OPTIONS.find((m) => m.id === newMetric);
    if (config) {
      setThreshold(config.defaultVal);
    }
    // Auto-suggest name if empty or default
    if (!name || name.startsWith('Rule: ')) {
      setName(`Rule: ${config?.label} Alert`);
    }
  };

  // Real-time form validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Rule title / name is required.';
    }

    if (Number.isNaN(threshold)) {
      errs.threshold = 'Valid threshold number is required.';
    } else if (threshold < activeMetricConfig.min || threshold > activeMetricConfig.max) {
      errs.threshold = `Threshold must be between ${activeMetricConfig.min} and ${activeMetricConfig.max} ${activeMetricConfig.unit}.`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const selectedNode = nodes.find((n) => n.id === targetNodeId);
      const payload: AlertRule = {
        id: initialRule?.id || `rule-${Date.now()}`,
        name: name.trim(),
        nodeId: targetNodeId === 'all' ? undefined : targetNodeId,
        nodeName: targetNodeId === 'all' ? 'All Nodes' : selectedNode?.name || targetNodeId,
        metricName,
        operator,
        threshold: Number(threshold),
        severity,
        isActive,
        duration,
        createdAt: initialRule?.createdAt || Date.now(),
      };

      await onSave(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl z-10 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {isEditing ? 'Configure Alert Rule' : 'Create Threshold Alert Rule'}
              </h2>
              <p className="text-xs text-slate-400">
                Define automated conditions to monitor server fleet vitals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Rule Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 font-mono uppercase tracking-wider text-[11px]">
              Rule Title & Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Critical CPU Burst on Production API"
              className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-950/80 border text-slate-100 placeholder-slate-500 focus:outline-none transition-all ${
                errors.name
                  ? 'border-rose-500 focus:border-rose-500'
                  : 'border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40'
              }`}
            />
            {errors.name && <p className="mt-1 text-rose-400 text-[11px]">{errors.name}</p>}
          </div>

          {/* Metric Selector Grid */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 font-mono uppercase tracking-wider text-[11px]">
              Telemetry Metric *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {METRIC_OPTIONS.map((metric) => {
                const Icon = metric.icon;
                const isSelected = metricName === metric.id;
                return (
                  <button
                    key={metric.id}
                    type="button"
                    onClick={() => handleMetricChange(metric.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs leading-snug">{metric.label}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({metric.unit})</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">{activeMetricConfig.description}</p>
          </div>

          {/* Operator and Threshold Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            {/* Operator */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 font-mono uppercase tracking-wider text-[10px]">
                Condition Operator
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['>=', '>', '<=', '<'] as AlertOperator[]).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperator(op)}
                    className={`py-1.5 rounded-lg font-mono font-bold text-center text-sm transition-all ${
                      operator === op
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold Slider and Numeric Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold font-mono uppercase tracking-wider text-[10px]">
                  Threshold Value
                </label>
                <span className="font-mono font-bold text-cyan-400 text-sm">
                  {threshold} {activeMetricConfig.unit}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={activeMetricConfig.min}
                  max={activeMetricConfig.max}
                  step={activeMetricConfig.step}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min={activeMetricConfig.min}
                  max={activeMetricConfig.max}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-center text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              {errors.threshold && <p className="mt-1 text-rose-400 text-[10px]">{errors.threshold}</p>}
            </div>
          </div>

          {/* Severity Level Pills */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 font-mono uppercase tracking-wider text-[11px]">
              Alert Severity Level *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSeverity('info')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border font-semibold text-xs transition-all ${
                  severity === 'info'
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Info</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverity('warning')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border font-semibold text-xs transition-all ${
                  severity === 'warning'
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Warning</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverity('critical')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border font-semibold text-xs transition-all ${
                  severity === 'critical'
                    ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Critical</span>
              </button>
            </div>
          </div>

          {/* Target Node & Duration Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Node */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 font-mono uppercase tracking-wider text-[10px]">
                Target Server Node
              </label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <select
                  value={targetNodeId}
                  onChange={(e) => setTargetNodeId(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-950/80 rounded-lg border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">Global (All Nodes)</option>
                  {nodes
                    .filter((n) => n.id !== 'all')
                    .map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.name} {node.region ? `(${node.region})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Sustained Duration */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 font-mono uppercase tracking-wider text-[10px]">
                Sustained Condition Window
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 rounded-lg border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="immediate">Immediate (Single breach)</option>
                <option value="1m">Sustained for 1 minute</option>
                <option value="3m">Sustained for 3 minutes</option>
                <option value="5m">Sustained for 5 minutes</option>
                <option value="15m">Sustained for 15 minutes</option>
              </select>
            </div>
          </div>

          {/* Active / Disabled Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800">
            <div>
              <span className="font-semibold text-slate-200 block">Rule Status</span>
              <span className="text-[11px] text-slate-400">
                {isActive ? 'Rule is active and actively evaluating incoming telemetry snapshots' : 'Rule is currently paused'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isActive ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Update Rule' : 'Save Alert Rule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AlertModal;
