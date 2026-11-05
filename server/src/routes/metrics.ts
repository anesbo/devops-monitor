import { Router, Request, Response } from 'express';
import {
  getAllNodes,
  getLatestSnapshot,
  getLatestSnapshotsForAllNodes,
  getSnapshotsForNode,
  getIncidents,
  getAllAlertRules
} from '../db';
import {
  aggregateClusterHealth,
  averageCpuAcrossCores,
  calculateMemoryPressure
} from '../services/metricsCalculator';
import { tickSimulation } from '../services/simulationService';
import { MetricSnapshotRecord } from '../types';

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
