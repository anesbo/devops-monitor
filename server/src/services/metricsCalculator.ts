import {
  MetricSnapshotRecord,
  AlertRuleRecord,
  TriggeredAlert,
  ClusterHealthSummary,
  NodeRecord
} from '../types';

/**
 * Calculates container health score based on running, total, and failed count.
 * Formula: Math.max(0, Math.min(100, Math.round(((running / Math.max(1, total)) * 100) - (failed * 15))))
 */
export function calculateContainerHealth(
  running: number,
  total: number,
  failed: number
): number {
  const safeTotal = Math.max(1, total);
  const ratioScore = (running / safeTotal) * 100;
  const penalty = failed * 15;
  const rawScore = Math.round(ratioScore - penalty);
  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Converts raw bytes transferred over an interval to Megabits per second (Mbps).
 * 1 byte = 8 bits, 1 Mb = 1,000,000 bits (or 1024 * 1024 / 8)
 */
export function bytesToMbps(bytes: number, intervalSeconds: number = 1): number {
  if (intervalSeconds <= 0 || bytes <= 0) return 0;
  const bits = bytes * 8;
  const mbps = bits / (intervalSeconds * 1_000_000);
  return Math.round(mbps * 100) / 100;
}

/**
 * Computes average CPU across per-core utilization array.
 */
export function averageCpuAcrossCores(perCoreCpu: number[] | string): number {
  let cores: number[] = [];
  if (typeof perCoreCpu === 'string') {
    try {
      cores = JSON.parse(perCoreCpu);
    } catch {
      cores = [];
    }
  } else if (Array.isArray(perCoreCpu)) {
    cores = perCoreCpu;
  }

  if (cores.length === 0) return 0;
  const sum = cores.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / cores.length) * 10) / 10;
}

/**
 * Calculates memory pressure ratio: used_ram / total_ram (0.0 to 1.0) and percentage.
 */
export function calculateMemoryPressure(
  usedGb: number,
  totalGb: number
): { ratio: number; percent: number } {
  if (totalGb <= 0) return { ratio: 0, percent: 0 };
  const ratio = Math.min(1.0, Math.max(0, usedGb / totalGb));
  const percent = Math.round(ratio * 1000) / 10;
  return { ratio: Math.round(ratio * 1000) / 1000, percent };
}

/**
 * Evaluates active alert rules against a metric snapshot.
 * Compares CPU, RAM, Network throughput, and Container Health against threshold rules.
 */
export function evaluateAlertRules(
  snapshot: MetricSnapshotRecord,
  rules: AlertRuleRecord[]
): TriggeredAlert[] {
  const triggered: TriggeredAlert[] = [];

  for (const rule of rules) {
    // Only check active rules and rules that apply to this node (or cluster-wide when node_id is null)
    if (!rule.is_active) continue;
    if (rule.node_id && rule.node_id !== snapshot.node_id) continue;

    let currentValue = 0;
    const metric = rule.metric_name.toLowerCase();

    switch (metric) {
      case 'cpu':
        currentValue = snapshot.cpu_percent;
        break;
      case 'ram':
      case 'memory':
        currentValue = snapshot.ram_percent;
        break;
      case 'network':
        currentValue = snapshot.network_in_mbps + snapshot.network_out_mbps;
        break;
      case 'container_health':
      case 'container':
        currentValue = snapshot.health_score;
        break;
      default:
        continue;
    }

    let isViolated = false;
    const op = rule.operator.trim();
    const thresh = rule.threshold;

    switch (op) {
      case '>':
        isViolated = currentValue > thresh;
        break;
      case '>=':
        isViolated = currentValue >= thresh;
        break;
      case '<':
        isViolated = currentValue < thresh;
        break;
      case '<=':
        isViolated = currentValue <= thresh;
        break;
      case '==':
      case '=':
        isViolated = currentValue === thresh;
        break;
    }

    if (isViolated) {
      const metricLabel = metric.replace('_', ' ').toUpperCase();
      triggered.push({
        ruleId: rule.id,
        nodeId: snapshot.node_id,
        metricName: rule.metric_name,
        operator: rule.operator,
        threshold: rule.threshold,
        currentValue: Math.round(currentValue * 10) / 10,
        severity: rule.severity,
        message: `${metricLabel} metric value ${currentValue.toFixed(1)} violated rule threshold (${rule.operator} ${rule.threshold})`
      });
    }
  }

  return triggered;
}

/**
 * Aggregates cluster-wide health status and summary statistics across all nodes and snapshots.
 */
export function aggregateClusterHealth(
  nodes: NodeRecord[],
  latestSnapshots: MetricSnapshotRecord[],
  activeIncidentsCount: number = 0,
  activeAlertsCount: number = 0
): ClusterHealthSummary {
  const totalNodes = nodes.length;
  if (totalNodes === 0) {
    return {
      totalNodes: 0,
      online: 0,
      degraded: 0,
      critical: 0,
      offline: 0,
      avgCpu: 0,
      avgRamPercent: 0,
      avgRamUsedGb: 0,
      totalRamGb: 0,
      totalThroughputMbps: 0,
      activeAlerts: 0,
      activeIncidents: 0,
      clusterHealthScore: 100,
      healthStatus: 'optimal',
      systemMessage: 'No nodes registered in cluster'
    };
  }

  let online = 0;
  let degraded = 0;
  let critical = 0;
  let offline = 0;

  for (const n of nodes) {
    const s = n.status.toLowerCase();
    if (s === 'online' || s === 'healthy') online++;
    else if (s === 'degraded' || s === 'warning') degraded++;
    else if (s === 'critical') critical++;
    else if (s === 'offline') offline++;
    else online++;
  }

  // Calculate averages from latest snapshots
  let totalCpu = 0;
  let totalRamUsedGb = 0;
  let totalRamGb = 0;
  let totalThroughputMbps = 0;
  let totalHealthScores = 0;

  const count = latestSnapshots.length || 1;

  for (const snap of latestSnapshots) {
    totalCpu += snap.cpu_percent;
    totalRamUsedGb += snap.ram_used_gb;
    totalRamGb += snap.ram_total_gb;
    totalThroughputMbps += snap.network_in_mbps + snap.network_out_mbps;
    totalHealthScores += snap.health_score;
  }

  const avgCpu = Math.round((totalCpu / count) * 10) / 10;
  const avgRamUsedGb = Math.round((totalRamUsedGb / count) * 10) / 10;
  const avgRamPercent = totalRamGb > 0
    ? Math.round((totalRamUsedGb / totalRamGb) * 1000) / 10
    : 0;
  const avgHealthScore = Math.round(totalHealthScores / count);

  let healthStatus: 'optimal' | 'degraded' | 'critical' = 'optimal';
  let systemMessage = 'All cluster nodes operating normally within SLA parameters';

  if (critical > 0) {
    healthStatus = 'critical';
    systemMessage = `${critical} node${critical > 1 ? 's' : ''} in critical state requiring operator intervention`;
  } else if (degraded > 0) {
    healthStatus = 'degraded';
    systemMessage = `${degraded} node${degraded > 1 ? 's' : ''} showing elevated resource utilization or latency`;
  }

  return {
    totalNodes,
    online,
    degraded,
    critical,
    offline,
    avgCpu,
    avgRamPercent,
    avgRamUsedGb,
    totalRamGb: Math.round(totalRamGb * 10) / 10,
    totalThroughputMbps: Math.round(totalThroughputMbps * 10) / 10,
    activeAlerts: activeAlertsCount,
    activeIncidents: activeIncidentsCount,
    clusterHealthScore: avgHealthScore,
    healthStatus,
    systemMessage
  };
}
