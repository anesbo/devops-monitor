import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import {
  NodeRecord,
  MetricSnapshotRecord,
  AlertRuleRecord,
  IncidentRecord
} from '../types';

let dbInstance: sqlite3.Database | null = null;
let currentDbPath: string | null = null;
const defaultDbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'apexpulse.db');

export function getDb(customPath?: string): sqlite3.Database {
  const targetPath = customPath || process.env.DB_PATH || defaultDbPath;
  if ((customPath || process.env.DB_PATH) && currentDbPath && currentDbPath !== targetPath && dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }

  if (!dbInstance) {
    currentDbPath = targetPath;
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    dbInstance = new sqlite3.Database(targetPath);
    dbInstance.run('PRAGMA foreign_keys = ON;');
    dbInstance.run('PRAGMA journal_mode = WAL;');
  }
  return dbInstance;
}

export function closeDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve();
    dbInstance.close((err) => {
      if (err) return reject(err);
      dbInstance = null;
      currentDbPath = null;
      resolve();
    });
  });
}

export function runQuery(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function getOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: any) => {
      if (err) return reject(err);
      resolve(row ? (row as T) : null);
    });
  });
}

export function getAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) return reject(err);
      resolve((rows || []) as T[]);
    });
  });
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  ip TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('online', 'degraded', 'critical', 'offline', 'healthy', 'warning')),
  os TEXT NOT NULL,
  region TEXT NOT NULL,
  cpu_cores INTEGER NOT NULL,
  total_ram_gb REAL NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  last_seen INTEGER NULL
);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  cpu_percent REAL NOT NULL,
  per_core_cpu TEXT NOT NULL DEFAULT '[]',
  ram_used_gb REAL NOT NULL,
  ram_total_gb REAL NOT NULL,
  ram_percent REAL NOT NULL,
  network_in_mbps REAL NOT NULL,
  network_out_mbps REAL NOT NULL,
  container_total INTEGER NOT NULL DEFAULT 0,
  container_running INTEGER NOT NULL DEFAULT 0,
  container_failed INTEGER NOT NULL DEFAULT 0,
  health_score REAL NOT NULL DEFAULT 100,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshots_node_ts ON metric_snapshots(node_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  node_id TEXT NULL,
  metric_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  threshold REAL NOT NULL,
  severity TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  alert_rule_id TEXT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open', 'investigating', 'resolved')),
  timestamp INTEGER NOT NULL,
  resolved_at INTEGER NULL,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_node ON incidents(node_id);
`;

export async function initDb(customPath?: string): Promise<void> {
  if (customPath) {
    process.env.DB_PATH = customPath;
  }
  getDb(customPath);
  
  let schemaSql = SCHEMA_SQL;
  const possiblePaths = [
    path.resolve(__dirname, 'schema.sql'),
    path.resolve(__dirname, '../../src/db/schema.sql'),
    path.resolve(process.cwd(), 'src/db/schema.sql')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      schemaSql = fs.readFileSync(p, 'utf8');
      break;
    }
  }
  
  // Split statements and execute sequentially
  const statements = schemaSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await runQuery(stmt);
  }

  // Ensure last_seen column exists on older schemas
  try {
    await runQuery('ALTER TABLE nodes ADD COLUMN last_seen INTEGER');
  } catch {
    // Column already exists
  }
}

// ==========================================
// NODE CRUD HELPERS
// ==========================================

export async function getAllNodes(): Promise<NodeRecord[]> {
  return getAll<NodeRecord>('SELECT * FROM nodes ORDER BY created_at ASC');
}

export async function getNodeById(id: string): Promise<NodeRecord | null> {
  return getOne<NodeRecord>('SELECT * FROM nodes WHERE id = ?', [id]);
}

export async function createNode(node: NodeRecord): Promise<NodeRecord> {
  await runQuery(
    `INSERT INTO nodes (id, name, hostname, ip, status, os, region, cpu_cores, total_ram_gb, tags, created_at, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      node.id,
      node.name,
      node.hostname,
      node.ip,
      node.status,
      node.os,
      node.region,
      node.cpu_cores,
      node.total_ram_gb,
      typeof node.tags === 'string' ? node.tags : JSON.stringify(node.tags),
      node.created_at || Date.now(),
      node.last_seen || Date.now()
    ]
  );
  return (await getNodeById(node.id))!;
}

export async function updateNode(id: string, updates: Partial<NodeRecord>): Promise<NodeRecord | null> {
  const existing = await getNodeById(id);
  if (!existing) return null;

  const updated: NodeRecord = {
    ...existing,
    ...updates,
    tags: updates.tags
      ? typeof updates.tags === 'string'
        ? updates.tags
        : JSON.stringify(updates.tags)
      : existing.tags
  };

  await runQuery(
    `UPDATE nodes SET name = ?, hostname = ?, ip = ?, status = ?, os = ?, region = ?, cpu_cores = ?, total_ram_gb = ?, tags = ?, last_seen = ?
     WHERE id = ?`,
    [
      updated.name,
      updated.hostname,
      updated.ip,
      updated.status,
      updated.os,
      updated.region,
      updated.cpu_cores,
      updated.total_ram_gb,
      updated.tags,
      updated.last_seen !== undefined ? updated.last_seen : (existing.last_seen || Date.now()),
      id
    ]
  );

  return getNodeById(id);
}

export async function deleteNode(id: string): Promise<boolean> {
  const res = await runQuery('DELETE FROM nodes WHERE id = ?', [id]);
  return res.changes > 0;
}

// ==========================================
// METRIC SNAPSHOT CRUD HELPERS
// ==========================================

export async function insertSnapshot(snapshot: MetricSnapshotRecord): Promise<number> {
  const res = await runQuery(
    `INSERT INTO metric_snapshots (
      node_id, timestamp, cpu_percent, per_core_cpu, ram_used_gb, ram_total_gb,
      ram_percent, network_in_mbps, network_out_mbps, container_total,
      container_running, container_failed, health_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snapshot.node_id,
      snapshot.timestamp || Date.now(),
      snapshot.cpu_percent,
      typeof snapshot.per_core_cpu === 'string' ? snapshot.per_core_cpu : JSON.stringify(snapshot.per_core_cpu),
      snapshot.ram_used_gb,
      snapshot.ram_total_gb,
      snapshot.ram_percent,
      snapshot.network_in_mbps,
      snapshot.network_out_mbps,
      snapshot.container_total,
      snapshot.container_running,
      snapshot.container_failed,
      snapshot.health_score
    ]
  );
  return res.lastID;
}

export async function getLatestSnapshot(nodeId?: string): Promise<MetricSnapshotRecord | null> {
  if (nodeId && nodeId !== 'all') {
    return getOne<MetricSnapshotRecord>(
      'SELECT * FROM metric_snapshots WHERE node_id = ? ORDER BY timestamp DESC LIMIT 1',
      [nodeId]
    );
  }
  return getOne<MetricSnapshotRecord>(
    'SELECT * FROM metric_snapshots ORDER BY timestamp DESC LIMIT 1'
  );
}

export async function getLatestSnapshotsForAllNodes(): Promise<MetricSnapshotRecord[]> {
  const nodes = await getAllNodes();
  const snapshots: MetricSnapshotRecord[] = [];
  for (const node of nodes) {
    const s = await getLatestSnapshot(node.id);
    if (s) snapshots.push(s);
  }
  return snapshots;
}

export async function getSnapshotsForNode(
  nodeId: string,
  limit: number = 50,
  sinceTimestamp?: number
): Promise<MetricSnapshotRecord[]> {
  if (sinceTimestamp) {
    return getAll<MetricSnapshotRecord>(
      'SELECT * FROM metric_snapshots WHERE node_id = ? AND timestamp >= ? ORDER BY timestamp ASC LIMIT ?',
      [nodeId, sinceTimestamp, limit]
    );
  }
  const records = await getAll<MetricSnapshotRecord>(
    'SELECT * FROM metric_snapshots WHERE node_id = ? ORDER BY timestamp DESC LIMIT ?',
    [nodeId, limit]
  );
  return records.reverse();
}

// ==========================================
// ALERT RULES CRUD HELPERS
// ==========================================

export async function getAllAlertRules(activeOnly: boolean = false): Promise<AlertRuleRecord[]> {
  if (activeOnly) {
    return getAll<AlertRuleRecord>('SELECT * FROM alert_rules WHERE is_active = 1 ORDER BY created_at DESC');
  }
  return getAll<AlertRuleRecord>('SELECT * FROM alert_rules ORDER BY created_at DESC');
}

export async function getAlertRuleById(id: string): Promise<AlertRuleRecord | null> {
  return getOne<AlertRuleRecord>('SELECT * FROM alert_rules WHERE id = ?', [id]);
}

export async function createAlertRule(rule: AlertRuleRecord): Promise<AlertRuleRecord> {
  await runQuery(
    `INSERT INTO alert_rules (id, node_id, metric_name, operator, threshold, severity, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rule.id,
      rule.node_id || null,
      rule.metric_name,
      rule.operator,
      rule.threshold,
      rule.severity,
      rule.is_active !== undefined ? (rule.is_active ? 1 : 0) : 1,
      rule.created_at || Date.now()
    ]
  );
  return (await getAlertRuleById(rule.id))!;
}

export async function updateAlertRule(id: string, updates: Partial<AlertRuleRecord>): Promise<AlertRuleRecord | null> {
  const existing = await getAlertRuleById(id);
  if (!existing) return null;

  const updated: AlertRuleRecord = {
    ...existing,
    ...updates,
    is_active: updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : existing.is_active
  };

  await runQuery(
    `UPDATE alert_rules SET node_id = ?, metric_name = ?, operator = ?, threshold = ?, severity = ?, is_active = ?
     WHERE id = ?`,
    [
      updated.node_id,
      updated.metric_name,
      updated.operator,
      updated.threshold,
      updated.severity,
      updated.is_active,
      id
    ]
  );

  return getAlertRuleById(id);
}

export async function deleteAlertRule(id: string): Promise<boolean> {
  const res = await runQuery('DELETE FROM alert_rules WHERE id = ?', [id]);
  return res.changes > 0;
}

// ==========================================
// INCIDENTS CRUD HELPERS
// ==========================================

export async function getIncidents(filters?: {
  severity?: string;
  status?: string;
  search?: string;
  nodeId?: string;
}): Promise<IncidentRecord[]> {
  let sql = 'SELECT * FROM incidents WHERE 1=1';
  const params: any[] = [];

  if (filters?.severity) {
    sql += ' AND severity = ?';
    params.push(filters.severity);
  }
  if (filters?.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.nodeId && filters.nodeId !== 'all') {
    sql += ' AND node_id = ?';
    params.push(filters.nodeId);
  }
  if (filters?.search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  sql += ' ORDER BY timestamp DESC';
  return getAll<IncidentRecord>(sql, params);
}

export async function getIncidentById(id: string): Promise<IncidentRecord | null> {
  return getOne<IncidentRecord>('SELECT * FROM incidents WHERE id = ?', [id]);
}

export async function createIncident(incident: IncidentRecord): Promise<IncidentRecord> {
  await runQuery(
    `INSERT INTO incidents (id, node_id, alert_rule_id, title, description, severity, status, timestamp, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      incident.id,
      incident.node_id,
      incident.alert_rule_id || null,
      incident.title,
      incident.description,
      incident.severity,
      incident.status || 'open',
      incident.timestamp || Date.now(),
      incident.resolved_at || null
    ]
  );
  return (await getIncidentById(incident.id))!;
}

export async function updateIncident(id: string, updates: Partial<IncidentRecord>): Promise<IncidentRecord | null> {
  const existing = await getIncidentById(id);
  if (!existing) return null;

  const updated: IncidentRecord = {
    ...existing,
    ...updates,
    resolved_at: updates.status === 'resolved' && !updates.resolved_at
      ? Date.now()
      : updates.resolved_at !== undefined
      ? updates.resolved_at
      : existing.resolved_at
  };

  await runQuery(
    `UPDATE incidents SET node_id = ?, alert_rule_id = ?, title = ?, description = ?, severity = ?, status = ?, resolved_at = ?
     WHERE id = ?`,
    [
      updated.node_id,
      updated.alert_rule_id,
      updated.title,
      updated.description,
      updated.severity,
      updated.status,
      updated.resolved_at,
      id
    ]
  );

  return getIncidentById(id);
}
