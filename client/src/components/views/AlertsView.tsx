import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Bell,
  CheckCircle2,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import { useServerState } from '../../context/ServerContext';
import { IncidentTable, AlertModal } from '../index';
import { Incident, AlertRule } from '../../types';

export const AlertsView: React.FC = () => {
  const { alerts, acknowledgeAlert, resolveAlert, nodes, setSelectedNodeId, setActiveTab } =
    useServerState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createdRules, setCreatedRules] = useState<AlertRule[]>([
    {
      id: 'rule-cpu-85',
      name: 'High CPU Sustained Breach',
      metricName: 'cpu',
      operator: '>=',
      threshold: 85,
      severity: 'critical',
      isActive: true,
      duration: '3m',
      nodeId: undefined,
      nodeName: 'All Nodes',
    },
    {
      id: 'rule-ram-90',
      name: 'Memory Exhaustion Warning',
      metricName: 'ram',
      operator: '>=',
      threshold: 90,
      severity: 'warning',
      isActive: true,
      duration: '5m',
      nodeId: undefined,
      nodeName: 'All Nodes',
    },
    {
      id: 'rule-net-io',
      name: 'Network Spike Saturation Guard',
      metricName: 'network',
      operator: '>=',
      threshold: 800,
      severity: 'warning',
      isActive: true,
      duration: '1m',
      nodeId: undefined,
      nodeName: 'All Nodes',
    },
  ]);

  // Convert alerts to rich Incident format for IncidentTable
  const mappedIncidents: Incident[] = alerts.map((a) => ({
    id: a.id,
    nodeId: a.nodeId,
    nodeName: a.nodeName,
    title: a.title,
    description: a.description,
    severity: a.severity,
    status: a.resolved ? 'resolved' : a.acknowledged ? 'investigating' : 'open',
    timestamp: a.timestamp,
    metricType: a.metricType,
    currentValue: a.currentValue,
    threshold: a.threshold,
  }));

  const handleSaveRule = (newRule: AlertRule) => {
    setCreatedRules((prev) => [newRule, ...prev.filter((r) => r.id !== newRule.id)]);
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActiveTab('nodes');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#0d1628]/90 border border-slate-800 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Cluster Incident & Alert Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time threshold breaches, automated incident triage, and configurable alerts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Configure Alert Rule</span>
          </button>
        </div>
      </div>

      {/* Active Rules Strip */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Configured Threshold Rules ({createdRules.length})</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Evaluating live metrics on 3-second cycle
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {createdRules.map((rule) => (
            <div
              key={rule.id}
              className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold text-white leading-snug">{rule.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                    rule.severity === 'critical'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {rule.severity}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-cyan-300 font-semibold">
                  {rule.metricName.toUpperCase()} {rule.operator} {rule.threshold}
                </span>
                <span>{rule.duration || '1m window'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Incident Table */}
      <IncidentTable
        incidents={mappedIncidents}
        onAcknowledge={acknowledgeAlert}
        onResolve={resolveAlert}
        onSelectNode={handleSelectNode}
      />

      {/* Alert Rule Configuration Modal */}
      <AlertModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRule}
        nodes={nodes.map((n) => ({ id: n.id, name: n.name, region: n.region }))}
      />
    </div>
  );
};

export default AlertsView;
