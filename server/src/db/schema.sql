-- ApexPulse Core Database Schema

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
