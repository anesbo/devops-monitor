import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../app';
import {
  initDb,
  closeDb,
  createNode,
  getNodeById,
  getSnapshotsForNode,
  createAlertRule,
  getIncidents,
  runQuery
} from '../db';
import { NodeRecord, AlertRuleRecord } from '../types';

const TEST_DB_PATH = path.resolve(__dirname, 'test-ingest.sqlite');
const app = createApp();

describe('POST /api/metrics/ingest - Telemetry Ingestion Integration Tests', () => {
  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {
        // ignore lock
      }
    }
    await initDb(TEST_DB_PATH);
  });

  afterAll(async () => {
    await closeDb();
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {
        // ignore lock
      }
    }
    delete process.env.NODE_INGEST_SECRET;
  });

  beforeEach(async () => {
    delete process.env.NODE_INGEST_SECRET;
    // Clear test tables
    await runQuery('DELETE FROM incidents');
    await runQuery('DELETE FROM alert_rules');
    await runQuery('DELETE FROM metric_snapshots');
    await runQuery('DELETE FROM nodes');
  });

  describe('1. Valid Telemetry Ingestion', () => {
    it('auto-registers a new node if not found and saves the metric snapshot', async () => {
      const payload = {
        nodeId: 'agent-node-new-01',
        name: 'Worker Node Agent 01',
        hostname: 'worker-01.internal',
        ip: '192.168.1.101',
        os: 'Linux Ubuntu 22.04',
        region: 'us-west-2',
        cpuPercent: 42.5,
        perCoreCpu: [40, 45, 42, 43],
        ramUsedGb: 8.2,
        ramTotalGb: 32.0,
        networkInMbps: 125.4,
        networkOutMbps: 88.2,
        containerTotal: 10,
        containerRunning: 10,
        containerFailed: 0
      };

      const res = await request(app)
        .post('/api/metrics/ingest')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.nodeId).toBe('agent-node-new-01');
      expect(typeof res.body.snapshotId).toBe('number');
      expect(res.body.healthScore).toBe(100);

      // Verify node auto-registration in DB
      const node = await getNodeById('agent-node-new-01');
      expect(node).not.toBeNull();
      expect(node?.id).toBe('agent-node-new-01');
      expect(node?.name).toBe('Worker Node Agent 01');
      expect(node?.status).toBe('online');
      expect(node?.last_seen).toBeDefined();

      // Verify metric snapshot in DB
      const snapshots = await getSnapshotsForNode('agent-node-new-01', 10);
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].cpu_percent).toBe(42.5);
      expect(snapshots[0].ram_used_gb).toBe(8.2);
      expect(snapshots[0].ram_total_gb).toBe(32);
      expect(snapshots[0].network_in_mbps).toBe(125.4);
      expect(snapshots[0].network_out_mbps).toBe(88.2);
      expect(snapshots[0].container_running).toBe(10);
      expect(snapshots[0].container_failed).toBe(0);
      expect(snapshots[0].health_score).toBe(100);
    });

    it('updates an existing node and updates status to online & records snapshot', async () => {
      const existingNode: NodeRecord = {
        id: 'node-existing-01',
        name: 'Existing Node',
        hostname: 'existing.local',
        ip: '10.0.0.5',
        status: 'offline',
        os: 'Linux',
        region: 'eu-central',
        cpu_cores: 8,
        total_ram_gb: 64,
        tags: JSON.stringify(['db']),
        created_at: Date.now() - 50000,
        last_seen: Date.now() - 50000
      };
      await createNode(existingNode);

      const ingestPayload = {
        nodeId: 'node-existing-01',
        cpuPercent: 35.0,
        ramUsedGb: 16.0,
        ramTotalGb: 64.0,
        networkInMbps: 45.0,
        networkOutMbps: 60.0,
        containerTotal: 8,
        containerRunning: 8,
        containerFailed: 0
      };

      const res = await request(app)
        .post('/api/metrics/ingest')
        .send(ingestPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const updatedNode = await getNodeById('node-existing-01');
      expect(updatedNode?.status).toBe('online');
      expect(updatedNode?.last_seen).toBeGreaterThanOrEqual(existingNode.last_seen!);

      const snapshots = await getSnapshotsForNode('node-existing-01', 10);
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].cpu_percent).toBe(35);
    });

    it('dynamically marks node status as degraded or critical under extreme telemetry', async () => {
      const node: NodeRecord = {
        id: 'node-stress-test',
        name: 'Stress Node',
        hostname: 'stress.local',
        ip: '10.0.0.99',
        status: 'online',
        os: 'Linux',
        region: 'us-east',
        cpu_cores: 4,
        total_ram_gb: 16,
        tags: JSON.stringify(['stress']),
        created_at: Date.now()
      };
      await createNode(node);

      // Degraded: CPU > 75%
      await request(app)
        .post('/api/metrics/ingest')
        .send({
          nodeId: 'node-stress-test',
          cpuPercent: 78.0,
          ramUsedGb: 8.0,
          ramTotalGb: 16.0,
          containerTotal: 5,
          containerRunning: 5,
          containerFailed: 0
        });

      let updated = await getNodeById('node-stress-test');
      expect(updated?.status).toBe('degraded');

      // Critical: CPU > 90%
      await request(app)
        .post('/api/metrics/ingest')
        .send({
          nodeId: 'node-stress-test',
          cpuPercent: 95.5,
          ramUsedGb: 15.5,
          ramTotalGb: 16.0,
          containerTotal: 5,
          containerRunning: 2,
          containerFailed: 3
        });

      updated = await getNodeById('node-stress-test');
      expect(updated?.status).toBe('critical');
    });

    it('supports snake_case fields commonly sent by minimal agents (node_id, cpu_percent, etc.)', async () => {
      const snakePayload = {
        node_id: 'snake-case-node',
        cpu_percent: 55.4,
        per_core_cpu: [50, 60],
        ram_used_gb: 4.5,
        ram_total_gb: 16.0,
        network_in_mbps: 30.2,
        network_out_mbps: 45.1,
        container_total: 4,
        container_running: 3,
        container_failed: 1
      };

      const res = await request(app)
        .post('/api/metrics/ingest')
        .send(snakePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const snapshots = await getSnapshotsForNode('snake-case-node', 5);
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].cpu_percent).toBe(55.4);
      expect(snapshots[0].container_running).toBe(3);
      expect(snapshots[0].container_failed).toBe(1);
    });
  });

  describe('2. Alert Rule Violation & Incident Creation', () => {
    it('automatically triggers an incident when ingested metrics violate active alert rules', async () => {
      // 1. Create a node
      await createNode({
        id: 'node-alert-target',
        name: 'Alert Target Server',
        hostname: 'alert.target.local',
        ip: '10.10.10.10',
        status: 'online',
        os: 'Ubuntu',
        region: 'us-east',
        cpu_cores: 8,
        total_ram_gb: 32,
        tags: '[]',
        created_at: Date.now()
      });

      // 2. Create an active CPU threshold alert rule (>= 80%)
      const cpuRule: AlertRuleRecord = {
        id: 'rule-high-cpu-80',
        node_id: 'node-alert-target',
        metric_name: 'cpu',
        operator: '>=',
        threshold: 80.0,
        severity: 'critical',
        is_active: 1,
        created_at: Date.now()
      };
      await createAlertRule(cpuRule);

      // Verify no open incidents initially
      const initialIncidents = await getIncidents({ nodeId: 'node-alert-target' });
      expect(initialIncidents.length).toBe(0);

      // 3. Post telemetry snapshot violating the rule (CPU = 89.2%)
      const ingestRes = await request(app)
        .post('/api/metrics/ingest')
        .send({
          nodeId: 'node-alert-target',
          cpuPercent: 89.2,
          ramUsedGb: 12.0,
          ramTotalGb: 32.0,
          networkInMbps: 50.0,
          networkOutMbps: 50.0,
          containerTotal: 4,
          containerRunning: 4,
          containerFailed: 0
        });

      expect(ingestRes.status).toBe(201);

      // 4. Verify that an incident was triggered and persisted in DB
      const incidents = await getIncidents({ nodeId: 'node-alert-target' });
      expect(incidents.length).toBe(1);
      expect(incidents[0].alert_rule_id).toBe('rule-high-cpu-80');
      expect(incidents[0].severity).toBe('critical');
      expect(incidents[0].status).toBe('open');
      expect(incidents[0].title).toContain('CPU');
      expect(incidents[0].description).toContain('89.2');

      // 5. Subsequent violation should not create duplicate open incident
      await request(app)
        .post('/api/metrics/ingest')
        .send({
          nodeId: 'node-alert-target',
          cpuPercent: 91.0,
          ramUsedGb: 12.0,
          ramTotalGb: 32.0,
          containerTotal: 4,
          containerRunning: 4,
          containerFailed: 0
        });

      const incidentsAfterSecondTick = await getIncidents({ nodeId: 'node-alert-target' });
      expect(incidentsAfterSecondTick.length).toBe(1);
    });

    it('does not trigger incidents if metrics do not breach threshold', async () => {
      await createNode({
        id: 'node-safe',
        name: 'Safe Server',
        hostname: 'safe.local',
        ip: '10.10.10.11',
        status: 'online',
        os: 'Ubuntu',
        region: 'us-east',
        cpu_cores: 8,
        total_ram_gb: 32,
        tags: '[]',
        created_at: Date.now()
      });

      await createAlertRule({
        id: 'rule-safe-cpu',
        node_id: 'node-safe',
        metric_name: 'cpu',
        operator: '>=',
        threshold: 90.0,
        severity: 'critical',
        is_active: 1,
        created_at: Date.now()
      });

      // Post safe metrics
      await request(app)
        .post('/api/metrics/ingest')
        .send({
          nodeId: 'node-safe',
          cpuPercent: 45.0,
          ramUsedGb: 10.0,
          ramTotalGb: 32.0
        });

      const incidents = await getIncidents({ nodeId: 'node-safe' });
      expect(incidents.length).toBe(0);
    });
  });

  describe('3. Validation and Bad Request Handling (400)', () => {
    it('returns 400 Bad Request when nodeId is missing or empty', async () => {
      const res = await request(app)
        .post('/api/metrics/ingest')
        .send({
          cpuPercent: 45.0,
          ramUsedGb: 4.0
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('nodeId');
    });

    it('returns 400 Bad Request when cpuPercent is missing or non-numeric', async () => {
      const resNoCpu = await request(app)
        .post('/api/metrics/ingest')
        .send({
          nodeId: 'node-missing-cpu',
          ramUsedGb: 4.0
        });

      expect(resNoCpu.status).toBe(400);
      expect(resNoCpu.body.error).toContain('cpuPercent');

      const resInvalidCpu = await request(app)
        .post('/api/metrics/ingest')
        .send({
          nodeId: 'node-missing-cpu',
          cpuPercent: 'not-a-number'
        });

      expect(resInvalidCpu.status).toBe(400);
      expect(resInvalidCpu.body.error).toContain('cpuPercent');
    });
  });

  describe('4. Optional Authentication Security', () => {
    it('enforces NODE_INGEST_SECRET when configured in environment', async () => {
      process.env.NODE_INGEST_SECRET = 'super-secret-agent-key-123';

      const validPayload = {
        nodeId: 'auth-node-1',
        cpuPercent: 30.0
      };

      // 1. Without auth header -> 401
      const resNoAuth = await request(app)
        .post('/api/metrics/ingest')
        .send(validPayload);
      expect(resNoAuth.status).toBe(401);
      expect(resNoAuth.body.error).toContain('Unauthorized');

      // 2. With incorrect secret -> 401
      const resBadAuth = await request(app)
        .post('/api/metrics/ingest')
        .set('X-Apex-Node-Secret', 'wrong-secret')
        .send(validPayload);
      expect(resBadAuth.status).toBe(401);

      // 3. With valid X-Apex-Node-Secret -> 201
      const resValidApexHeader = await request(app)
        .post('/api/metrics/ingest')
        .set('X-Apex-Node-Secret', 'super-secret-agent-key-123')
        .send(validPayload);
      expect(resValidApexHeader.status).toBe(201);
      expect(resValidApexHeader.body.success).toBe(true);

      // 4. With valid X-API-Key header -> 201
      const resValidApiKey = await request(app)
        .post('/api/metrics/ingest')
        .set('X-API-Key', 'super-secret-agent-key-123')
        .send({
          nodeId: 'auth-node-1',
          cpuPercent: 35.0
        });
      expect(resValidApiKey.status).toBe(201);

      // 5. With valid Authorization: Bearer <secret> -> 201
      const resValidBearer = await request(app)
        .post('/api/metrics/ingest')
        .set('Authorization', 'Bearer super-secret-agent-key-123')
        .send({
          nodeId: 'auth-node-1',
          cpuPercent: 40.0
        });
      expect(resValidBearer.status).toBe(201);
    });
  });
});
