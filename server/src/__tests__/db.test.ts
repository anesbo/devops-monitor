import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  initDb,
  closeDb,
  getDb,
  createNode,
  getAllNodes,
  getNodeById,
  updateNode,
  deleteNode,
  insertSnapshot,
  getLatestSnapshot,
  getLatestSnapshotsForAllNodes,
  getSnapshotsForNode,
  createAlertRule,
  getAllAlertRules,
  getAlertRuleById,
  updateAlertRule,
  deleteAlertRule,
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncident,
  runQuery
} from '../db/db';
import { NodeRecord, MetricSnapshotRecord, AlertRuleRecord, IncidentRecord } from '../types';

const TEST_DB_PATH = path.resolve(__dirname, 'test-db.sqlite');

describe('Database CRUD Integration Tests', () => {
  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {
        // file lock fallback
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
        // cleanup error ignored
      }
    }
  });

  beforeEach(async () => {
    // Clear tables between test suites for test isolation
    await runQuery('DELETE FROM incidents');
    await runQuery('DELETE FROM alert_rules');
    await runQuery('DELETE FROM metric_snapshots');
    await runQuery('DELETE FROM nodes');
  });

  describe('Node Insertion, Retrieval, Updates, and Deletion', () => {
    const sampleNode: NodeRecord = {
      id: 'node-us-east-test',
      name: 'Test Worker Node 01',
      hostname: 'worker-01.us-east.test',
      ip: '10.0.10.25',
      status: 'online',
      os: 'Ubuntu 22.04 LTS',
      region: 'us-east',
      cpu_cores: 16,
      total_ram_gb: 64,
      tags: JSON.stringify(['api', 'k8s', 'production']),
      created_at: Date.now()
    };

    it('inserts a new node and retrieves it by ID and in list', async () => {
      const created = await createNode(sampleNode);
      expect(created.id).toBe(sampleNode.id);
      expect(created.name).toBe(sampleNode.name);
      expect(created.status).toBe('online');
      expect(created.cpu_cores).toBe(16);

      const fetched = await getNodeById(sampleNode.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.hostname).toBe(sampleNode.hostname);
      expect(fetched?.region).toBe('us-east');

      const allNodes = await getAllNodes();
      expect(allNodes.length).toBe(1);
      expect(allNodes[0].id).toBe(sampleNode.id);
    });

    it('updates node status across lifecycle states (online -> degraded -> critical -> offline)', async () => {
      await createNode(sampleNode);

      // Status: online -> degraded
      const degraded = await updateNode(sampleNode.id, { status: 'degraded' });
      expect(degraded?.status).toBe('degraded');

      // Status: degraded -> critical
      const critical = await updateNode(sampleNode.id, { status: 'critical' });
      expect(critical?.status).toBe('critical');

      // Status: critical -> offline
      const offline = await updateNode(sampleNode.id, { status: 'offline' });
      expect(offline?.status).toBe('offline');

      // Verify persistence
      const verified = await getNodeById(sampleNode.id);
      expect(verified?.status).toBe('offline');
    });

    it('updates specifications and tags', async () => {
      await createNode(sampleNode);

      const updated = await updateNode(sampleNode.id, {
        cpu_cores: 32,
        total_ram_gb: 128,
        tags: JSON.stringify(['api', 'upgraded'])
      });

      expect(updated?.cpu_cores).toBe(32);
      expect(updated?.total_ram_gb).toBe(128);
      expect(updated?.tags).toContain('upgraded');
    });

    it('returns null when updating non-existent node', async () => {
      const nonExistent = await updateNode('unknown-node', { status: 'offline' });
      expect(nonExistent).toBeNull();
    });

    it('deletes a node successfully', async () => {
      await createNode(sampleNode);
      const deleted = await deleteNode(sampleNode.id);
      expect(deleted).toBe(true);

      const fetched = await getNodeById(sampleNode.id);
      expect(fetched).toBeNull();

      const all = await getAllNodes();
      expect(all.length).toBe(0);
    });
  });

  describe('Metric Snapshot Batch Insertion and Historical Range Queries', () => {
    const nodeId = 'node-metrics-test';

    beforeEach(async () => {
      await createNode({
        id: nodeId,
        name: 'Metrics Test Server',
        hostname: 'metrics.test.internal',
        ip: '10.0.5.1',
        status: 'online',
        os: 'Debian 12',
        region: 'eu-west',
        cpu_cores: 8,
        total_ram_gb: 32,
        tags: '[]',
        created_at: Date.now()
      });
    });

    it('inserts a metric snapshot and retrieves the latest snapshot', async () => {
      const snapshot: MetricSnapshotRecord = {
        node_id: nodeId,
        timestamp: 1000,
        cpu_percent: 45.5,
        per_core_cpu: JSON.stringify([40, 51]),
        ram_used_gb: 16.0,
        ram_total_gb: 32.0,
        ram_percent: 50.0,
        network_in_mbps: 120.5,
        network_out_mbps: 180.2,
        container_total: 10,
        container_running: 10,
        container_failed: 0,
        health_score: 100
      };

      const id = await insertSnapshot(snapshot);
      expect(id).toBeGreaterThan(0);

      const latest = await getLatestSnapshot(nodeId);
      expect(latest).not.toBeNull();
      expect(latest?.node_id).toBe(nodeId);
      expect(latest?.cpu_percent).toBe(45.5);
      expect(latest?.health_score).toBe(100);
    });

    it('handles batch insertion and retrieves time-series in chronological order with limit', async () => {
      const baseTime = 1700000000000;
      const count = 10;

      for (let i = 0; i < count; i++) {
        await insertSnapshot({
          node_id: nodeId,
          timestamp: baseTime + i * 60000, // every 1 min
          cpu_percent: 20 + i * 5,
          per_core_cpu: '[]',
          ram_used_gb: 10 + i,
          ram_total_gb: 32,
          ram_percent: 30 + i * 2,
          network_in_mbps: 50,
          network_out_mbps: 50,
          container_total: 8,
          container_running: 8,
          container_failed: 0,
          health_score: 100
        });
      }

      // Query with limit = 5
      const limited = await getSnapshotsForNode(nodeId, 5);
      expect(limited.length).toBe(5);
      // Verify chronological order (oldest to newest)
      expect(limited[0].timestamp).toBeLessThan(limited[4].timestamp);
      // The last element should be the latest snapshot (i=9)
      expect(limited[4].cpu_percent).toBe(20 + 9 * 5);
    });

    it('queries snapshots filtered by historical timestamp range (sinceTimestamp)', async () => {
      const baseTime = 1700000000000;

      for (let i = 0; i < 6; i++) {
        await insertSnapshot({
          node_id: nodeId,
          timestamp: baseTime + i * 10000,
          cpu_percent: 30 + i,
          per_core_cpu: '[]',
          ram_used_gb: 12,
          ram_total_gb: 32,
          ram_percent: 37.5,
          network_in_mbps: 60,
          network_out_mbps: 60,
          container_total: 6,
          container_running: 6,
          container_failed: 0,
          health_score: 100
        });
      }

      // Query snapshots from i=3 onward
      const cutoff = baseTime + 3 * 10000;
      const filtered = await getSnapshotsForNode(nodeId, 50, cutoff);
      expect(filtered.length).toBe(3);
      expect(filtered[0].timestamp).toBe(cutoff);
    });

    it('retrieves latest snapshot for all nodes', async () => {
      const secondNodeId = 'node-second-test';
      await createNode({
        id: secondNodeId,
        name: 'Second Test Server',
        hostname: 'second.test.internal',
        ip: '10.0.5.2',
        status: 'online',
        os: 'Alpine Linux',
        region: 'us-west',
        cpu_cores: 4,
        total_ram_gb: 16,
        tags: '[]',
        created_at: Date.now()
      });

      await insertSnapshot({
        node_id: nodeId,
        timestamp: 1000,
        cpu_percent: 40,
        per_core_cpu: '[]',
        ram_used_gb: 16,
        ram_total_gb: 32,
        ram_percent: 50,
        network_in_mbps: 50,
        network_out_mbps: 50,
        container_total: 4,
        container_running: 4,
        container_failed: 0,
        health_score: 100
      });

      await insertSnapshot({
        node_id: secondNodeId,
        timestamp: 2000,
        cpu_percent: 75,
        per_core_cpu: '[]',
        ram_used_gb: 12,
        ram_total_gb: 16,
        ram_percent: 75,
        network_in_mbps: 90,
        network_out_mbps: 90,
        container_total: 4,
        container_running: 3,
        container_failed: 1,
        health_score: 60
      });

      const allLatest = await getLatestSnapshotsForAllNodes();
      expect(allLatest.length).toBe(2);
      const node1Snap = allLatest.find(s => s.node_id === nodeId);
      const node2Snap = allLatest.find(s => s.node_id === secondNodeId);
      expect(node1Snap?.cpu_percent).toBe(40);
      expect(node2Snap?.cpu_percent).toBe(75);
    });
  });

  describe('Alert Rule Creation, Updates, Toggling is_active, and Deletion', () => {
    const sampleRule: AlertRuleRecord = {
      id: 'rule-test-cpu-high',
      node_id: null, // cluster-wide
      metric_name: 'cpu',
      operator: '>=',
      threshold: 85,
      severity: 'critical',
      is_active: 1,
      created_at: Date.now()
    };

    it('creates an alert rule and retrieves it', async () => {
      const created = await createAlertRule(sampleRule);
      expect(created.id).toBe(sampleRule.id);
      expect(created.metric_name).toBe('cpu');
      expect(created.threshold).toBe(85);
      expect(created.severity).toBe('critical');
      expect(created.is_active).toBe(1);

      const fetched = await getAlertRuleById(sampleRule.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.operator).toBe('>=');
    });

    it('updates threshold, operator, and severity of an alert rule', async () => {
      await createAlertRule(sampleRule);

      const updated = await updateAlertRule(sampleRule.id, {
        threshold: 90,
        severity: 'warning',
        operator: '>'
      });

      expect(updated?.threshold).toBe(90);
      expect(updated?.severity).toBe('warning');
      expect(updated?.operator).toBe('>');
    });

    it('toggles is_active on and off, respecting activeOnly filters', async () => {
      await createAlertRule(sampleRule);

      // Initial state: active
      let allActive = await getAllAlertRules(true);
      expect(allActive.length).toBe(1);

      // Toggle to inactive (is_active: 0)
      const deactivated = await updateAlertRule(sampleRule.id, { is_active: 0 });
      expect(deactivated?.is_active).toBe(0);

      // Verify activeOnly returns 0 items
      allActive = await getAllAlertRules(true);
      expect(allActive.length).toBe(0);

      // Verify standard getAllAlertRules still returns it
      const allRules = await getAllAlertRules(false);
      expect(allRules.length).toBe(1);

      // Toggle back to active (is_active: 1)
      const reactivated = await updateAlertRule(sampleRule.id, { is_active: 1 });
      expect(reactivated?.is_active).toBe(1);

      allActive = await getAllAlertRules(true);
      expect(allActive.length).toBe(1);
    });

    it('deletes an alert rule cleanly', async () => {
      await createAlertRule(sampleRule);

      const deleted = await deleteAlertRule(sampleRule.id);
      expect(deleted).toBe(true);

      const fetched = await getAlertRuleById(sampleRule.id);
      expect(fetched).toBeNull();
    });
  });

  describe('Incident Logging, Filtering, and Resolution', () => {
    const nodeId = 'node-incident-test';

    beforeEach(async () => {
      await createNode({
        id: nodeId,
        name: 'Incident Host',
        hostname: 'incident-host.internal',
        ip: '10.0.7.1',
        status: 'critical',
        os: 'Ubuntu 22.04',
        region: 'us-east',
        cpu_cores: 16,
        total_ram_gb: 64,
        tags: '[]',
        created_at: Date.now()
      });
    });

    it('creates an incident record and retrieves by ID', async () => {
      const incident: IncidentRecord = {
        id: 'inc-test-01',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'CPU Overload on Main Cluster',
        description: 'Sustained 98% CPU load over 5 minutes window.',
        severity: 'critical',
        status: 'open',
        timestamp: Date.now(),
        resolved_at: null
      };

      const created = await createIncident(incident);
      expect(created.id).toBe('inc-test-01');
      expect(created.status).toBe('open');

      const fetched = await getIncidentById('inc-test-01');
      expect(fetched?.title).toBe(incident.title);
      expect(fetched?.resolved_at).toBeNull();
    });

    it('filters incidents by severity (critical, warning, info)', async () => {
      await createIncident({
        id: 'inc-crit',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'Critical Failure',
        description: 'Host down',
        severity: 'critical',
        status: 'open',
        timestamp: 1000,
        resolved_at: null
      });

      await createIncident({
        id: 'inc-warn',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'High RAM Warning',
        description: 'Memory pressure',
        severity: 'warning',
        status: 'open',
        timestamp: 2000,
        resolved_at: null
      });

      await createIncident({
        id: 'inc-info',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'Maintenance Note',
        description: 'Backup initiated',
        severity: 'info',
        status: 'resolved',
        timestamp: 3000,
        resolved_at: 3500
      });

      const criticalOnly = await getIncidents({ severity: 'critical' });
      expect(criticalOnly.length).toBe(1);
      expect(criticalOnly[0].id).toBe('inc-crit');

      const warningOnly = await getIncidents({ severity: 'warning' });
      expect(warningOnly.length).toBe(1);
      expect(warningOnly[0].id).toBe('inc-warn');

      const infoOnly = await getIncidents({ severity: 'info' });
      expect(infoOnly.length).toBe(1);
      expect(infoOnly[0].id).toBe('inc-info');
    });

    it('filters incidents by status (open, investigating, resolved)', async () => {
      await createIncident({
        id: 'inc-open',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'Open Incident',
        description: 'Unattended alert',
        severity: 'critical',
        status: 'open',
        timestamp: 1000,
        resolved_at: null
      });

      await createIncident({
        id: 'inc-inv',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'Investigating Incident',
        description: 'Being examined',
        severity: 'warning',
        status: 'investigating',
        timestamp: 2000,
        resolved_at: null
      });

      const openOnly = await getIncidents({ status: 'open' });
      expect(openOnly.length).toBe(1);
      expect(openOnly[0].id).toBe('inc-open');

      const invOnly = await getIncidents({ status: 'investigating' });
      expect(invOnly.length).toBe(1);
      expect(invOnly[0].id).toBe('inc-inv');
    });

    it('filters incidents by free-text search in title or description', async () => {
      await createIncident({
        id: 'inc-search-1',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'Redis Cluster Split-Brain',
        description: 'Network partition isolated shard-3',
        severity: 'critical',
        status: 'open',
        timestamp: 1000,
        resolved_at: null
      });

      await createIncident({
        id: 'inc-search-2',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'PostgreSQL Disk Full',
        description: 'WAL files filled storage volume',
        severity: 'critical',
        status: 'open',
        timestamp: 2000,
        resolved_at: null
      });

      const searchSplit = await getIncidents({ search: 'Split-Brain' });
      expect(searchSplit.length).toBe(1);
      expect(searchSplit[0].id).toBe('inc-search-1');

      const searchWal = await getIncidents({ search: 'WAL' });
      expect(searchWal.length).toBe(1);
      expect(searchWal[0].id).toBe('inc-search-2');
    });

    it('updates incident status and sets resolved_at upon incident resolution', async () => {
      const incident = await createIncident({
        id: 'inc-resolve-test',
        node_id: nodeId,
        alert_rule_id: null,
        title: 'Network Interface Down',
        description: 'eth0 packet drop',
        severity: 'critical',
        status: 'open',
        timestamp: Date.now() - 60000,
        resolved_at: null
      });

      expect(incident.status).toBe('open');
      expect(incident.resolved_at).toBeNull();

      // Transition to investigating
      const investigating = await updateIncident('inc-resolve-test', {
        status: 'investigating'
      });
      expect(investigating?.status).toBe('investigating');
      expect(investigating?.resolved_at).toBeNull();

      // Resolve incident
      const resolved = await updateIncident('inc-resolve-test', {
        status: 'resolved'
      });

      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolved_at).not.toBeNull();
      expect(typeof resolved?.resolved_at).toBe('number');
    });
  });
});
