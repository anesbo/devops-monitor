import React, { useState } from 'react';
import { 
  X, 
  Server, 
  Plus, 
  Cpu, 
  Layers, 
  Globe, 
  Tag, 
  Check, 
  HardDrive 
} from 'lucide-react';
import { ServerNode, NodeRole } from '../types';

export interface RegisterNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (node: ServerNode) => void;
}

const REGION_OPTIONS = [
  'us-east (N. Virginia)',
  'eu-west (Frankfurt)',
  'ap-southeast (Singapore)',
  'us-west (Oregon)',
  'sa-east (São Paulo)',
  'me-central (Dubai)',
];

const ROLE_OPTIONS: Array<{ role: NodeRole; label: string; desc: string }> = [
  { role: 'worker', label: 'Worker Node', desc: 'Runs application microservices and jobs' },
  { role: 'gateway', label: 'API Gateway', desc: 'Edge routing, SSL termination, and rate-limiting' },
  { role: 'database', label: 'Database Node', desc: 'Primary or replica relational/NoSQL datastores' },
  { role: 'cache', label: 'Cache Node', desc: 'In-memory Redis/Memcached cluster instance' },
  { role: 'storage', label: 'Storage Node', desc: 'Distributed block/object storage node' },
];

export const RegisterNodeModal: React.FC<RegisterNodeModalProps> = ({
  isOpen,
  onClose,
  onRegister,
}) => {
  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [ip, setIp] = useState('');
  const [region, setRegion] = useState(REGION_OPTIONS[0]);
  const [role, setRole] = useState<NodeRole>('worker');
  const [cores, setCores] = useState(16);
  const [totalMemoryGb, setTotalMemoryGb] = useState(64);
  const [tagsInput, setTagsInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Node display name is required';
    if (!hostname.trim()) errs.hostname = 'Hostname is required (e.g. node-01.internal)';
    if (!ip.trim()) {
      errs.ip = 'IP address is required';
    } else if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip.trim())) {
      errs.ip = 'Enter a valid IPv4 address (e.g. 10.0.1.55)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const newNode: ServerNode = {
      id: `node-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      hostname: hostname.trim(),
      ip: ip.trim(),
      region,
      role,
      status: 'healthy',
      cpu: Math.round((15 + Math.random() * 25) * 10) / 10,
      memory: Math.round((20 + Math.random() * 30) * 10) / 10,
      disk: Math.round((10 + Math.random() * 20) * 10) / 10,
      networkInMb: Math.round((40 + Math.random() * 80) * 10) / 10,
      networkOutMb: Math.round((50 + Math.random() * 90) * 10) / 10,
      latencyMs: Math.round((4 + Math.random() * 12) * 10) / 10,
      uptime: '1d 0h 0m',
      lastPing: new Date().toISOString(),
      cores,
      totalMemoryGb,
      tags: tags.length > 0 ? tags : ['custom-node', role],
    };

    onRegister(newNode);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg rounded-2xl bg-[#0b101c] border border-slate-800 shadow-2xl p-6 overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Server className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Register New Cluster Node</h3>
              <p className="text-xs text-slate-400">Join a host machine or VM into the telemetry mesh</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Node Name</label>
              <input
                type="text"
                placeholder="e.g. Core Ingress Edge 03"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full bg-[#11192b] border rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 ${
                  errors.name ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {errors.name && <p className="text-[10px] text-rose-400 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Internal IP Address</label>
              <input
                type="text"
                placeholder="e.g. 10.0.1.108"
                value={ip}
                onChange={e => setIp(e.target.value)}
                className={`w-full bg-[#11192b] border rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 ${
                  errors.ip ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {errors.ip && <p className="text-[10px] text-rose-400 mt-1">{errors.ip}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fully Qualified Hostname</label>
            <input
              type="text"
              placeholder="e.g. worker-03.us-east.apexpulse.internal"
              value={hostname}
              onChange={e => setHostname(e.target.value)}
              className={`w-full bg-[#11192b] border rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 ${
                errors.hostname ? 'border-rose-500' : 'border-slate-800'
              }`}
            />
            {errors.hostname && <p className="text-[10px] text-rose-400 mt-1">{errors.hostname}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cloud Region</label>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="w-full bg-[#11192b] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {REGION_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Node Cluster Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as NodeRole)}
                className="w-full bg-[#11192b] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {ROLE_OPTIONS.map(ro => (
                  <option key={ro.role} value={ro.role}>{ro.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>CPU Cores</span>
                <span className="font-mono text-cyan-400 font-bold">{cores} Cores</span>
              </label>
              <input
                type="range"
                min="4"
                max="128"
                step="4"
                value={cores}
                onChange={e => setCores(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Total RAM (GB)</span>
                <span className="font-mono text-cyan-400 font-bold">{totalMemoryGb} GB</span>
              </label>
              <input
                type="range"
                min="16"
                max="512"
                step="16"
                value={totalMemoryGb}
                onChange={e => setTotalMemoryGb(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tags (Comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. k8s, docker, production, nvme"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              className="w-full bg-[#11192b] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Confirm & Register</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
