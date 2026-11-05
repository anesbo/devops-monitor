import {
  getAllNodes,
  getLatestSnapshot,
  insertSnapshot,
  updateNode,
  getAllAlertRules,
  getIncidents,
  createIncident
} from '../db';
import {
  calculateContainerHealth,
  evaluateAlertRules
} from './metricsCalculator';
import { MetricSnapshotRecord, NodeRecord, IncidentRecord } from '../types';

let simulationTimer: NodeJS.Timeout | null = null;
let isSimulationRunning = false;
let tickCount = 0;

/**
 * Generates a realistic live telemetry snapshot for a given node.
 */
export async function generateTelemetryForNode(
  node: NodeRecord
): Promise<MetricSnapshotRecord> {
  const previousSnapshot = await getLatestSnapshot(node.id);
  tickCount++;

  // Base profile per node role/type
  let baseCpu = 35;
  let baseRamPercent = 45;
  let baseNetIn = 80;
  let baseNetOut = 110;
  let totalContainers = 16;
  let runningContainers = 16;
  let failedContainers = 0;

  if (node.id === 'node-ap-se-1') {
    // High load AI inference node
    baseCpu = 88;
    baseRamPercent = 86;
    baseNetIn = 210;
    baseNetOut = 245;
    totalContainers = 24;
    runningContainers = 21;
    failedContainers = 2;
  } else if (node.id === 'node-eu-west-1') {
    // Heavy DB server
    baseCpu = 62;
    baseRamPercent = 84;
    baseNetIn = 65;
    baseNetOut = 120;
    totalContainers = 12;
    runningContainers = 11;
    failedContainers = 1;
  } else if (node.id === 'node-us-east-2') {
    // Core API cluster
    baseCpu = 56;
    baseRamPercent = 65;
    baseNetIn = 95;
    baseNetOut = 115;
    totalContainers = 20;
    runningContainers = 20;
    failedContainers = 0;
  }

  // Load wave (sine oscillations) plus random noise
  const wave = Math.sin((tickCount * 0.15) + (node.id.charCodeAt(node.id.length - 1) % 5)) * 8;
  const jitter = (Math.random() - 0.5) * 6;
  
  // Occasional random network spike (1 in 10 chance)
  const isNetworkSpike = Math.random() < 0.1;
  const netSpikeMultiplier = isNetworkSpike ? 2.2 : 1.0;

  let cpu = Math.max(5, Math.min(99.8, Math.round((baseCpu + wave + jitter) * 10) / 10));
  
  // Smooth transition from previous snapshot if available
  if (previousSnapshot) {
    const prevCpu = previousSnapshot.cpu_percent;
    cpu = Math.round(((prevCpu * 0.4) + (cpu * 0.6)) * 10) / 10;
  }

  let ramPercent = Math.max(12, Math.min(98.5, Math.round((baseRamPercent + (wave * 0.3) + jitter * 0.2) * 10) / 10));
  if (previousSnapshot) {
    ramPercent = Math.round(((previousSnapshot.ram_percent * 0.7) + (ramPercent * 0.3)) * 10) / 10;
  }

  const ramUsedGb = Math.round(((ramPercent / 100) * node.total_ram_gb) * 10) / 10;
  const netIn = Math.max(5, Math.round((baseNetIn * netSpikeMultiplier + jitter * 5) * 10) / 10);
  const netOut = Math.max(8, Math.round((baseNetOut * netSpikeMultiplier + jitter * 6) * 10) / 10);

  // Per-core utilization array
  const coreLoads: number[] = [];
  const maxCoresToSimulate = Math.min(node.cpu_cores, 16);
  for (let c = 0; c < maxCoresToSimulate; c++) {
    const coreOffset = Math.sin(c * 0.8 + tickCount * 0.2) * 10;
    const coreJitter = (Math.random() - 0.5) * 8;
    const coreLoad = Math.max(2, Math.min(100, Math.round((cpu + coreOffset + coreJitter) * 10) / 10));
    coreLoads.push(coreLoad);
  }

  // Container health scoring using formula:
  // Math.max(0, Math.min(100, Math.round(((running / Math.max(1, total)) * 100) - (failed * 15))))
  const healthScore = calculateContainerHealth(
    runningContainers,
    totalContainers,
    failedContainers
  );

  const snapshot: MetricSnapshotRecord = {
    node_id: node.id,
    timestamp: Date.now(),
    cpu_percent: cpu,
    per_core_cpu: JSON.stringify(coreLoads),
    ram_used_gb: ramUsedGb,
    ram_total_gb: node.total_ram_gb,
    ram_percent: ramPercent,
    network_in_mbps: netIn,
    network_out_mbps: netOut,
    container_total: totalContainers,
    container_running: runningContainers,
    container_failed: failedContainers,
    health_score: healthScore
  };

  return snapshot;
}

/**
 * Evaluates triggers and manages incident creation when rules are violated.
 */
export async function evaluateAndTriggerIncidents(
  snapshot: MetricSnapshotRecord
): Promise<void> {
  const alertRules = await getAllAlertRules(true); // active rules only
  const triggeredAlerts = evaluateAlertRules(snapshot, alertRules);

  if (triggeredAlerts.length === 0) return;

  // Check open/investigating incidents to avoid duplicate active incidents for the same rule & node
  const activeIncidents = await getIncidents({
    nodeId: snapshot.node_id,
    status: 'open'
  });
  const investigatingIncidents = await getIncidents({
    nodeId: snapshot.node_id,
    status: 'investigating'
  });
  const allCurrentIncidents = [...activeIncidents, ...investigatingIncidents];

  for (const alert of triggeredAlerts) {
    const existing = allCurrentIncidents.find(
      (inc) => inc.alert_rule_id === alert.ruleId
    );

    if (!existing) {
      const incidentId = `inc-auto-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const title = `${alert.metricName.toUpperCase()} Threshold Exceeded`;
      const description = `Node ${snapshot.node_id}: ${alert.message}. Current value: ${alert.currentValue}`;

      const newIncident: IncidentRecord = {
        id: incidentId,
        node_id: snapshot.node_id,
        alert_rule_id: alert.ruleId,
        title,
        description,
        severity: alert.severity,
        status: 'open',
        timestamp: Date.now(),
        resolved_at: null
      };

      await createIncident(newIncident);
      console.log(`[Incident Triggered] ${newIncident.title} on node ${snapshot.node_id}`);
    }
  }
}

/**
 * Executes a single simulation tick across all nodes.
 */
export async function tickSimulation(): Promise<MetricSnapshotRecord[]> {
  const nodes = await getAllNodes();
  const createdSnapshots: MetricSnapshotRecord[] = [];

  for (const node of nodes) {
    if (node.status === 'offline') continue;

    const snapshot = await generateTelemetryForNode(node);
    await insertSnapshot(snapshot);
    createdSnapshots.push(snapshot);

    // Update node status dynamically based on metric severity
    let currentStatus = node.status;
    if (snapshot.cpu_percent > 90 || snapshot.ram_percent > 92 || snapshot.health_score < 50) {
      currentStatus = 'critical';
    } else if (snapshot.cpu_percent > 75 || snapshot.ram_percent > 85 || snapshot.health_score < 75) {
      currentStatus = 'degraded';
    } else {
      currentStatus = 'online';
    }

    if (currentStatus !== node.status) {
      await updateNode(node.id, { status: currentStatus });
    }

    // Check alert rules and trigger incidents
    await evaluateAndTriggerIncidents(snapshot);
  }

  return createdSnapshots;
}

/**
 * Starts continuous background telemetry simulation.
 */
export function startSimulation(intervalMs: number = 4000): void {
  if (isSimulationRunning) return;
  isSimulationRunning = true;
  console.log(`[Simulation] Telemetry simulation started (interval: ${intervalMs}ms)`);

  simulationTimer = setInterval(async () => {
    try {
      await tickSimulation();
    } catch (err) {
      console.error('[Simulation Error]:', err);
    }
  }, intervalMs);
}

/**
 * Stops background telemetry simulation.
 */
export function stopSimulation(): void {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }
  isSimulationRunning = false;
  console.log('[Simulation] Telemetry simulation stopped.');
}

export function isSimulationActive(): boolean {
  return isSimulationRunning;
}
