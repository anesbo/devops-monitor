import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../app';
import {
  initDb,
  closeDb,
  createNode,
  insertSnapshot,
  createAlertRule,
  createIncident,
  runQuery
} from '../db';
import { NodeRecord, MetricSnapshotRecord, AlertRuleRecord, IncidentRecord } from '../types';

const TEST_DB_PATH = path.resolve(__dirname, 'test-api.sqlite');
const app = createApp();

describe('ApexPulse REST API Endpoint Integration Tests', () => {
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
  });

  beforeEach(async () => {
    // Clear tables
    await runQuery('DELETE FROM incidents');
    await runQuery('DELETE FROM alert_rules');
    await runQuery('DELETE FROM metric_snapshots');
    await runQuery('DELETE FROM nodes');
  });

  describe('Node API Endpoints (/api/nodes)', () => {
    const testNode: NodeRecord = {
      id: 'node-api-test-1',
      name: 'API Test Server',
      hostname: 'api-test.apexpulse.local',
      ip: '10.0.1.99',
      status: 'online',
      os: 'Ubuntu 22.04',
      region: 'us-east',
      cpu_cores: 16,
      total_ram_gb: 64,
      tags: JSON.stringify(['api', 'edge']),
      created_at: Date.now()
    };

    it('GET /api/nodes returns empty array initially, then returns created nodes with telemetry', async () => {
      const emptyRes = await request(app).get('/api/nodes');
      expect(emptyRes.status).toBe(200);
      expect(Array.isArray(emptyRes.body)).toBe(true);
      expect(emptyRes.body.length).toBe(0);

      await createNode(testNode);

      const populatedRes = await request(app).get('/api/nodes');
      expect(populatedRes.status).toBe(200);
      expect(populatedRes.body.length).toBe(1);
      expect(populatedRes.body[0].id).toBe(testNode.id);
      expect(populatedRes.body[0].name).toBe(testNode.name);
      expect(populatedRes.body[0].cpu).toBeDefined();
      expect(populatedRes.body[0].memory).toBeDefined();
      expect(populatedRes.body[0].tags).toEqual(['api', 'edge']);
    });

    it('GET /api/nodes/:id returns 404 for missing node and 200 for existing node', async () => {
      const notFoundRes = await request(app).get('/api/nodes/non-existent-id');
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body.error).toBe('Node not found');

      await createNode(testNode);

      const foundRes = await request(app).get(`/api/nodes/${testNode.id}`);
      expect(foundRes.status).toBe(200);
      expect(foundRes.body.id).toBe(testNode.id);
      expect(foundRes.body.hostname).toBe(testNode.hostname);
      expect(foundRes.body.cores).toBe(16);
      expect(foundRes.body.totalMemoryGb).toBe(64);
    });

    it('POST /api/nodes validates required fields and registers a new node', async () => {
      // Missing required fields
      const badRes = await request(app)
        .post('/api/nodes')
        .send({ name: 'Incomplete Node' });
      expect(badRes.status).toBe(400);
      expect(badRes.body.error).toContain('Missing required fields');

      // Valid registration
      const newPayload = {
        id: 'node-registered-via-post',
        name: 'Registered Worker',
        hostname: 'worker-post.apexpulse.local',
        ip: '10.0.2.55',
        status: 'online',
        os: 'Debian 12',
        region: 'eu-west',
        cpu_cores: 32,
        total_ram_gb: 128,
        tags: ['worker', 'compute']
      };

      const createRes = await request(app)
        .post('/api/nodes')
        .send(newPayload);
      expect(createRes.status).toBe(201);
      expect(createRes.body.id).toBe(newPayload.id);
      expect(createRes.body.tags).toEqual(['worker', 'compute']);

      // Conflict on duplicate ID
      const dupRes = await request(app)
        .post('/api/nodes')
        .send(newPayload);
      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error).toContain('already exists');
    });
  });

  describe('Metrics API Endpoints (/api/metrics)', () => {
    const nodeId = 'node-metrics-api';

    beforeEach(async () => {
      await createNode({
        id: nodeId,
        name: 'Metrics Test Host',
        hostname: 'metrics-host.local',
        ip: '10.0.3.10',
        status: 'online',
        os: 'Ubuntu 22.04',
        region: 'us-east',
        cpu_cores: 8,
        total_ram_gb: 32,
        tags: '[]',
        created_at: Date.now()
      });

      // Insert snapshots
      await insertSnapshot({
        node_id: nodeId,
        timestamp: Date.now() - 60000,
        cpu_percent: 45.0,
        per_core_cpu: '[40, 50]',
        ram_used_gb: 16.0,
        ram_total_gb: 32.0,
        ram_percent: 50.0,
        network_in_mbps: 100.0,
        network_out_mbps: 120.0,
        container_total: 10,
        container_running: 10,
        container_failed: 0,
        health_score: 100
      });

      await insertSnapshot({
        node_id: nodeId,
        timestamp: Date.now(),
        cpu_percent: 65.5,
        per_core_cpu: '[60, 71]',
        ram_used_gb: 20.0,
        ram_total_gb: 32.0,
        ram_percent: 62.5,
        network_in_mbps: 150.0,
        network_out_mbps: 180.0,
        container_total: 10,
        container_running: 9,
        container_failed: 1,
        health_score: 75
      });
    });

    it('GET /api/metrics/live returns cluster telemetry summary and snapshots', async () => {
      const res = await request(app).get('/api/metrics/live');
      expect(res.status).toBe(200);
      expect(res.body.totalNodes).toBe(1);
      expect(res.body.online).toBe(1);
      expect(res.body.avgCpu).toBe(65.5);
      expect(Array.isArray(res.body.snapshots)).toBe(true);
      expect(res.body.snapshots.length).toBe(1);
      expect(res.body.snapshots[0].nodeId).toBe(nodeId);
    });

    it('GET /api/metrics/live?nodeId=:nodeId returns node-specific live metrics and calculation details', async () => {
      const res = await request(app).get(`/api/metrics/live?nodeId=${nodeId}`);
      expect(res.status).toBe(200);
      expect(res.body.nodeId).toBe(nodeId);
      expect(res.body.latestSnapshot.cpu).toBe(65.5);
      expect(res.body.avgCpuAcrossCores).toBe(65.5);
      expect(res.body.memoryPressure.ratio).toBe(0.625);
    });

    it('GET /api/metrics/history/:nodeId returns time-series snapshots with limit & range support', async () => {
      const res = await request(app).get(`/api/metrics/history/${nodeId}?limit=50&range=1h`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].cpu).toBe(45.0);
      expect(res.body[1].cpu).toBe(65.5);
    });
  });

  describe('Alert Rules API Endpoints (/api/alerts)', () => {
    it('GET /api/alerts returns alert incident list or rule list', async () => {
      const res = await request(app).get('/api/alerts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const rulesRes = await request(app).get('/api/alerts?format=rules');
      expect(rulesRes.status).toBe(200);
      expect(Array.isArray(rulesRes.body)).toBe(true);
    });

    it('POST /api/alerts validates inputs and creates an alert rule', async () => {
      const badRes = await request(app)
        .post('/api/alerts')
        .send({ operator: '>=' });
      expect(badRes.status).toBe(400);
      expect(badRes.body.error).toContain('required');

      const rulePayload = {
        id: 'rule-api-cpu-alert',
        metric_name: 'cpu',
        operator: '>=',
        threshold: 85,
        severity: 'critical',
        is_active: 1
      };

      const res = await request(app)
        .post('/api/alerts')
        .send(rulePayload);
      expect(res.status).toBe(201);
      expect(res.body.id).toBe(rulePayload.id);
      expect(res.body.metric_name).toBe('cpu');
      expect(res.body.threshold).toBe(85);
      expect(res.body.severity).toBe('critical');
    });

    it('PUT /api/alerts/:id updates an existing alert rule', async () => {
      const rule: AlertRuleRecord = {
        id: 'rule-to-update',
        node_id: null,
        metric_name: 'ram',
        operator: '>=',
        threshold: 80,
        severity: 'warning',
        is_active: 1,
        created_at: Date.now()
      };
      await createAlertRule(rule);

      const updateRes = await request(app)
        .put(`/api/alerts/${rule.id}`)
        .send({ threshold: 92, severity: 'critical', is_active: 0 });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.threshold).toBe(92);
      expect(updateRes.body.severity).toBe('critical');
      expect(updateRes.body.is_active).toBe(0);

      // 404 on missing rule
      const notFoundRes = await request(app)
        .put('/api/alerts/non-existent-rule')
        .send({ threshold: 50 });
      expect(notFoundRes.status).toBe(404);
    });

    it('DELETE /api/alerts/:id removes an alert rule', async () => {
      const rule: AlertRuleRecord = {
        id: 'rule-to-delete',
        node_id: null,
        metric_name: 'network',
        operator: '>=',
        threshold: 500,
        severity: 'warning',
        is_active: 1,
        created_at: Date.now()
      };
      await createAlertRule(rule);

      const delRes = await request(app).delete(`/api/alerts/${rule.id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const delAgain = await request(app).delete(`/api/alerts/${rule.id}`);
      expect(delAgain.status).toBe(404);
    });
  });

  describe('Incidents API Endpoints (/api/incidents)', () => {
    const nodeId = 'node-inc-api-test';

    beforeEach(async () => {
      await createNode({
        id: nodeId,
        name: 'Incident API Host',
        hostname: 'inc-host.local',
        ip: '10.0.4.1',
        status: 'online',
        os: 'Ubuntu 22.04',
        region: 'us-east',
        cpu_cores: 8,
        total_ram_gb: 32,
        tags: '[]',
        created_at: Date.now()
      });
    });

    it('GET /api/incidents returns incidents and filters by severity, status, and search', async () => {
      await createIncident({
        id: 'inc-api-1',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'CPU Overheat Alert',
        description: 'Core 0 thermal throttling',
        severity: 'critical',
        status: 'open',
        timestamp: 1000,
        resolved_at: null
      });

      await createIncident({
        id: 'inc-api-2',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'RAM High Watermark',
        description: 'Cache pressure',
        severity: 'warning',
        status: 'resolved',
        timestamp: 2000,
        resolved_at: 2500
      });

      // Filter by severity
      const critRes = await request(app).get('/api/incidents?severity=critical');
      expect(critRes.status).toBe(200);
      expect(critRes.body.length).toBe(1);
      expect(critRes.body[0].id).toBe('inc-api-1');

      // Filter by status
      const resRes = await request(app).get('/api/incidents?status=resolved');
      expect(resRes.status).toBe(200);
      expect(resRes.body.length).toBe(1);
      expect(resRes.body[0].id).toBe('inc-api-2');

      // Filter by search
      const searchRes = await request(app).get('/api/incidents?search=Overheat');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.length).toBe(1);
      expect(searchRes.body[0].id).toBe('inc-api-1');
    });

    it('POST /api/incidents registers a new incident', async () => {
      const newInc = {
        id: 'inc-newly-created',
        nodeId,
        title: 'Network Packet Loss Detected',
        description: '15% packet loss on eth0',
        severity: 'critical',
        status: 'open'
      };

      const res = await request(app)
        .post('/api/incidents')
        .send(newInc);
      expect(res.status).toBe(201);
      expect(res.body.id).toBe(newInc.id);
      expect(res.body.title).toBe(newInc.title);
      expect(res.body.nodeName).toBe('Incident API Host');
    });

    it('PATCH /api/incidents/:id updates incident status to investigating and resolved', async () => {
      const incident: IncidentRecord = {
        id: 'inc-to-patch',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'Disk space low',
        description: 'Root partition at 92%',
        severity: 'warning',
        status: 'open',
        timestamp: Date.now() - 30000,
        resolved_at: null
      };
      await createIncident(incident);

      // Transition to investigating
      const patchInvRes = await request(app)
        .patch(`/api/incidents/${incident.id}`)
        .send({ status: 'investigating' });
      expect(patchInvRes.status).toBe(200);
      expect(patchInvRes.body.status).toBe('investigating');
      expect(patchInvRes.body.resolvedAt).toBeNull();

      // Transition to resolved
      const patchResRes = await request(app)
        .patch(`/api/incidents/${incident.id}`)
        .send({ status: 'resolved' });
      expect(patchResRes.status).toBe(200);
      expect(patchResRes.body.status).toBe('resolved');
      expect(patchResRes.body.resolvedAt).not.toBeNull();

      // 404 for unknown incident
      const notFoundRes = await request(app)
        .patch('/api/incidents/unknown-inc-id')
        .send({ status: 'resolved' });
      expect(notFoundRes.status).toBe(404);
    });
  });
});
