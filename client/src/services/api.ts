import { ServerNode, MetricPoint, ClusterTelemetry, AlertItem, LogEntry, TimeRange } from '../types';

// ==========================================
// REALISTIC HIGH-FIDELITY FALLBACK DATA ENGINE
// ==========================================

const INITIAL_NODES: ServerNode[] = [
  {
    id: 'node-us-east-1',
    name: 'Edge Gateway Alpha',
    hostname: 'gw-01.us-east.apexpulse.internal',
    ip: '10.0.1.15',
    region: 'us-east (N. Virginia)',
    role: 'gateway',
    status: 'healthy',
    cpu: 34.2,
    memory: 48.6,
    disk: 52.1,
    networkInMb: 145.8,
    networkOutMb: 182.4,
    latencyMs: 4.2,
    uptime: '68d 14h 22m',
    lastPing: new Date().toISOString(),
    cores: 32,
    totalMemoryGb: 64,
    tags: ['ingress', 'traefik', 'tls-termination', 'edge']
  },
  {
    id: 'node-us-east-2',
    name: 'Core API Cluster 01',
    hostname: 'api-worker-01.us-east.apexpulse.internal',
    ip: '10.0.1.28',
    region: 'us-east (N. Virginia)',
    role: 'worker',
    status: 'healthy',
    cpu: 58.7,
    memory: 67.4,
    disk: 44.0,
    networkInMb: 88.5,
    networkOutMb: 110.2,
    latencyMs: 6.8,
    uptime: '45d 06h 11m',
    lastPing: new Date().toISOString(),
    cores: 64,
    totalMemoryGb: 128,
    tags: ['k8s-node', 'nestjs', 'api', 'production']
  },
  {
    id: 'node-eu-west-1',
    name: 'DB Primary Aurora',
    hostname: 'pg-primary.eu-west.apexpulse.internal',
    ip: '10.0.2.10',
    region: 'eu-west (Frankfurt)',
    role: 'database',
    status: 'warning',
    cpu: 62.1,
    memory: 89.4,
    disk: 78.5,
    networkInMb: 42.1,
    networkOutMb: 95.3,
    latencyMs: 32.4,
    uptime: '112d 20h 49m',
    lastPing: new Date().toISOString(),
    cores: 64,
    totalMemoryGb: 256,
    tags: ['postgresql', 'aurora', 'primary', 'storage-tier-1']
  },
  {
    id: 'node-eu-west-2',
    name: 'Redis Cache Mesh',
    hostname: 'cache-01.eu-west.apexpulse.internal',
    ip: '10.0.2.44',
    region: 'eu-west (Frankfurt)',
    role: 'cache',
    status: 'healthy',
    cpu: 22.8,
    memory: 55.1,
    disk: 18.2,
    networkInMb: 124.0,
    networkOutMb: 160.7,
    latencyMs: 28.1,
    uptime: '90d 02h 15m',
    lastPing: new Date().toISOString(),
    cores: 16,
    totalMemoryGb: 64,
    tags: ['redis', 'session-cache', 'pubsub']
  },
  {
    id: 'node-ap-se-1',
    name: 'AI Inference Matrix',
    hostname: 'gpu-node-03.ap-se.apexpulse.internal',
    ip: '10.0.3.88',
    region: 'ap-southeast (Singapore)',
    role: 'worker',
    status: 'critical',
    cpu: 96.4,
    memory: 92.1,
    disk: 64.8,
    networkInMb: 210.5,
    networkOutMb: 245.9,
    latencyMs: 168.5,
    uptime: '12d 19h 04m',
    lastPing: new Date().toISOString(),
    cores: 128,
    totalMemoryGb: 512,
    tags: ['h100-gpu', 'vllm', 'batch-inference', 'high-load']
  },
  {
    id: 'node-us-west-1',
    name: 'Distributed Object Store',
    hostname: 's3-minio-01.us-west.apexpulse.internal',
    ip: '10.0.4.12',
    region: 'us-west (Oregon)',
    role: 'storage',
    status: 'healthy',
    cpu: 28.4,
    memory: 41.3,
    disk: 84.2,
    networkInMb: 76.2,
    networkOutMb: 92.4,
    latencyMs: 44.0,
    uptime: '184d 11h 05m',
    lastPing: new Date().toISOString(),
    cores: 32,
    totalMemoryGb: 128,
    tags: ['minio', 'wal-archive', 'backups']
  }
];

let mockAlerts: AlertItem[] = [
  {
    id: 'alt-101',
    nodeId: 'node-ap-se-1',
    nodeName: 'AI Inference Matrix',
    severity: 'critical',
    title: 'High CPU & Compute Saturation',
    description: 'vLLM worker pipeline saturated: CPU usage sustained at 96.4% over 5-minute window threshold (90%).',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    acknowledged: false,
    resolved: false,
    metricType: 'cpu',
    currentValue: '96.4%',
    threshold: '90.0%'
  },
  {
    id: 'alt-102',
    nodeId: 'node-eu-west-1',
    nodeName: 'DB Primary Aurora',
    severity: 'warning',
    title: 'PostgreSQL Buffer Cache Pressure',
    description: 'Shared buffers exhaustion: Memory consumption reached 89.4% (Warning watermark: 85%).',
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    acknowledged: true,
    resolved: false,
    metricType: 'memory',
    currentValue: '89.4%',
    threshold: '85.0%'
  },
  {
    id: 'alt-103',
    nodeId: 'node-ap-se-1',
    nodeName: 'AI Inference Matrix',
    severity: 'critical',
    title: 'Cross-Region Latency Degradation',
    description: 'Round-trip TCP ping elevated to 168ms exceeding SLA threshold of 100ms.',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    acknowledged: false,
    resolved: false,
    metricType: 'latency',
    currentValue: '168.5ms',
    threshold: '100ms'
  },
  {
    id: 'alt-104',
    nodeId: 'node-us-west-1',
    nodeName: 'Distributed Object Store',
    severity: 'info',
    title: 'Snapshot Retention Pruning Finished',
    description: 'Completed automated garbage collection on tier-2 cold storage volume (reclaimed 420 GB).',
    timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    acknowledged: true,
    resolved: true,
    metricType: 'disk',
    currentValue: '84.2%',
    threshold: '90.0%'
  }
];

let mockLogs: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3000).toLocaleTimeString(),
    nodeId: 'node-us-east-1',
    nodeName: 'Edge Gateway Alpha',
    service: 'traefik.access',
    level: 'info',
    message: 'HTTP/2 GET /api/v1/telemetry 200 4.1ms - 1.2KB'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 7000).toLocaleTimeString(),
    nodeId: 'node-ap-se-1',
    nodeName: 'AI Inference Matrix',
    service: 'torch.runtime',
    level: 'error',
    message: 'CUDA device [0] compute utilization ceiling hit (99.8%) - thermal throttle triggered'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 12000).toLocaleTimeString(),
    nodeId: 'node-eu-west-1',
    nodeName: 'DB Primary Aurora',
    service: 'postgres.wal',
    level: 'warn',
    message: 'Checkpoint lag spike: buffer eviction rate 14,800 pages/s exceeding baseline'
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 16000).toLocaleTimeString(),
    nodeId: 'node-us-east-2',
    nodeName: 'Core API Cluster 01',
    service: 'kubelet.cadvisor',
    level: 'info',
    message: 'Container health check passed [status=READY] for pod/api-gateway-7df8cb-q9zlp'
  },
  {
    id: 'log-5',
    timestamp: new Date(Date.now() - 21000).toLocaleTimeString(),
    nodeId: 'node-eu-west-2',
    nodeName: 'Redis Cache Mesh',
    service: 'redis-server',
    level: 'info',
    message: 'Cluster gossip sync completed: 6 shards healthy, replication lag < 1ms'
  }
];

// In-memory simulation state
let currentNodes = [...INITIAL_NODES];

// Helper to calculate cluster telemetry from nodes
export function calculateTelemetry(nodes: ServerNode[]): ClusterTelemetry {
  const total = nodes.length;
  const healthy = nodes.filter(n => n.status === 'healthy').length;
  const warning = nodes.filter(n => n.status === 'warning').length;
  const critical = nodes.filter(n => n.status === 'critical').length;
  const offline = nodes.filter(n => n.status === 'offline').length;

  const avgCpu = Math.round((nodes.reduce((acc, n) => acc + n.cpu, 0) / total) * 10) / 10;
  const avgMemory = Math.round((nodes.reduce((acc, n) => acc + n.memory, 0) / total) * 10) / 10;
  const avgDisk = Math.round((nodes.reduce((acc, n) => acc + n.disk, 0) / total) * 10) / 10;
  const avgLatency = Math.round((nodes.reduce((acc, n) => acc + n.latencyMs, 0) / total) * 10) / 10;
  const totalThroughput = Math.round(nodes.reduce((acc, n) => acc + (n.networkInMb + n.networkOutMb), 0) * 10) / 10;

  let healthStatus: 'optimal' | 'degraded' | 'critical' = 'optimal';
  let systemMessage = 'All cluster nodes operating normally within SLA parameters';

  if (critical > 0) {
    healthStatus = 'critical';
    systemMessage = `${critical} node${critical > 1 ? 's' : ''} in critical state requiring operator intervention`;
  } else if (warning > 0) {
    healthStatus = 'degraded';
    systemMessage = `${warning} node${warning > 1 ? 's' : ''} showing elevated resource utilization or latency`;
  }

  const activeAlerts = mockAlerts.filter(a => !a.resolved).length;

  return {
    totalNodes: total,
    healthyCount: healthy,
    warningCount: warning,
    criticalCount: critical,
    offlineCount: offline,
    avgCpu,
    avgMemory,
    avgDisk,
    avgLatencyMs: avgLatency,
    totalThroughputMbps: totalThroughput,
    activeAlertsCount: activeAlerts,
    healthStatus,
    systemMessage
  };
}

// Generate realistic historic metric series
export function generateHistoryMetrics(range: TimeRange, targetNodeId?: string): MetricPoint[] {
  const points: MetricPoint[] = [];
  let count = 20;
  let intervalSec = 15;

  if (range === '5m') {
    count = 20;
    intervalSec = 15;
  } else if (range === '15m') {
    count = 30;
    intervalSec = 30;
  } else if (range === '1h') {
    count = 30;
    intervalSec = 120;
  } else {
    count = 24;
    intervalSec = 3600;
  }

  const now = Date.now();
  const node = targetNodeId && targetNodeId !== 'all' 
    ? currentNodes.find(n => n.id === targetNodeId) 
    : null;

  const baseCpu = node ? node.cpu : 50;
  const baseMem = node ? node.memory : 65;
  const baseLatency = node ? node.latencyMs : 35;

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - i * intervalSec * 1000);
    const noise = Math.sin(i * 0.4) * 8 + (Math.random() * 4 - 2);
    
    points.push({
      timestamp: range === '24h' 
        ? `${time.getHours()}:00`
        : time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cpu: Math.min(100, Math.max(5, Math.round((baseCpu + noise) * 10) / 10)),
      memory: Math.min(100, Math.max(10, Math.round((baseMem + noise * 0.3) * 10) / 10)),
      disk: Math.min(100, Math.max(5, Math.round((60 + noise * 0.1) * 10) / 10)),
      networkIn: Math.round((120 + noise * 6) * 10) / 10,
      networkOut: Math.round((160 + noise * 7) * 10) / 10,
      latency: Math.max(1, Math.round((baseLatency + noise * 0.5) * 10) / 10),
      requestsPerSec: Math.round(2400 + noise * 120),
      errorRate: Math.max(0, Math.round((0.02 + (baseCpu > 90 ? 0.8 : 0.01) * Math.random()) * 100) / 100)
    });
  }

  return points;
}

// Live telemetry drift simulation for realistic feel
function driftMockData() {
  currentNodes = currentNodes.map(node => {
    // Gentle natural drift
    const cpuDrift = (Math.random() - 0.49) * 2.5;
    const memDrift = (Math.random() - 0.48) * 0.8;
    const latencyDrift = (Math.random() - 0.5) * 1.5;

    let cpu = Math.min(99.5, Math.max(5, node.cpu + cpuDrift));
    let memory = Math.min(99.0, Math.max(15, node.memory + memDrift));
    let latencyMs = Math.max(1.2, node.latencyMs + latencyDrift);

    // Keep node status synchronized with thresholds
    let status: ServerNode['status'] = 'healthy';
    if (cpu > 90 || memory > 92 || latencyMs > 120) {
      status = 'critical';
    } else if (cpu > 75 || memory > 85 || latencyMs > 50) {
      status = 'warning';
    }

    return {
      ...node,
      cpu: Math.round(cpu * 10) / 10,
      memory: Math.round(memory * 10) / 10,
      latencyMs: Math.round(latencyMs * 10) / 10,
      status,
      lastPing: new Date().toISOString()
    };
  });
}

// ==========================================
// API CLIENT IMPLEMENTATION
// ==========================================

const API_BASE = '/api';

async function safeFetch<T>(endpoint: string, fallbackData: T): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return fallbackData;
    }
    
    const data = await response.json();
    return data;
  } catch (_error) {
    // Backend unreachable or route not yet ready; use fallback
    return fallbackData;
  }
}

export const api = {
  /**
   * Fetch all server nodes in cluster
   */
  async getNodes(): Promise<ServerNode[]> {
    driftMockData();
    return safeFetch<ServerNode[]>('/nodes', currentNodes);
  },

  /**
   * Fetch single server node by ID
   */
  async getNodeById(id: string): Promise<ServerNode | undefined> {
    driftMockData();
    const fallback = currentNodes.find(n => n.id === id);
    return safeFetch<ServerNode | undefined>(`/nodes/${id}`, fallback);
  },

  /**
   * Fetch live cluster telemetry summary
   */
  async getLiveTelemetry(nodeId?: string): Promise<ClusterTelemetry> {
    driftMockData();
    const fallback = calculateTelemetry(currentNodes);
    const endpoint = nodeId && nodeId !== 'all' ? `/metrics/live?nodeId=${nodeId}` : '/metrics/live';
    return safeFetch<ClusterTelemetry>(endpoint, fallback);
  },

  /**
   * Fetch time-series history metrics for graphs
   */
  async getMetricsHistory(range: TimeRange = '15m', nodeId?: string): Promise<MetricPoint[]> {
    const fallback = generateHistoryMetrics(range, nodeId);
    const params = new URLSearchParams({ range });
    if (nodeId && nodeId !== 'all') params.append('nodeId', nodeId);
    return safeFetch<MetricPoint[]>(`/metrics/history?${params.toString()}`, fallback);
  },

  /**
   * Fetch active and past system alerts / incidents
   */
  async getAlerts(filter: 'all' | 'active' | 'resolved' = 'all'): Promise<AlertItem[]> {
    let fallback = mockAlerts;
    if (filter === 'active') {
      fallback = mockAlerts.filter(a => !a.resolved);
    } else if (filter === 'resolved') {
      fallback = mockAlerts.filter(a => a.resolved);
    }
    return safeFetch<AlertItem[]>(`/alerts?filter=${filter}`, fallback);
  },

  /**
   * Acknowledge or silence an alert
   */
  async acknowledgeAlert(alertId: string): Promise<AlertItem[]> {
    mockAlerts = mockAlerts.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    );
    try {
      await fetch(`${API_BASE}/alerts/${alertId}/ack`, { method: 'POST' });
    } catch {
      // offline / mock fallback
    }
    return mockAlerts;
  },

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<AlertItem[]> {
    mockAlerts = mockAlerts.map(a => 
      a.id === alertId ? { ...a, resolved: true, acknowledged: true } : a
    );
    try {
      await fetch(`${API_BASE}/alerts/${alertId}/resolve`, { method: 'POST' });
    } catch {
      // offline / mock fallback
    }
    return mockAlerts;
  },

  /**
   * Fetch live streaming logs
   */
  async getLogs(nodeId?: string, limit: number = 50): Promise<LogEntry[]> {
    let fallback = [...mockLogs];
    if (nodeId && nodeId !== 'all') {
      fallback = fallback.filter(l => l.nodeId === nodeId);
    }
    return safeFetch<LogEntry[]>(`/logs?limit=${limit}${nodeId ? `&nodeId=${nodeId}` : ''}`, fallback);
  }
};
