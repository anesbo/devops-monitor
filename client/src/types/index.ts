export type NodeStatus = 'healthy' | 'warning' | 'critical' | 'offline';

export type NodeRole = 'gateway' | 'worker' | 'database' | 'cache' | 'storage';

export interface ServerNode {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  region: string;
  role: NodeRole;
  status: NodeStatus;
  cpu: number;         // percentage (0-100)
  memory: number;      // percentage (0-100)
  disk: number;        // percentage (0-100)
  networkInMb: number; // MB/s
  networkOutMb: number;// MB/s
  latencyMs: number;   // round-trip latency in ms
  uptime: string;      // e.g. "42d 18h"
  lastPing: string;    // ISO string
  cores: number;
  totalMemoryGb: number;
  tags: string[];
}

export interface MetricPoint {
  timestamp: string;   // ISO string or formatted time e.g. "12:45:00"
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;   // KB/s or MB/s
  networkOut: number;  // KB/s or MB/s
  latency: number;     // ms
  requestsPerSec: number;
  errorRate: number;   // percentage
}

export interface ClusterTelemetry {
  totalNodes: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  offlineCount: number;
  avgCpu: number;
  avgMemory: number;
  avgDisk: number;
  avgLatencyMs: number;
  totalThroughputMbps: number;
  activeAlertsCount: number;
  healthStatus: 'optimal' | 'degraded' | 'critical';
  systemMessage: string;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type IncidentSeverity = AlertSeverity;
export type IncidentStatus = 'open' | 'investigating' | 'acknowledged' | 'resolved' | 'silenced';

export interface AlertItem {
  id: string;
  nodeId: string;
  nodeName: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  metricType?: 'cpu' | 'memory' | 'ram' | 'disk' | 'latency' | 'network' | 'process' | 'container_health';
  currentValue?: string;
  threshold?: string;
}

export interface Incident {
  id: string;
  nodeId: string;
  nodeName: string;
  alertRuleId?: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  timestamp: number | string;
  resolvedAt?: number | string;
  acknowledgedAt?: number | string;
  metricType?: string;
  currentValue?: string;
  threshold?: string;
}

export type AlertMetricType = 'cpu' | 'ram' | 'network' | 'container_health' | 'disk' | 'latency';
export type AlertOperator = '>=' | '<=' | '==' | '!=' | '>' | '<';

export interface AlertRule {
  id?: string;
  name: string;
  metricName: AlertMetricType;
  operator: AlertOperator;
  threshold: number;
  severity: AlertSeverity;
  nodeId?: string | null;
  targetNodeId?: string | null;
  nodeName?: string;
  isActive: boolean;
  duration: string;
  createdAt?: number | string;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeName: string;
  service: string;
  level: LogLevel;
  message: string;
}

export type TimeRange = '5m' | '15m' | '1h' | '24h';

export type ViewTab = 'overview' | 'nodes' | 'alerts' | 'logs';
