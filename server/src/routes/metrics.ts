import { Router, Request, Response } from 'express';
import {
  getAllNodes,
  getNodeById,
  createNode,
  updateNode,
  insertSnapshot,
  getLatestSnapshot,
  getLatestSnapshotsForAllNodes,
  getSnapshotsForNode,
  getIncidents,
  getAllAlertRules
} from '../db';
import {
  aggregateClusterHealth,
  averageCpuAcrossCores,
  calculateMemoryPressure,
  calculateContainerHealth
} from '../services/metricsCalculator';
import { tickSimulation, evaluateAndTriggerIncidents } from '../services/simulationService';
import { MetricSnapshotRecord, NodeRecord } from '../types';

export const metricsRouter = Router();

// Convert range string e.g. '5m', '15m', '1h', '24h' to epoch milliseconds
function parseRangeToMilliseconds(range?: string): number {
  if (!range) return 3600 * 1000; // default 1 hour
  switch (range.toLowerCase()) {
    case '5m':
      return 5 * 60 * 1000;
    case '15m':
      return 15 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '6h':
      return 6 * 3600 * 1000;
    case '24h':
      return 24 * 3600 * 1000;
    case '7d':
      return 7 * 24 * 3600 * 1000;
    default:
      return 3600 * 1000;
  }
}

// Format snapshot to standard time-series metric point
function formatSnapshotToMetricPoint(snap: MetricSnapshotRecord) {
  const d = new Date(snap.timestamp);
  return {
    id: snap.id,
    nodeId: snap.node_id,
    timestamp: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isoTimestamp: d.toISOString(),
    epochMs: snap.timestamp,
    cpu: snap.cpu_percent,
    memory: snap.ram_percent,
    disk: Math.min(95, Math.round((40 + snap.cpu_percent * 0.3) * 10) / 10),
    networkIn: snap.network_in_mbps,
    networkOut: snap.network_out_mbps,
    totalThroughput: Math.round((snap.network_in_mbps + snap.network_out_mbps) * 10) / 10,
    healthScore: snap.health_score,
    containerRunning: snap.container_running,
    containerFailed: snap.container_failed,
    containerTotal: snap.container_total,
    perCoreCpu: typeof snap.per_core_cpu === 'string'
      ? JSON.parse(snap.per_core_cpu || '[]')
      : snap.per_core_cpu,
    latency: Math.max(2, Math.round((4.0 + (snap.cpu_percent > 80 ? 45 : 2.5)) * 10) / 10),
    requestsPerSec: Math.round(1800 + snap.cpu_percent * 35),
    errorRate: snap.cpu_percent > 90 ? 1.25 : 0.02
  };
}

/**
 * GET /api/metrics/live
 * Latest metric snapshot for all nodes or filter by ?nodeId=
 */
metricsRouter.get('/live', async (req: Request, res: Response) => {
  try {
    const nodeId = req.query.nodeId as string | undefined;

    if (nodeId && nodeId !== 'all') {
      const snap = await getLatestSnapshot(nodeId);
      if (!snap) {
        res.status(404).json({ error: `No metric snapshots found for node ${nodeId}` });
        return;
      }
      res.json({
        nodeId,
        latestSnapshot: formatSnapshotToMetricPoint(snap),
        rawSnapshot: snap,
        avgCpuAcrossCores: averageCpuAcrossCores(snap.per_core_cpu),
        memoryPressure: calculateMemoryPressure(snap.ram_used_gb, snap.ram_total_gb)
      });
      return;
    }

    // Cluster-wide live telemetry
    const nodes = await getAllNodes();
    const snapshots = await getLatestSnapshotsForAllNodes();
    const activeIncidents = await getIncidents({ status: 'open' });
    const activeRules = await getAllAlertRules(true);

    const clusterHealth = aggregateClusterHealth(
      nodes,
      snapshots,
      activeIncidents.length,
      activeRules.length
    );

    const formattedSnapshots = snapshots.map(formatSnapshotToMetricPoint);

    // Return format compatible with both cluster summary and raw snapshots array
    res.json({
      ...clusterHealth,
      snapshots: formattedSnapshots,
      nodesCount: nodes.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch live metrics', details: err.message });
  }
});

/**
 * GET /api/metrics/history/:nodeId
 * Time-series snapshots for sparklines & historical charts
 * Supports ?limit=50&range=1h
 */
metricsRouter.get('/history/:nodeId', async (req: Request, res: Response) => {
  try {
    const nodeId = String(req.params.nodeId);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 50));
    const range = req.query.range as string | undefined;
    const rangeMs = parseRangeToMilliseconds(range);
    const sinceTimestamp = rangeMs > 0 ? Date.now() - rangeMs : undefined;

    const snapshots = await getSnapshotsForNode(nodeId, limit, sinceTimestamp);
    const metricPoints = snapshots.map(formatSnapshotToMetricPoint);

    res.json(metricPoints);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch history metrics', details: err.message });
  }
});

/**
 * GET /api/metrics/history
 * Query-param based history: supports ?nodeId=&limit=50&range=1h
 */
metricsRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const nodeId = req.query.nodeId as string | undefined;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 50));
    const range = req.query.range as string | undefined;
    const rangeMs = parseRangeToMilliseconds(range);
    const sinceTimestamp = rangeMs > 0 ? Date.now() - rangeMs : undefined;

    if (nodeId && nodeId !== 'all') {
      const snapshots = await getSnapshotsForNode(nodeId, limit, sinceTimestamp);
      res.json(snapshots.map(formatSnapshotToMetricPoint));
      return;
    }

    // Cluster-wide aggregated history or all nodes
    const nodes = await getAllNodes();
    if (nodes.length === 0) {
      res.json([]);
      return;
    }

    // Default to the first node or aggregated
    const primaryNode = nodes[0];
    const snapshots = await getSnapshotsForNode(primaryNode.id, limit, sinceTimestamp);
    res.json(snapshots.map(formatSnapshotToMetricPoint));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch history metrics', details: err.message });
  }
});

/**
 * POST /api/metrics/simulate
 * Force an immediate telemetry tick for all nodes
 */
metricsRouter.post('/simulate', async (_req: Request, res: Response) => {
  try {
    const snapshots = await tickSimulation();
    res.json({
      success: true,
      message: `Generated fresh telemetry snapshots for ${snapshots.length} nodes`,
      snapshots: snapshots.map(formatSnapshotToMetricPoint)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Simulation tick failed', details: err.message });
  }
});

/**
 * POST /api/metrics/ingest
 * Ingest real-server telemetry from ApexPulse agent
 */
metricsRouter.post('/ingest', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Optional Secret Authentication Check
    const configuredSecret = process.env.NODE_INGEST_SECRET;
    if (configuredSecret && configuredSecret.trim().length > 0) {
      const providedSecret =
        req.headers['x-apex-node-secret'] ||
        req.headers['x-api-key'] ||
        (req.headers['authorization']?.startsWith('Bearer ')
          ? req.headers['authorization'].slice(7)
          : undefined);

      if (!providedSecret || providedSecret !== configuredSecret) {
        res.status(401).json({
          error: 'Unauthorized: Missing or invalid authentication secret'
        });
        return;
      }
    }

    // 2. Extract and Normalize Payload Fields
    const body = req.body || {};
    const rawNodeId = body.nodeId || body.node_id || body.token;
    if (!rawNodeId || typeof rawNodeId !== 'string' || rawNodeId.trim().length === 0) {
      res.status(400).json({
        error: 'Validation failed: nodeId (or token/node_id) is required'
      });
      return;
    }
    const nodeId = rawNodeId.trim();

    const cpuPercent = Number(body.cpuPercent !== undefined ? body.cpuPercent : body.cpu_percent);
    if (isNaN(cpuPercent)) {
      res.status(400).json({
        error: 'Validation failed: cpuPercent is required and must be a number'
      });
      return;
    }

    const ramUsedGb = Number(body.ramUsedGb !== undefined ? body.ramUsedGb : body.ram_used_gb) || 0;
    const ramTotalGb = Number(body.ramTotalGb !== undefined ? body.ramTotalGb : body.ram_total_gb) || 16;
    const ramPercent = ramTotalGb > 0
      ? Math.min(100, Math.max(0, Math.round(((ramUsedGb / ramTotalGb) * 100) * 10) / 10))
      : 0;

    const networkInMbps = Number(body.networkInMbps !== undefined ? body.networkInMbps : body.network_in_mbps) || 0;
    const networkOutMbps = Number(body.networkOutMbps !== undefined ? body.networkOutMbps : body.network_out_mbps) || 0;

    const containerTotal = Number(body.containerTotal !== undefined ? body.containerTotal : body.container_total) || 0;
    const containerRunning = Number(body.containerRunning !== undefined ? body.containerRunning : body.container_running) || 0;
    const containerFailed = Number(body.containerFailed !== undefined ? body.containerFailed : body.container_failed) || 0;

    let perCoreCpu = body.perCoreCpu !== undefined ? body.perCoreCpu : body.per_core_cpu;
    if (!perCoreCpu || (Array.isArray(perCoreCpu) && perCoreCpu.length === 0)) {
      perCoreCpu = [cpuPercent];
    }
    const perCoreCpuStr = typeof perCoreCpu === 'string' ? perCoreCpu : JSON.stringify(perCoreCpu);

    // 3. Compute Health Score
    const healthScore = calculateContainerHealth(
      containerRunning,
      containerTotal,
      containerFailed
    );

    // 4. Ensure Node Exists (Auto-register if not yet registered)
    let node = await getNodeById(nodeId);
    if (!node) {
      const coresCount = Array.isArray(perCoreCpu) ? perCoreCpu.length : 4;
      const newNode: NodeRecord = {
        id: nodeId,
        name: body.name || body.hostname || `Node ${nodeId}`,
        hostname: body.hostname || `${nodeId}.local`,
        ip: body.ip || (req.ip || '127.0.0.1').replace(/^::ffff:/, ''),
        status: 'online',
        os: body.os || 'Linux',
        region: body.region || 'default',
        cpu_cores: Number(body.cpuCores || body.cpu_cores) || coresCount,
        total_ram_gb: ramTotalGb,
        tags: body.tags
          ? typeof body.tags === 'string'
            ? body.tags
            : JSON.stringify(body.tags)
          : JSON.stringify(['agent', 'real-server']),
        created_at: Date.now(),
        last_seen: Date.now()
      };
      node = await createNode(newNode);
    } else {
      // Determine node status dynamically
      let calculatedStatus: string = 'online';
      if (cpuPercent > 90 || ramPercent > 92 || healthScore < 50) {
        calculatedStatus = 'critical';
      } else if (cpuPercent > 75 || ramPercent > 85 || healthScore < 75) {
        calculatedStatus = 'degraded';
      }

      await updateNode(nodeId, {
        status: calculatedStatus,
        last_seen: Date.now(),
        ip: body.ip || node.ip
      });
    }

    // 5. Insert Metric Snapshot
    const snapshot: MetricSnapshotRecord = {
      node_id: nodeId,
      timestamp: Number(body.timestamp) || Date.now(),
      cpu_percent: Math.min(100, Math.max(0, Math.round(cpuPercent * 10) / 10)),
      per_core_cpu: perCoreCpuStr,
      ram_used_gb: Math.round(ramUsedGb * 100) / 100,
      ram_total_gb: Math.round(ramTotalGb * 100) / 100,
      ram_percent: ramPercent,
      network_in_mbps: Math.round(networkInMbps * 10) / 10,
      network_out_mbps: Math.round(networkOutMbps * 10) / 10,
      container_total: containerTotal,
      container_running: containerRunning,
      container_failed: containerFailed,
      health_score: healthScore
    };

    const snapshotId = await insertSnapshot(snapshot);
    snapshot.id = snapshotId;

    // 6. Evaluate Alert Rules & Trigger Incidents if Threshold Violated
    await evaluateAndTriggerIncidents(snapshot);

    res.status(201).json({
      success: true,
      message: 'Telemetry snapshot ingested successfully',
      nodeId,
      snapshotId,
      healthScore,
      timestamp: snapshot.timestamp
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to ingest telemetry snapshot', details: err.message });
  }
});
