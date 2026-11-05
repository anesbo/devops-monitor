import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  initDb,
  closeDb,
  createNode,
  createAlertRule,
  getAllNodes,
  getLatestSnapshot,
  getIncidents,
  runQuery
} from '../db';
import {
  generateTelemetryForNode,
  tickSimulation,
  startSimulation,
  stopSimulation,
  isSimulationActive
} from '../services/simulationService';
import { NodeRecord, AlertRuleRecord } from '../types';

const TEST_DB_PATH = path.resolve(__dirname, 'test-sim.sqlite');

describe('Simulation Service Integration Tests', () => {
  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {}
    }
    await initDb(TEST_DB_PATH);
  });

  afterAll(async () => {
    stopSimulation();
    await closeDb();
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {}
    }
  });

  beforeEach(async () => {
    await runQuery('DELETE FROM incidents');
    await runQuery('DELETE FROM alert_rules');
    await runQuery('DELETE FROM metric_snapshots');
    await runQuery('DELETE FROM nodes');
  });

  const testNode: NodeRecord = {
    id: 'node-sim-test-1',
    name: 'Simulation Target Node',
    hostname: 'sim-01.local',
    ip: '10.0.9.1',
    status: 'online',
    os: 'Linux',
    region: 'us-east',
    cpu_cores: 8,
    total_ram_gb: 32,
    tags: JSON.stringify(['worker']),
    created_at: Date.now()
  };

  it('generates realistic telemetry for a node with per-core CPU and container score', async () => {
    await createNode(testNode);

    const snapshot = await generateTelemetryForNode(testNode);
    expect(snapshot.node_id).toBe(testNode.id);
    expect(snapshot.cpu_percent).toBeGreaterThanOrEqual(5);
    expect(snapshot.cpu_percent).toBeLessThanOrEqual(100);
    expect(snapshot.ram_used_gb).toBeGreaterThan(0);
    expect(snapshot.ram_percent).toBeGreaterThan(0);
    expect(snapshot.network_in_mbps).toBeGreaterThan(0);
    expect(snapshot.network_out_mbps).toBeGreaterThan(0);
    expect(snapshot.health_score).toBeGreaterThanOrEqual(0);
    expect(snapshot.health_score).toBeLessThanOrEqual(100);

    const perCore = JSON.parse(snapshot.per_core_cpu);
    expect(Array.isArray(perCore)).toBe(true);
    expect(perCore.length).toBe(testNode.cpu_cores);
  });

  it('executes tickSimulation, saves snapshots, and updates node status', async () => {
    await createNode(testNode);

    const createdSnapshots = await tickSimulation();
    expect(createdSnapshots.length).toBe(1);

    const latest = await getLatestSnapshot(testNode.id);
    expect(latest).toBeDefined();
    expect(latest!.node_id).toBe(testNode.id);

    const nodes = await getAllNodes();
    expect(['online', 'degraded', 'critical']).toContain(nodes[0].status);
  });

  it('triggers incidents when metrics violate active alert rules', async () => {
    await createNode(testNode);

    // Rule with very low threshold guaranteed to trigger
    const triggerRule: AlertRuleRecord = {
      id: 'rule-sim-trigger-always',
      node_id: null,
      metric_name: 'cpu',
      operator: '>=',
      threshold: 1.0, // any CPU >= 1% triggers
      severity: 'critical',
      is_active: 1,
      created_at: Date.now()
    };
    await createAlertRule(triggerRule);

    await tickSimulation();

    const incidents = await getIncidents({ nodeId: testNode.id });
    expect(incidents.length).toBeGreaterThan(0);
    expect(incidents[0].alert_rule_id).toBe('rule-sim-trigger-always');
    expect(incidents[0].severity).toBe('critical');
    expect(incidents[0].status).toBe('open');
  });

  it('starts and stops continuous simulation loop', () => {
    expect(isSimulationActive()).toBe(false);
    startSimulation(1000);
    expect(isSimulationActive()).toBe(true);
    stopSimulation();
    expect(isSimulationActive()).toBe(false);
  });
});
