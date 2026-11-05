import { describe, it, expect } from 'vitest';
import {
  calculateContainerHealth,
  bytesToMbps,
  averageCpuAcrossCores,
  calculateMemoryPressure,
  evaluateAlertRules,
  aggregateClusterHealth,
} from '../services/metricsCalculator';
import { MetricSnapshotRecord, AlertRuleRecord, NodeRecord } from '../types';

describe('Metrics Calculator Math & Logic Unit Tests', () => {
  describe('Container Health Score Calculation', () => {
    it('returns 100 for perfectly running containers (100% running, 0 failed)', () => {
      const score = calculateContainerHealth(10, 10, 0);
      expect(score).toBe(100);

      const single = calculateContainerHealth(1, 1, 0);
      expect(single).toBe(100);

      const largeCluster = calculateContainerHealth(64, 64, 0);
      expect(largeCluster).toBe(100);
    });

    it('calculates score correctly for partial failed combinations', () => {
      // 8 running out of 10 total, 2 failed: (8/10)*100 - (2*15) = 80 - 30 = 50
      const score = calculateContainerHealth(8, 10, 2);
      expect(score).toBe(50);

      // 18 running out of 20 total, 1 failed: (18/20)*100 - (1*15) = 90 - 15 = 75
      const score2 = calculateContainerHealth(18, 20, 1);
      expect(score2).toBe(75);
    });

    it('clamps negative scores to 0 under severe container crash conditions', () => {
      // 2 running out of 10 total, 8 failed: (2/10)*100 - (8*15) = 20 - 120 = -100 => clamped to 0
      const score = calculateContainerHealth(2, 10, 8);
      expect(score).toBe(0);

      // 0 running out of 5 total, 5 failed: 0 - 75 = -75 => clamped to 0
      const zeroRunning = calculateContainerHealth(0, 5, 5);
      expect(zeroRunning).toBe(0);
    });

    it('handles zero containers edge case gracefully without NaN or infinity', () => {
      // 0 running, 0 total, 0 failed: uses safeTotal = Math.max(1, 0) = 1 => 0/1 = 0
      const zeroCase = calculateContainerHealth(0, 0, 0);
      expect(Number.isFinite(zeroCase)).toBe(true);
      expect(zeroCase).toBe(0);
    });
  });

  describe('Average CPU Aggregation Across Varying Core Counts', () => {
    it('handles empty core array gracefully', () => {
      expect(averageCpuAcrossCores([])).toBe(0);
      expect(averageCpuAcrossCores('[]')).toBe(0);
    });

    it('calculates single-core CPU accurately', () => {
      expect(averageCpuAcrossCores([75.5])).toBe(75.5);
      expect(averageCpuAcrossCores('[75.5]')).toBe(75.5);
    });

    it('aggregates across varying standard core architectures (4, 8, 16, 64 cores)', () => {
      // 4 cores: 20, 40, 60, 80 -> avg 50
      expect(averageCpuAcrossCores([20, 40, 60, 80])).toBe(50);

      // 8 cores
      const eightCores = [10, 20, 30, 40, 50, 60, 70, 80];
      expect(averageCpuAcrossCores(eightCores)).toBe(45);

      // 16 cores with decimals
      const sixteenCores = new Array(16).fill(50.2);
      expect(averageCpuAcrossCores(sixteenCores)).toBe(50.2);

      // 64 cores
      const sixtyFourCores = [
        ...new Array(32).fill(40),
        ...new Array(32).fill(80),
      ];
      expect(averageCpuAcrossCores(sixtyFourCores)).toBe(60);
    });

    it('parses JSON string representation of per_core_cpu gracefully', () => {
      const jsonString = JSON.stringify([12.4, 34.6, 56.8, 78.2]);
      const avg = averageCpuAcrossCores(jsonString);
      expect(avg).toBe(45.5);
    });

    it('handles corrupted JSON string without throwing error', () => {
      expect(averageCpuAcrossCores('invalid-json')).toBe(0);
    });
  });

  describe('Bandwidth Throughput Calculations', () => {
    it('converts raw bytes transferred to Mbps accurately', () => {
      // 125,000 bytes in 1s = (125,000 * 8) / 1,000,000 = 1.0 Mbps
      expect(bytesToMbps(125_000, 1)).toBe(1);

      // 12,500,000 bytes in 1s = 100.0 Mbps
      expect(bytesToMbps(12_500_000, 1)).toBe(100);

      // 125,000,000 bytes in 1s = 1000.0 Mbps (1 Gbps)
      expect(bytesToMbps(125_000_000, 1)).toBe(1000);
    });

    it('handles custom time interval seconds', () => {
      // 250,000 bytes over 2 seconds = 1.0 Mbps
      expect(bytesToMbps(250_000, 2)).toBe(1);

      // 1,250,000 bytes over 10 seconds = 1.0 Mbps
      expect(bytesToMbps(1_250_000, 10)).toBe(1);
    });

    it('handles zero or negative boundary conditions safely', () => {
      expect(bytesToMbps(0, 1)).toBe(0);
      expect(bytesToMbps(-500, 1)).toBe(0);
      expect(bytesToMbps(1000, 0)).toBe(0);
      expect(bytesToMbps(1000, -5)).toBe(0);
    });
  });

  describe('Memory Pressure Calculations', () => {
    it('calculates ratio and percentage correctly', () => {
      const res = calculateMemoryPressure(32, 64);
      expect(res.ratio).toBe(0.5);
      expect(res.percent).toBe(50);
    });

    it('clamps values when used exceeds total', () => {
      const res = calculateMemoryPressure(70, 64);
      expect(res.ratio).toBe(1.0);
      expect(res.percent).toBe(100);
    });

    it('safely handles zero total memory', () => {
      const res = calculateMemoryPressure(0, 0);
      expect(res.ratio).toBe(0);
      expect(res.percent).toBe(0);
    });
  });

  describe('Alert Threshold Evaluation Logic', () => {
    const baseSnapshot: MetricSnapshotRecord = {
      node_id: 'node-test-01',
      timestamp: Date.now(),
      cpu_percent: 85.0,
      per_core_cpu: '[85.0]',
      ram_used_gb: 55.0,
      ram_total_gb: 64.0,
      ram_percent: 85.9,
      network_in_mbps: 200,
      network_out_mbps: 250,
      container_total: 10,
      container_running: 7,
      container_failed: 2,
      health_score: 40,
    };

    it('evaluates greater than (>) operator and respects strict boundary condition', () => {
      const ruleStrictGreater: AlertRuleRecord = {
        id: 'rule-cpu-gt-85',
        node_id: null,
        metric_name: 'cpu',
        operator: '>',
        threshold: 85.0,
        severity: 'critical',
        is_active: 1,
        created_at: Date.now(),
      };

      // 85.0 > 85.0 is FALSE (boundary condition)
      let triggered = evaluateAlertRules(baseSnapshot, [ruleStrictGreater]);
      expect(triggered.length).toBe(0);

      // 85.1 > 85.0 is TRUE
      triggered = evaluateAlertRules(
        { ...baseSnapshot, cpu_percent: 85.1 },
        [ruleStrictGreater]
      );
      expect(triggered.length).toBe(1);
      expect(triggered[0].ruleId).toBe('rule-cpu-gt-85');
    });

    it('evaluates greater than or equal (>=) operator including exact boundary', () => {
      const ruleGte: AlertRuleRecord = {
        id: 'rule-cpu-gte-85',
        node_id: null,
        metric_name: 'cpu',
        operator: '>=',
        threshold: 85.0,
        severity: 'warning',
        is_active: 1,
        created_at: Date.now(),
      };

      // 85.0 >= 85.0 is TRUE (boundary condition)
      let triggered = evaluateAlertRules(baseSnapshot, [ruleGte]);
      expect(triggered.length).toBe(1);
      expect(triggered[0].severity).toBe('warning');

      // 84.9 >= 85.0 is FALSE
      triggered = evaluateAlertRules(
        { ...baseSnapshot, cpu_percent: 84.9 },
        [ruleGte]
      );
      expect(triggered.length).toBe(0);
    });

    it('evaluates less than (<) and less than or equal (<=) operators for container health', () => {
      const ruleLt: AlertRuleRecord = {
        id: 'rule-cont-lt-50',
        node_id: null,
        metric_name: 'container_health',
        operator: '<',
        threshold: 50,
        severity: 'critical',
        is_active: 1,
        created_at: Date.now(),
      };

      // health_score 40 < 50 is TRUE
      let triggered = evaluateAlertRules(baseSnapshot, [ruleLt]);
      expect(triggered.length).toBe(1);
      expect(triggered[0].metricName).toBe('container_health');

      // Boundary condition: 50 < 50 is FALSE
      triggered = evaluateAlertRules(
        { ...baseSnapshot, health_score: 50 },
        [ruleLt]
      );
      expect(triggered.length).toBe(0);

      // Boundary condition with <=: 50 <= 50 is TRUE
      const ruleLte: AlertRuleRecord = { ...ruleLt, operator: '<=' };
      triggered = evaluateAlertRules(
        { ...baseSnapshot, health_score: 50 },
        [ruleLte]
      );
      expect(triggered.length).toBe(1);
    });

    it('correctly maps severity levels (info vs warning vs critical)', () => {
      const infoRule: AlertRuleRecord = {
        id: 'rule-net-info',
        node_id: null,
        metric_name: 'network',
        operator: '>=',
        threshold: 400,
        severity: 'info',
        is_active: 1,
        created_at: Date.now(),
      };

      const warningRule: AlertRuleRecord = {
        id: 'rule-net-warn',
        node_id: null,
        metric_name: 'network',
        operator: '>=',
        threshold: 400,
        severity: 'warning',
        is_active: 1,
        created_at: Date.now(),
      };

      const criticalRule: AlertRuleRecord = {
        id: 'rule-net-crit',
        node_id: null,
        metric_name: 'network',
        operator: '>=',
        threshold: 400,
        severity: 'critical',
        is_active: 1,
        created_at: Date.now(),
      };

      // Combined network throughput is 200 + 250 = 450 Mbps >= 400
      const triggered = evaluateAlertRules(baseSnapshot, [infoRule, warningRule, criticalRule]);
      expect(triggered.length).toBe(3);
      expect(triggered.map((t) => t.severity)).toEqual(['info', 'warning', 'critical']);
    });

    it('ignores inactive rules (is_active = 0)', () => {
      const inactiveRule: AlertRuleRecord = {
        id: 'rule-cpu-inactive',
        node_id: null,
        metric_name: 'cpu',
        operator: '>=',
        threshold: 50,
        severity: 'critical',
        is_active: 0,
        created_at: Date.now(),
      };

      const triggered = evaluateAlertRules(baseSnapshot, [inactiveRule]);
      expect(triggered.length).toBe(0);
    });

    it('respects node-specific rules and filters out other nodes', () => {
      const ruleForNode2: AlertRuleRecord = {
        id: 'rule-specific-node-2',
        node_id: 'node-test-02',
        metric_name: 'cpu',
        operator: '>=',
        threshold: 50,
        severity: 'critical',
        is_active: 1,
        created_at: Date.now(),
      };

      // snapshot is from 'node-test-01', rule applies to 'node-test-02'
      const triggered = evaluateAlertRules(baseSnapshot, [ruleForNode2]);
      expect(triggered.length).toBe(0);
    });
  });

  describe('Cluster Health Aggregation', () => {
    it('accurately aggregates cluster summary stats and statuses', () => {
      const nodes: NodeRecord[] = [
        {
          id: 'n1',
          name: 'Node 1',
          hostname: 'n1.local',
          ip: '10.0.0.1',
          status: 'online',
          os: 'Linux',
          region: 'us-east',
          cpu_cores: 16,
          total_ram_gb: 64,
          tags: '[]',
          created_at: Date.now(),
        },
        {
          id: 'n2',
          name: 'Node 2',
          hostname: 'n2.local',
          ip: '10.0.0.2',
          status: 'degraded',
          os: 'Linux',
          region: 'eu-west',
          cpu_cores: 32,
          total_ram_gb: 128,
          tags: '[]',
          created_at: Date.now(),
        },
        {
          id: 'n3',
          name: 'Node 3',
          hostname: 'n3.local',
          ip: '10.0.0.3',
          status: 'critical',
          os: 'Linux',
          region: 'ap-se',
          cpu_cores: 64,
          total_ram_gb: 256,
          tags: '[]',
          created_at: Date.now(),
        },
      ];

      const snapshots: MetricSnapshotRecord[] = [
        {
          node_id: 'n1',
          timestamp: Date.now(),
          cpu_percent: 30,
          per_core_cpu: '[]',
          ram_used_gb: 32,
          ram_total_gb: 64,
          ram_percent: 50,
          network_in_mbps: 100,
          network_out_mbps: 100,
          container_total: 10,
          container_running: 10,
          container_failed: 0,
          health_score: 100,
        },
        {
          node_id: 'n2',
          timestamp: Date.now(),
          cpu_percent: 60,
          per_core_cpu: '[]',
          ram_used_gb: 64,
          ram_total_gb: 128,
          ram_percent: 50,
          network_in_mbps: 150,
          network_out_mbps: 150,
          container_total: 10,
          container_running: 9,
          container_failed: 1,
          health_score: 75,
        },
        {
          node_id: 'n3',
          timestamp: Date.now(),
          cpu_percent: 90,
          per_core_cpu: '[]',
          ram_used_gb: 230,
          ram_total_gb: 256,
          ram_percent: 90,
          network_in_mbps: 300,
          network_out_mbps: 300,
          container_total: 10,
          container_running: 6,
          container_failed: 4,
          health_score: 0,
        },
      ];

      const summary = aggregateClusterHealth(nodes, snapshots, 2, 4);

      expect(summary.totalNodes).toBe(3);
      expect(summary.online).toBe(1);
      expect(summary.degraded).toBe(1);
      expect(summary.critical).toBe(1);
      expect(summary.healthStatus).toBe('critical');
      expect(summary.avgCpu).toBe(60); // (30+60+90)/3 = 60
      expect(summary.activeIncidents).toBe(2);
      expect(summary.activeAlerts).toBe(4);
    });

    it('returns default optimal structure for empty nodes array', () => {
      const summary = aggregateClusterHealth([], []);
      expect(summary.totalNodes).toBe(0);
      expect(summary.healthStatus).toBe('optimal');
    });
  });
});
