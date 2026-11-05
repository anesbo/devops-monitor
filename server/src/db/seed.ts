import {
  getAllNodes,
  createNode,
  insertSnapshot,
  createAlertRule,
  createIncident,
  getAllAlertRules,
  getIncidents
} from './db';
import { NodeRecord, AlertRuleRecord, IncidentRecord, MetricSnapshotRecord } from '../types';

export const INITIAL_NODES: NodeRecord[] = [
  {
    id: 'node-us-east-1',
    name: 'Edge Gateway Alpha',
    hostname: 'gw-01.us-east.apexpulse.internal',
    ip: '10.0.1.15',
    status: 'online',
    os: 'Ubuntu 22.04 LTS (Kernel 6.2)',
    region: 'us-east (N. Virginia)',
    cpu_cores: 32,
    total_ram_gb: 64,
    tags: JSON.stringify(['ingress', 'traefik', 'tls-termination', 'edge']),
    created_at: Date.now() - 90 * 86400000
  },
  {
    id: 'node-us-east-2',
    name: 'Core API Cluster 01',
    hostname: 'api-worker-01.us-east.apexpulse.internal',
    ip: '10.0.1.28',
    status: 'online',
    os: 'Debian 12 Bookworm',
    region: 'us-east (N. Virginia)',
    cpu_cores: 64,
    total_ram_gb: 128,
    tags: JSON.stringify(['k8s-node', 'express', 'api', 'production']),
    created_at: Date.now() - 60 * 86400000
  },
  {
    id: 'node-eu-west-1',
    name: 'DB Primary Aurora',
    hostname: 'pg-primary.eu-west.apexpulse.internal',
    ip: '10.0.2.10',
    status: 'degraded',
    os: 'RHEL 9.3 Hardened',
    region: 'eu-west (Frankfurt)',
    cpu_cores: 64,
    total_ram_gb: 256,
    tags: JSON.stringify(['postgresql', 'aurora', 'primary', 'storage-tier-1']),
    created_at: Date.now() - 120 * 86400000
  },
  {
    id: 'node-eu-west-2',
    name: 'Redis Cache Mesh',
    hostname: 'cache-01.eu-west.apexpulse.internal',
    ip: '10.0.2.44',
    status: 'online',
    os: 'Alpine Linux 3.19',
    region: 'eu-west (Frankfurt)',
    cpu_cores: 16,
    total_ram_gb: 64,
    tags: JSON.stringify(['redis', 'session-cache', 'pubsub']),
    created_at: Date.now() - 95 * 86400000
  },
  {
    id: 'node-ap-se-1',
    name: 'AI Inference Matrix',
    hostname: 'gpu-node-03.ap-se.apexpulse.internal',
    ip: '10.0.3.88',
    status: 'critical',
    os: 'Ubuntu 22.04 LTS (NVIDIA Cuda 12.3)',
    region: 'ap-southeast (Singapore)',
    cpu_cores: 128,
    total_ram_gb: 512,
    tags: JSON.stringify(['h100-gpu', 'vllm', 'batch-inference', 'high-load']),
    created_at: Date.now() - 30 * 86400000
  },
  {
    id: 'node-us-west-1',
    name: 'Distributed Object Store',
    hostname: 's3-minio-01.us-west.apexpulse.internal',
    ip: '10.0.4.12',
    status: 'online',
    os: 'Rocky Linux 9.2',
    region: 'us-west (Oregon)',
    cpu_cores: 32,
    total_ram_gb: 128,
    tags: JSON.stringify(['minio', 'wal-archive', 'backups']),
    created_at: Date.now() - 180 * 86400000
  }
];

export const INITIAL_ALERT_RULES: AlertRuleRecord[] = [
  {
    id: 'rule-cpu-critical',
    node_id: null,
    metric_name: 'cpu',
    operator: '>=',
    threshold: 85,
    severity: 'critical',
    is_active: 1,
    created_at: Date.now() - 7 * 86400000
  },
  {
    id: 'rule-ram-warning',
    node_id: null,
    metric_name: 'ram',
    operator: '>=',
    threshold: 85,
    severity: 'warning',
    is_active: 1,
    created_at: Date.now() - 7 * 86400000
  },
  {
    id: 'rule-ram-critical',
    node_id: null,
    metric_name: 'ram',
    operator: '>=',
    threshold: 92,
    severity: 'critical',
    is_active: 1,
    created_at: Date.now() - 7 * 86400000
  },
  {
    id: 'rule-container-health',
    node_id: null,
    metric_name: 'container_health',
    operator: '<',
    threshold: 75,
    severity: 'warning',
    is_active: 1,
    created_at: Date.now() - 7 * 86400000
  },
  {
    id: 'rule-container-critical',
    node_id: null,
    metric_name: 'container_health',
    operator: '<',
    threshold: 50,
    severity: 'critical',
    is_active: 1,
    created_at: Date.now() - 7 * 86400000
  },
  {
    id: 'rule-network-spike',
    node_id: null,
    metric_name: 'network',
    operator: '>=',
    threshold: 400,
    severity: 'warning',
    is_active: 1,
    created_at: Date.now() - 7 * 86400000
  }
];

export const INITIAL_INCIDENTS: IncidentRecord[] = [
  {
    id: 'inc-101',
    node_id: 'node-ap-se-1',
    alert_rule_id: 'rule-cpu-critical',
    title: 'High CPU & Compute Saturation',
    description: 'vLLM worker pipeline saturated: CPU usage sustained at 96.4% over 5-minute window threshold (85%).',
    severity: 'critical',
    status: 'open',
    timestamp: Date.now() - 15 * 60 * 1000,
    resolved_at: null
  },
  {
    id: 'inc-102',
    node_id: 'node-eu-west-1',
    alert_rule_id: 'rule-ram-warning',
    title: 'PostgreSQL Buffer Cache Pressure',
    description: 'Shared buffers exhaustion: Memory consumption reached 89.4% (Warning watermark: 85%).',
    severity: 'warning',
    status: 'investigating',
    timestamp: Date.now() - 45 * 60 * 1000,
    resolved_at: null
  },
  {
    id: 'inc-103',
    node_id: 'node-us-west-1',
    alert_rule_id: 'rule-container-health',
    title: 'Temporary Worker Container CrashLoop',
    description: 'Worker pod minio-cache-sync-4 experienced transient OOM, auto-restarted and resumed sync.',
    severity: 'info',
    status: 'resolved',
    timestamp: Date.now() - 120 * 60 * 1000,
    resolved_at: Date.now() - 85 * 60 * 1000
  }
];

export async function seedDatabase(force: boolean = false): Promise<void> {
  const existingNodes = await getAllNodes();
  if (existingNodes.length > 0 && !force) {
    return;
  }

  // 1. Seed Nodes
  for (const node of INITIAL_NODES) {
    await createNode(node);
  }

  // 2. Seed Alert Rules
  const existingRules = await getAllAlertRules();
  if (existingRules.length === 0) {
    for (const rule of INITIAL_ALERT_RULES) {
      await createAlertRule(rule);
    }
  }

  // 3. Seed Incidents
  const existingIncidents = await getIncidents();
  if (existingIncidents.length === 0) {
    for (const inc of INITIAL_INCIDENTS) {
      await createIncident(inc);
    }
  }

  // 4. Seed 24 hours of historical metric snapshots for each node (every 15 mins = 96 points)
  const now = Date.now();
  const stepMs = 15 * 60 * 1000;
  const steps = 96; // 24 hours

  for (const node of INITIAL_NODES) {
    let baseCpu = 35;
    let baseRam = 45;
    let baseNet = 120;
    let containerTotal = 16;
    let containerRunning = 16;
    let containerFailed = 0;

    if (node.id === 'node-ap-se-1') {
      baseCpu = 88;
      baseRam = 85;
      baseNet = 230;
      containerTotal = 24;
      containerRunning = 21;
      containerFailed = 2;
    } else if (node.id === 'node-eu-west-1') {
      baseCpu = 60;
      baseRam = 82;
      baseNet = 80;
      containerTotal = 12;
      containerRunning = 11;
      containerFailed = 1;
    } else if (node.id === 'node-us-east-2') {
      baseCpu = 55;
      baseRam = 65;
      baseNet = 100;
    }

    for (let i = steps; i >= 0; i--) {
      const ts = now - i * stepMs;
      const wave = Math.sin((ts / 1000 / 3600) * Math.PI) * 12;
      const jitter = (Math.random() - 0.5) * 6;
      
      const cpu = Math.max(5, Math.min(99.5, Math.round((baseCpu + wave + jitter) * 10) / 10));
      const ramPercent = Math.max(10, Math.min(98.5, Math.round((baseRam + wave * 0.4 + jitter * 0.3) * 10) / 10));
      const ramUsedGb = Math.round(((ramPercent / 100) * node.total_ram_gb) * 10) / 10;
      
      const netIn = Math.max(5, Math.round((baseNet + wave * 3 + jitter * 4) * 10) / 10);
      const netOut = Math.max(5, Math.round((baseNet * 1.25 + wave * 4 + jitter * 5) * 10) / 10);

      // Per-core utilization
      const coreLoads: number[] = [];
      for (let c = 0; c < Math.min(node.cpu_cores, 16); c++) {
        const coreJitter = (Math.random() - 0.5) * 14;
        coreLoads.push(Math.max(1, Math.min(100, Math.round((cpu + coreJitter) * 10) / 10)));
      }

      // Container health formula:
      // Math.max(0, Math.min(100, Math.round(((running / Math.max(1, total)) * 100) - (failed * 15))))
      const running = containerRunning;
      const total = containerTotal;
      const failed = containerFailed;
      const healthScore = Math.max(
        0,
        Math.min(100, Math.round(((running / Math.max(1, total)) * 100) - failed * 15))
      );

      const snapshot: MetricSnapshotRecord = {
        node_id: node.id,
        timestamp: ts,
        cpu_percent: cpu,
        per_core_cpu: JSON.stringify(coreLoads),
        ram_used_gb: ramUsedGb,
        ram_total_gb: node.total_ram_gb,
        ram_percent: ramPercent,
        network_in_mbps: netIn,
        network_out_mbps: netOut,
        container_total: total,
        container_running: running,
        container_failed: failed,
        health_score: healthScore
      };

      await insertSnapshot(snapshot);
    }
  }
}
