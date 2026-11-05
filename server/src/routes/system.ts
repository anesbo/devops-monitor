import { Router, Request, Response } from 'express';
import {
  getAllNodes,
  getLatestSnapshotsForAllNodes,
  getIncidents,
  getAllAlertRules
} from '../db';
import { aggregateClusterHealth } from '../services/metricsCalculator';

export const systemRouter = Router();

/**
 * GET /api/system/health
 * Summary cluster stats: total nodes, online, critical, avg CPU, avg RAM
 */
systemRouter.get('/health', async (_req: Request, res: Response) => {
  try {
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

    res.json({
      ...clusterHealth,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch cluster health', details: err.message });
  }
});

/**
 * GET /api/logs
 * Live log entries across nodes
 */
systemRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const nodeId = req.query.nodeId as string | undefined;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const nodes = await getAllNodes();
    const nodeMap = new Map(nodes.map((n) => [n.id, n.name]));

    // Generate realistic server event logs
    const services = ['traefik.access', 'torch.runtime', 'postgres.wal', 'kubelet.cadvisor', 'redis-server', 'minio.s3'];
    const levels = ['info', 'info', 'info', 'warn', 'error'] as const;
    const messages = [
      'HTTP/2 GET /api/v1/telemetry 200 4.1ms - 1.2KB',
      'Container health check passed [status=READY] for pod/api-gateway',
      'Cluster gossip sync completed: shards healthy, replication lag < 1ms',
      'Checkpoint lag spike: buffer eviction rate 14,800 pages/s',
      'Cache tier hit ratio 98.4% across 1.2M operations',
      'Automated garbage collection completed on tier-2 volume',
      'Thermal throttle warning: GPU package temperature 81C',
      'TLS certificate verification completed successfully'
    ];

    const logs = [];
    const now = Date.now();

    for (let i = 0; i < limit; i++) {
      const targetNode = nodeId && nodeId !== 'all'
        ? nodes.find((n) => n.id === nodeId) || nodes[0]
        : nodes[i % nodes.length];

      if (!targetNode) continue;

      const time = new Date(now - i * 4500);
      const srv = services[i % services.length];
      const lvl = levels[i % levels.length];
      const msg = messages[i % messages.length];

      logs.push({
        id: `log-${i + 1}`,
        timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isoTimestamp: time.toISOString(),
        nodeId: targetNode.id,
        nodeName: targetNode.name,
        service: srv,
        level: lvl,
        message: `${msg} [${targetNode.hostname}]`
      });
    }

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch logs', details: err.message });
  }
});
