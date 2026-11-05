# ApexPulse Telemetry Agent

The **ApexPulse Telemetry Agent** is a lightweight, cross-platform monitoring daemon designed to run on bare-metal servers, cloud VMs (AWS EC2, GCP Compute Engine, Azure, Hetzner, DigitalOcean), and local workstations.

It streams real-time CPU, per-core CPU, memory pressure, network bandwidth, and Docker container health to the ApexPulse Central Observability Dashboard.

---

## Agent Variants

ApexPulse provides two production-grade agent implementations:

1. **`apex-agent.py`** (Recommended)
   - Python 3 cross-platform agent (Linux, Windows, macOS).
   - High-precision telemetry using `psutil` if installed.
   - **Zero-dependency fallback**: automatically reads `/proc/stat`, `/proc/meminfo`, `/proc/net/dev`, and Docker CLI without requiring any `pip` packages.
   - Supports auto-registration on first ping via `POST /api/nodes`.

2. **`apex-agent.sh`**
   - Ultra-minimalist Bash agent for bare-bones Linux distributions (Alpine, Debian minimal, containers).
   - Requires only: `bash`, `curl`, `awk`, and `grep`.

---

## Configuration Reference

Both agents read configuration from environment variables or a `.env` file:

| Variable | Default Value | Description |
|---|---|---|
| `APEX_SERVER_URL` or `SERVER_URL` | `http://localhost:5000` | ApexPulse server base URL |
| `NODE_ID` or `APEX_NODE_ID` | `node-<hostname>` | Unique node identifier in cluster |
| `NODE_NAME` or `APEX_NODE_NAME` | `<hostname>` | Display name shown in UI |
| `NODE_SECRET` or `APEX_NODE_SECRET` | *(empty)* | Shared secret key for `X-Apex-Node-Secret` authentication |
| `POLL_INTERVAL` or `APEX_INTERVAL_SEC` | `3` | Telemetry transmission interval in seconds |
| `NODE_REGION` or `APEX_NODE_REGION` | `default` | Geographical region (e.g. `us-east-1`, `eu-central-1`) |
| `NODE_TAGS` | `["bare-metal", "apex-agent"]` | JSON array of metadata tags |

---

## Quickstart Guide

### Option 1: Python Agent (`apex-agent.py`)

#### 1. Quick Test Run
```bash
# Clone or copy agent directory to your server
git clone https://github.com/anesbo/devops-monitor.git
cd devops-monitor/agent

# Optional: Install psutil for enhanced precision (or run without any dependencies)
pip3 install psutil

# Run with environment variables
export APEX_SERVER_URL="http://your-apexpulse-server:5000"
export NODE_ID="prod-app-server-01"
export NODE_NAME="Production App Server 01"
export NODE_REGION="us-east-1"
export POLL_INTERVAL=3

python3 apex-agent.py
```

#### 2. Systemd Service Deployment (Linux)
To run the agent continuously in the background and auto-restart on boot:

1. Copy script to `/usr/local/bin`:
   ```bash
   sudo cp apex-agent.py /usr/local/bin/apex-agent.py
   sudo chmod +x /usr/local/bin/apex-agent.py
   ```

2. Create environment file `/etc/apexpulse-agent.env`:
   ```bash
   sudo cat <<EOF > /etc/apexpulse-agent.env
   APEX_SERVER_URL=http://your-apexpulse-server:5000
   NODE_ID=prod-app-server-01
   NODE_NAME=Production App Server 01
   NODE_REGION=us-east-1
   POLL_INTERVAL=3
   NODE_SECRET=your-secure-ingest-secret
   EOF
   ```

3. Create systemd unit file `/etc/systemd/system/apexpulse-agent.service`:
   ```ini
   [Unit]
   Description=ApexPulse Telemetry Agent
   After=network.target

   [Service]
   Type=simple
   User=root
   EnvironmentFile=/etc/apexpulse-agent.env
   ExecStart=/usr/bin/python3 /usr/local/bin/apex-agent.py
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

4. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now apexpulse-agent
   sudo systemctl status apexpulse-agent
   ```

---

### Option 2: Bash Agent (`apex-agent.sh`)

For minimal servers without Python installed:

```bash
cd agent
chmod +x apex-agent.sh

# Run directly
APEX_SERVER_URL="http://your-apexpulse-server:5000" \
NODE_ID="edge-proxy-01" \
./apex-agent.sh
```

---

## Docker Container Health Monitoring

If Docker is installed on the host node, ensure the agent user belongs to the `docker` group so it can query container statuses:

```bash
sudo usermod -aG docker $USER
```

The agent automatically runs `docker ps -a --format "{{.Status}}"` to compute:
- `containerTotal`: Total count of containers
- `containerRunning`: Containers with status `Up`
- `containerFailed`: Containers with exit code > 0, `Dead`, or in restart loops

The ApexPulse backend calculates container health using:
$$\text{Health} = \max\left(0, \min\left(100, \text{round}\left(\frac{\text{running}}{\max(1, \text{total})} \times 100 - \text{failed} \times 15\right)\right)\right)$$

---

## Ingest Endpoint API Specification

The agent communicates with the central backend via:

### `POST /api/metrics/ingest`

**Headers:**
- `Content-Type: application/json`
- `X-Apex-Node-Secret: <secret>` *(Optional / required if `NODE_INGEST_SECRET` is set)*
- `X-API-Key: <secret>` *(Alternative)*

**JSON Request Body:**
```json
{
  "nodeId": "prod-app-server-01",
  "name": "Production App Server 01",
  "hostname": "app-01.internal",
  "ip": "10.0.1.50",
  "os": "Ubuntu 22.04 LTS",
  "region": "us-east-1",
  "cpuPercent": 42.5,
  "perCoreCpu": [40.0, 45.0, 41.2, 43.8],
  "ramUsedGb": 18.4,
  "ramTotalGb": 64.0,
  "networkInMbps": 145.2,
  "networkOutMbps": 180.5,
  "containerTotal": 12,
  "containerRunning": 12,
  "containerFailed": 0,
  "timestamp": 1778327804000
}
```

**Success Response (HTTP 201):**
```json
{
  "success": true,
  "message": "Telemetry snapshot ingested successfully",
  "nodeId": "prod-app-server-01",
  "snapshotId": 1420,
  "healthScore": 100,
  "timestamp": 1778327804000
}
```
