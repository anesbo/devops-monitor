# ApexPulse REST API Reference & Telemetry Contract

This document provides complete, production-grade technical documentation for the ApexPulse REST API. It details all operational endpoints, request parameters, header specifications, and JSON payload contracts for interacting with the ApexPulse Central Observability Server.

---

## 1. Global API Architecture & Conventions

### 1.1 Base URL & Content Negotiation
- **Base Path**: `/api`
- **Default Local Endpoint**: `http://localhost:4000/api`
- **Production Endpoint**: `https://<YOUR_DOMAIN>/api`
- **Content Type**: `application/json; charset=utf-8`
- **Standard Protocol**: HTTP/1.1 or HTTP/2 over TLS 1.3

### 1.2 Authentication & Authorization
ApexPulse supports multi-layered authentication depending on deployment posture:

| Header Name | Accepted Formats | Description |
|---|---|---|
| `x-apex-node-secret` | `<SECRET_TOKEN>` | Used by lightweight node agents (`apex-agent.py` / `apex-agent.sh`) for telemetry ingestion. |
| `x-api-key` | `<SECRET_TOKEN>` | Standard API access token for programmatic orchestration. |
| `Authorization` | `Bearer <SECRET_TOKEN>` | Standard OAuth2 / JWT style bearer token. |

> **Note**: When `NODE_INGEST_SECRET` is set in the server environment, all incoming calls to `/api/metrics/ingest` and administrative mutating endpoints must supply a matching secret token.

### 1.3 Standard Error Envelope
All error responses adhere to the standard JSON structure:
```json
{
  "error": "Short human-readable error description",
  "details": "Technical debugging details or validation error matrix",
  "path": "/api/metrics/ingest",
  "timestamp": "2026-11-05T14:30:00.000Z"
}
```

---

## 2. Server Nodes API (`/api/nodes`)

Manage the registration, inventory, hardware specifications, and lifecycle of all monitored cluster nodes.

### 2.1 List All Nodes
Returns the complete fleet of registered servers enriched with their latest live telemetry vitals.

- **Method**: `GET`
- **Path**: `/api/nodes`
- **Headers**:
  ```http
  Accept: application/json
  ```
- **Response**: `200 OK`
```json
[
  {
    "id": "node-us-east-1",
    "name": "Edge Gateway Alpha",
    "hostname": "gw-01.us-east.apexpulse.internal",
    "ip": "10.0.1.15",
    "status": "healthy",
    "rawStatus": "online",
    "os": "Ubuntu 24.04 LTS (x86_64)",
    "region": "us-east (N. Virginia)",
    "role": "gateway",
    "cpu_cores": 32,
    "cores": 32,
    "total_ram_gb": 64,
    "totalMemoryGb": 64,
    "cpu": 34.2,
    "memory": 48.6,
    "disk": 52.1,
    "networkInMb": 145.8,
    "networkOutMb": 182.4,
    "latencyMs": 4.2,
    "uptime": "68d 14h 22m",
    "lastPing": "2026-11-05T14:30:00.000Z",
    "healthScore": 100,
    "tags": ["ingress", "traefik", "tls-termination", "edge"],
    "created_at": 1730000000000,
    "last_seen": 1730817000000
  }
]
```

---

### 2.2 Get Single Node Details
Fetches enriched configuration and live hardware state for a specific node ID.

- **Method**: `GET`
- **Path**: `/api/nodes/:id`
- **Parameters**:
  - `id` (path, string, required): Node identifier (e.g., `node-us-east-1`)
- **Response**: `200 OK` (or `404 Not Found`)
```json
{
  "id": "node-us-east-1",
  "name": "Edge Gateway Alpha",
  "hostname": "gw-01.us-east.apexpulse.internal",
  "ip": "10.0.1.15",
  "status": "healthy",
  "os": "Ubuntu 24.04 LTS (x86_64)",
  "region": "us-east (N. Virginia)",
  "role": "gateway",
  "cores": 32,
  "totalMemoryGb": 64,
  "cpu": 34.2,
  "memory": 48.6,
  "healthScore": 100,
  "tags": ["ingress", "traefik", "edge"]
}
```

---

### 2.3 Register New Node Manually
Allows explicit registration of a server node before agent launch.

- **Method**: `POST`
- **Path**: `/api/nodes`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Request Body**:
```json
{
  "id": "node-eu-central-05",
  "name": "Payment Service Primary",
  "hostname": "pay-01.eu-central.internal",
  "ip": "10.240.12.8",
  "status": "online",
  "os": "Debian 12 Bookworm",
  "region": "eu-central (Frankfurt)",
  "cpu_cores": 16,
  "total_ram_gb": 32,
  "tags": ["payment", "docker", "production"]
}
```
- **Response**: `201 Created`
```json
{
  "id": "node-eu-central-05",
  "name": "Payment Service Primary",
  "hostname": "pay-01.eu-central.internal",
  "status": "healthy",
  "created_at": 1730817000000
}
```

---

### 2.4 Update Node Configuration
- **Method**: `PUT`
- **Path**: `/api/nodes/:id`
- **Request Body**: Partial update object (`name`, `tags`, `region`, `status`, etc.)
- **Response**: `200 OK`

---

### 2.5 Decommission Node
- **Method**: `DELETE`
- **Path**: `/api/nodes/:id`
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Node node-eu-central-05 decommissioned successfully"
}
```

---

## 3. Telemetry & Metrics API (`/api/metrics`)

### 3.1 Live Cluster Telemetry Summary
Fetches aggregate real-time metrics across the entire fleet or filtered by target node.

- **Method**: `GET`
- **Path**: `/api/metrics/live`
- **Query Parameters**:
  - `nodeId` (string, optional): Specific node ID or `all`
- **Response**: `200 OK`
```json
{
  "totalNodes": 6,
  "healthyCount": 4,
  "warningCount": 1,
  "criticalCount": 1,
  "offlineCount": 0,
  "avgCpu": 48.7,
  "avgMemory": 62.4,
  "avgDisk": 51.2,
  "avgLatencyMs": 14.8,
  "totalThroughputMbps": 684.2,
  "activeAlertsCount": 2,
  "healthStatus": "degraded",
  "systemMessage": "2 cluster nodes requiring operational inspection",
  "timestamp": "2026-11-05T14:30:00.000Z",
  "snapshots": [
    {
      "nodeId": "node-us-east-1",
      "timestamp": "14:30:00",
      "cpu": 34.2,
      "memory": 48.6,
      "networkIn": 145.8,
      "networkOut": 182.4,
      "healthScore": 100,
      "perCoreCpu": [32.1, 35.4, 30.2, 38.9]
    }
  ]
}
```

---

### 3.2 Time-Series Historical Metrics
Retrieves chronologically ordered time-series snapshots for SVG sparklines and historical telemetry charts.

- **Method**: `GET`
- **Path**: `/api/metrics/history/:nodeId` (or `/api/metrics/history?nodeId=...`)
- **Query Parameters**:
  - `range` (string, optional): Time window. Supported: `5m`, `15m`, `1h`, `6h`, `24h`, `7d`. (Default: `1h`)
  - `limit` (integer, optional): Maximum sample points returned (Default: `50`, Max: `500`).
- **Response**: `200 OK`
```json
[
  {
    "id": 14201,
    "nodeId": "node-us-east-1",
    "timestamp": "14:15:00",
    "isoTimestamp": "2026-11-05T14:15:00.000Z",
    "epochMs": 1730816100000,
    "cpu": 31.8,
    "memory": 47.9,
    "disk": 52.1,
    "networkIn": 140.2,
    "networkOut": 178.5,
    "totalThroughput": 318.7,
    "healthScore": 100,
    "containerRunning": 16,
    "containerFailed": 0,
    "containerTotal": 16,
    "latency": 4.1
  },
  {
    "id": 14202,
    "nodeId": "node-us-east-1",
    "timestamp": "14:18:00",
    "isoTimestamp": "2026-11-05T14:18:00.000Z",
    "epochMs": 1730816280000,
    "cpu": 34.2,
    "memory": 48.6,
    "disk": 52.1,
    "networkIn": 145.8,
    "networkOut": 182.4,
    "totalThroughput": 328.2,
    "healthScore": 100,
    "containerRunning": 16,
    "containerFailed": 0,
    "containerTotal": 16,
    "latency": 4.2
  }
]
```

---

### 3.3 Real-Server Telemetry Ingestion (`POST /api/metrics/ingest`)
The primary ingestion gateway for monitored servers, cloud VMs, and container hosts running `apex-agent.py` or `apex-agent.sh`. Automatically registers unknown nodes, saves metric snapshots, updates heartbeat timestamps, and evaluates active threshold rules.

- **Method**: `POST`
- **Path**: `/api/metrics/ingest`
- **Headers**:
  ```http
  Content-Type: application/json
  x-apex-node-secret: <OPTIONAL_SHARED_SECRET>
  ```
- **Request Body Fields**:

| Field | Type | Required | Description |
|---|---|---|---|
| `nodeId` | `string` | **Yes** | Unique identifier of the node (e.g. `node-aws-ec2-web01`) |
| `cpuPercent` | `number` | **Yes** | Aggregate CPU load percentage (`0.0` - `100.0`) |
| `perCoreCpu` | `number[]` | No | Per-core utilization array `[42.1, 55.0, ...]` |
| `ramUsedGb` | `number` | **Yes** | Physical RAM actively allocated in GB |
| `ramTotalGb` | `number` | **Yes** | Total installed physical RAM in GB |
| `networkInMbps` | `number` | No | Inbound network interface rate in Mbps |
| `networkOutMbps` | `number` | No | Outbound network interface rate in Mbps |
| `containerTotal` | `number` | No | Total containers detected on host |
| `containerRunning` | `number` | No | Healthy running containers |
| `containerFailed` | `number` | No | Dead, crashed, or restarting containers |
| `name` | `string` | No | Friendly node display label |
| `hostname` | `string` | No | Fully qualified hostname |
| `ip` | `string` | No | Primary network IP address |
| `os` | `string` | No | OS distribution & kernel version |
| `region` | `string` | No | Deployment region / datacenter |
| `tags` | `string[]` | No | Metadata tags |
| `timestamp` | `number` | No | Epoch millisecond timestamp of collection |

- **Sample Ingestion Payload**:
```json
{
  "nodeId": "node-prod-app-01",
  "name": "Prod Application Node 01",
  "hostname": "app-01.us-east.company.internal",
  "ip": "172.31.42.18",
  "os": "Linux 6.8.0-48-generic (Ubuntu 24.04)",
  "region": "us-east-1",
  "cpuPercent": 74.2,
  "perCoreCpu": [71.5, 78.0, 72.8, 74.5],
  "ramUsedGb": 24.8,
  "ramTotalGb": 32.0,
  "networkInMbps": 182.4,
  "networkOutMbps": 215.1,
  "containerTotal": 14,
  "containerRunning": 14,
  "containerFailed": 0,
  "timestamp": 1730817000000,
  "tags": ["production", "aws-ec2", "docker"]
}
```

- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Telemetry snapshot ingested successfully",
  "nodeId": "node-prod-app-01",
  "snapshotId": 18290,
  "healthScore": 100,
  "timestamp": 1730817000000
}
```

---

## 4. Alert Rules & Incident Management

### 4.1 List Alert Rules
- **Method**: `GET`
- **Path**: `/api/alerts`
- **Query Parameters**:
  - `active` (boolean, optional): Set to `true` to return only enabled rules.
- **Response**: `200 OK`
```json
[
  {
    "id": "rule-cpu-85",
    "name": "High CPU Sustained Breach",
    "node_id": null,
    "metric_name": "cpu",
    "operator": ">=",
    "threshold": 85.0,
    "severity": "critical",
    "is_active": 1,
    "created_at": 1730000000000
  }
]
```

---

### 4.2 Create New Alert Rule
- **Method**: `POST`
- **Path**: `/api/alerts`
- **Request Body**:
```json
{
  "name": "Postgres High Memory Warning",
  "nodeId": "node-eu-west-1",
  "metricName": "ram",
  "operator": ">=",
  "threshold": 88.0,
  "severity": "warning",
  "isActive": true
}
```
- **Response**: `201 Created`

---

### 4.3 Update Alert Rule
- **Method**: `PUT`
- **Path**: `/api/alerts/:id`
- **Request Body**: Full or partial rule object (`threshold`, `operator`, `is_active`, etc.)
- **Response**: `200 OK`

---

### 4.4 List Incidents
- **Method**: `GET`
- **Path**: `/api/incidents`
- **Query Parameters**:
  - `status` (string, optional): `open`, `investigating`, `resolved`
  - `severity` (string, optional): `info`, `warning`, `critical`
  - `nodeId` (string, optional): Filter by target server node
  - `limit` (integer, optional): Maximum records (Default: `100`)
- **Response**: `200 OK`
```json
[
  {
    "id": "inc-auto-9021",
    "node_id": "node-us-east-1",
    "nodeName": "Edge Gateway Alpha",
    "alert_rule_id": "rule-cpu-85",
    "title": "CPU Threshold Exceeded",
    "description": "Node node-us-east-1: CPU usage 94.2% >= 85.0%",
    "severity": "critical",
    "status": "open",
    "timestamp": 1730816800000,
    "resolved_at": null
  }
]
```

---

### 4.5 Update Incident Status (Acknowledge / Resolve)
- **Method**: `PATCH`
- **Path**: `/api/incidents/:id`
- **Request Body**:
```json
{
  "status": "investigating"
}
```
*Or to resolve:*
```json
{
  "status": "resolved"
}
```
- **Response**: `200 OK`

---

## 5. System Health & Unified Logs (`/api/system`)

### 5.1 System Health Overview
- **Method**: `GET`
- **Path**: `/api/system/health`
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "journalMode": "wal",
    "totalNodes": 6,
    "totalSnapshots": 14202
  },
  "simulation": {
    "active": true,
    "intervalMs": 3000
  },
  "uptimeSeconds": 86420,
  "serverTime": "2026-11-05T14:30:00.000Z"
}
```

---

### 5.2 Unified Streaming Logs
Unified stdout daemon stream for server services and node agents.

- **Method**: `GET`
- **Path**: `/api/system/logs` (or `/api/logs`)
- **Query Parameters**:
  - `nodeId` (string, optional): Filter by node
  - `limit` (integer, optional): Number of log entries (Default: `50`, Max: `200`)
- **Response**: `200 OK`
```json
[
  {
    "id": "log-182",
    "timestamp": "14:29:58",
    "nodeId": "node-us-east-1",
    "nodeName": "Edge Gateway Alpha",
    "service": "traefik-ingress",
    "level": "info",
    "message": "TLS certificate handshake renewed for *.apexpulse.internal"
  }
]
```
