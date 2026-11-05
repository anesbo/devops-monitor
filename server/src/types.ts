export type NodeStatus = 'online' | 'degraded' | 'critical' | 'offline' | 'healthy' | 'warning';

export interface NodeRecord {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  status: string; // 'online' | 'degraded' | 'critical' | 'offline'
  os: string;
  region: string;
  cpu_cores: number;
  total_ram_gb: number;
  tags: string; // JSON string e.g. '["edge", "gateway"]'
  created_at: number; // epoch ms
  last_seen?: number; // epoch ms
}

export interface MetricSnapshotRecord {
  id?: number;
  node_id: string;
  timestamp: number; // epoch ms
  cpu_percent: number;
  per_core_cpu: string; // JSON string array of numbers
  ram_used_gb: number;
  ram_total_gb: number;
  ram_percent: number;
  network_in_mbps: number;
  network_out_mbps: number;
  container_total: number;
  container_running: number;
  container_failed: number;
  health_score: number;
}

export type AlertMetricName = 'cpu' | 'ram' | 'network' | 'container_health';
export type AlertOperator = '>' | '>=' | '<' | '<=';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertRuleRecord {
  id: string;
  node_id: string | null;
  metric_name: AlertMetricName | string;
  operator: AlertOperator | string;
  threshold: number;
  severity: AlertSeverity | string;
  is_active: number; // 1 or 0
  created_at: number;
}

export type IncidentSeverity = 'info' | 'warning' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'resolved';

export interface IncidentRecord {
  id: string;
  node_id: string;
  alert_rule_id: string | null;
  title: string;
  description: string;
  severity: IncidentSeverity | string;
  status: IncidentStatus | string;
  timestamp: number;
  resolved_at: number | null;
}

export interface ClusterHealthSummary {
  totalNodes: number;
  online: number;
  degraded: number;
  critical: number;
  offline: number;
  avgCpu: number;
  avgRamPercent: number;
  avgRamUsedGb: number;
  totalRamGb: number;
  totalThroughputMbps: number;
  activeAlerts: number;
  activeIncidents: number;
  clusterHealthScore: number;
  healthStatus: 'optimal' | 'degraded' | 'critical';
  systemMessage: string;
}

export interface TriggeredAlert {
  ruleId: string;
  nodeId: string;
  metricName: string;
  operator: string;
  threshold: number;
  currentValue: number;
  severity: AlertSeverity | string;
  message: string;
}
