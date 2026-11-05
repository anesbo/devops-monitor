# ApexPulse Production Deployment & Real-Server Operations Handbook

This guide is an end-to-end operational runbook for deploying **ApexPulse (DevOps Monitor)** in real-world infrastructure. It covers provisioning the central observability dashboard and API on a cloud VM, configuring automated telemetry collection across remote worker nodes (AWS EC2, DigitalOcean, Hetzner, Bare Metal, or on-premise servers), setting up alerting thresholds, and applying production security hardening.

---

## Architecture Overview

```
                                      ┌─────────────────────────────────────────────────────────────┐
                                      │                    CENTRAL SERVER (VPS / VM)                │
                                      │                                                             │
                                      │   ┌─────────────────────────────────────────────────────┐   │
                                      │   │           Nginx Reverse Proxy (SSL / TLS 1.3)       │   │
                                      │   │              Port 80 / 443 -> Let's Encrypt         │   │
                                      │   └──────────┬───────────────────────────────┬──────────┘   │
                                      │              │                               │              │
                                      │              ▼ :80                           ▼ :4000        │
                                      │   ┌──────────────────────┐        ┌─────────────────────┐   │
                                      │   │ ApexPulse Dashboard  │        │   ApexPulse Backend │   │
                                      │   │ (Vite React 18 SPA)  │◄──────►│   (Express / Node)  │   │
                                      │   └──────────────────────┘        └──────────┬──────────┘   │
                                      │                                              │              │
                                      │                                              ▼              │
                                      │                                   ┌─────────────────────┐   │
                                      │                                   │ SQLite WAL Database │   │
                                      │                                   │  (apexpulse.db)     │   │
                                      │                                   └─────────────────────┘   │
                                      └──────────────────────────────▲──────────────────────────────┘
                                                                     │
                                    HTTPS POST /api/metrics/ingest   │ (Every 3-5s with x-apex-node-secret)
                                                                     │
              ┌──────────────────────────────────────┼──────────────────────────────────────┐
              │                                      │                                      │
              ▼                                      ▼                                      ▼
 ┌─────────────────────────┐            ┌─────────────────────────┐            ┌─────────────────────────┐
 │   AWS EC2 NODE (us-east)│            │   DIGITALOCEAN DROPLET  │            │  ON-PREM / BARE METAL   │
 │                         │            │                         │            │                         │
 │  ┌───────────────────┐  │            │  ┌───────────────────┐  │            │  ┌───────────────────┐  │
 │  │apex-agent.py (sysd│  │            │  │apex-agent.py (sysd│  │            │  │apex-agent.sh (cron│  │
 │  └─────────┬─────────┘  │            │  └─────────┬─────────┘  │            │  └─────────┬─────────┘  │
 │            ▼            │            │            ▼            │            │            ▼            │
 │   /proc/stat, meminfo   │            │   /proc/stat, meminfo   │            │   /proc/stat, meminfo   │
 │   Docker Socket Daemon  │            │   Docker Socket Daemon  │            │   Container Health Check│
 └─────────────────────────┘            └─────────────────────────┘            └─────────────────────────┘
```

---

## Part 1: Central Server Deployment

Deploy the Central ApexPulse Dashboard and Ingestion Server on an Ubuntu 22.04 or 24.04 LTS server (minimum specs: 1 vCPU, 1 GB RAM, 15 GB SSD).

### Option A: Docker Compose Deployment (Recommended)

Docker Compose offers the quickest, most resilient path to production.

#### 1. Install Docker & Compose on Ubuntu
```bash
sudo apt update && sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

#### 2. Clone Repository & Setup Environment
```bash
cd /opt
sudo git clone https://github.com/anesbo/devops-monitor.git apexpulse
cd /opt/apexpulse

# Create secure environment file
sudo cat <<EOF > /opt/apexpulse/.env
NODE_ENV=production
PORT=4000
DB_PATH=/data/apexpulse.db
NODE_INGEST_SECRET=$(openssl rand -hex 24)
SIMULATION_ENABLED=false
EOF
```

#### 3. Launch with Docker Compose
```bash
# Build and start services in the background
sudo docker compose up -d --build

# Verify container statuses
sudo docker compose ps
sudo docker compose logs -f server
```

---

### Option B: Native Bare-Metal / VPS Systemd Deployment

If running directly on the host without containerization:

#### 1. Install Node.js 20 LTS & Build Tools
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential git sqlite3
```

#### 2. Build Frontend and Backend
```bash
cd /opt
sudo git clone https://github.com/anesbo/devops-monitor.git apexpulse
cd /opt/apexpulse

# Install root, server, and client dependencies
npm install
npm --prefix server install
npm --prefix client install

# Compile TypeScript artifacts
npm --prefix server run build
npm --prefix client run build
```

#### 3. Create Systemd Service for Central Server
```bash
sudo cat <<EOF > /etc/systemd/system/apexpulse-server.service
[Unit]
Description=ApexPulse Observability Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/apexpulse/server
Environment="NODE_ENV=production"
Environment="PORT=4000"
Environment="DB_PATH=/var/lib/apexpulse/apexpulse.db"
Environment="NODE_INGEST_SECRET=$(openssl rand -hex 24)"
Environment="SIMULATION_ENABLED=false"
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5s

# Hardening
LimitNOFILE=65535
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

# Create persistent state directory with appropriate permissions
sudo mkdir -p /var/lib/apexpulse
sudo chown -R www-data:www-data /var/lib/apexpulse /opt/apexpulse

# Reload and start service
sudo systemctl daemon-reload
sudo systemctl enable --now apexpulse-server
sudo systemctl status apexpulse-server
```

---

### Nginx Reverse Proxy & SSL Setup

Expose the dashboard on standard ports 80/443 with automated TLS encryption.

#### 1. Install Nginx & Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### 2. Configure Nginx Virtual Host
Create `/etc/nginx/sites-available/apexpulse.conf`:
```nginx
server {
    listen 80;
    server_name pulse.yourdomain.com;

    # Redirect all HTTP requests to HTTPS
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name pulse.yourdomain.com;

    # SSL certificates provisioned by Certbot
    ssl_certificate /etc/letsencrypt/live/pulse.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pulse.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # 1. API & Telemetry Ingestion Gateway
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for live streaming
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        client_max_body_size 5M;
        proxy_read_timeout 60s;
    }

    # 2. Production Static Dashboard Assets
    location / {
        root /opt/apexpulse/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache static bundle chunks
        location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, no-transform";
        }
    }
}
```

#### 3. Enable Site & Request SSL Certificate
```bash
sudo ln -sf /etc/nginx/sites-available/apexpulse.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Request Let's Encrypt certificate
sudo certbot --nginx -d pulse.yourdomain.com
```

---

## Part 2: Monitored Node Setup

Install the ApexPulse agent on every server you wish to observe. The agent uses pure Linux virtual file interfaces (`/proc/stat`, `/proc/meminfo`, `/proc/net/dev`) with zero external dependency bloat.

### Option A: Python 3 Agent (Standard)

Works on Ubuntu 20.04/22.04/24.04, Debian 11/12, RHEL 8/9, Rocky Linux, AWS Linux 2023, and macOS.

#### 1. Download Agent to Host Machine
```bash
sudo mkdir -p /opt/apex-agent
sudo curl -fsSL https://raw.githubusercontent.com/anesbo/devops-monitor/feat/frontend-architecture/agent/apex-agent.py -o /opt/apex-agent/apex-agent.py
sudo chmod +x /opt/apex-agent/apex-agent.py
```

#### 2. Docker Health Permissions (Optional)
If the monitored host runs Docker containers and you want container health scoring:
```bash
# Allow the agent user to query docker status without root
sudo usermod -aG docker www-data
```

#### 3. Install Systemd Service
Create `/etc/systemd/system/apex-agent.service`:
```ini
[Unit]
Description=ApexPulse Telemetry Node Daemon
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/apex-agent
Environment="APEX_SERVER_URL=https://pulse.yourdomain.com"
Environment="APEX_NODE_ID=aws-ec2-prod-api-01"
Environment="APEX_NODE_NAME=Prod API Gateway 01"
Environment="APEX_NODE_SECRET=your-shared-secret-token"
Environment="APEX_NODE_REGION=us-east-1"
Environment="APEX_INTERVAL_SEC=3"
ExecStart=/usr/bin/python3 /opt/apex-agent/apex-agent.py
Restart=always
RestartSec=5s

# Security Hardening
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

#### 4. Start Agent
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now apex-agent
sudo journalctl -u apex-agent -f
```

You should see logs indicating successful telemetry ingestion:
```
[14:32:01] [OK] Telemetry ingested | Score: 100
[14:32:04] [OK] Telemetry ingested | Score: 100
```

---

### Option B: POSIX Bash Agent (Ultra-Minimal / Embedded / Alpine)

If Python 3 is not installed or you prefer an ultra-lightweight zero-dependency shell loop:

#### 1. Download Bash Agent
```bash
sudo mkdir -p /opt/apex-agent
sudo curl -fsSL https://raw.githubusercontent.com/anesbo/devops-monitor/feat/frontend-architecture/agent/apex-agent.sh -o /opt/apex-agent/apex-agent.sh
sudo chmod +x /opt/apex-agent/apex-agent.sh
```

#### 2. Configure and Run via Systemd or Crontab
Set up `/etc/systemd/system/apex-agent-sh.service`:
```ini
[Unit]
Description=ApexPulse Lightweight Bash Agent
After=network.target

[Service]
Type=simple
Environment="APEX_SERVER_URL=https://pulse.yourdomain.com"
Environment="APEX_NODE_ID=do-sgp-db-01"
Environment="APEX_NODE_NAME=Singapore Replica Database"
Environment="APEX_NODE_SECRET=your-shared-secret-token"
Environment="APEX_NODE_REGION=ap-southeast-1"
Environment="APEX_INTERVAL_SEC=3"
ExecStart=/bin/bash /opt/apex-agent/apex-agent.sh
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now apex-agent-sh
```

---

## Part 3: Automated Node Registration & Telemetry Ingestion

ApexPulse features **zero-touch node discovery**. When an agent transmits its first payload to `/api/metrics/ingest`:

1. **Auto-Registration**: If `nodeId` does not yet exist in SQLite, the central server registers it with its hostname, detected OS, IP, core count, and region.
2. **Heartbeat & Status Computation**:
   - `healthy / online`: Telemetry arriving consistently within threshold limits.
   - `warning / degraded`: CPU > 75%, RAM > 85%, or container health score < 75.
   - `critical`: CPU > 90%, RAM > 92%, or container health score < 50.
   - `offline`: No heartbeat ping received for > 30 seconds.
3. **Hardware Matrix Storage**: Per-core metrics are parsed into JSON arrays for heat-map visualization on the dashboard.

---

## Part 4: Alerting & Threshold Configuration

ApexPulse evaluates incoming telemetry against configured alert rules on every ingest cycle.

### 1. Alert Rule Structure
Alert rules define boundaries across 4 metric dimensions:
- `cpu`: Percentage aggregate CPU load (e.g., `>= 85%`).
- `ram`: Percentage memory utilization (e.g., `>= 90%`).
- `network`: Throughput saturation in Mbps (e.g., `>= 800 Mbps`).
- `container_health`: Container score derived from failed vs running containers (`<= 70/100`).

### 2. Severity Tiers
- `CRITICAL`: Immediate intervention required. Triggers dual-tone Web Audio alert chime in the dashboard and highlights the affected node in crimson pulse styling.
- `WARNING`: Early degradation warning. Amber visual banner and telemetry badge.
- `INFO`: Audit notification (e.g. node registered or service rebooted).

### 3. Incident Lifecycle
```
[Rule Breached] ──► OPEN ──► [Engineer Clicks "Ack"] ──► INVESTIGATING ──► [Metric Returns Normal / "Resolve"] ──► RESOLVED
```

---

## Part 5: Production Security & Performance Hardening

### 1. Firewall Configuration (UFW)
On the central server, restrict direct access to port 4000; all traffic should flow through Nginx.
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH (or your custom port)
sudo ufw allow 80/tcp    # HTTP Let's Encrypt
sudo ufw allow 443/tcp   # HTTPS Dashboard & Ingest
sudo ufw enable
```

### 2. SQLite Write-Ahead Logging (WAL) & Automated Backups
ApexPulse automatically initializes SQLite with `PRAGMA journal_mode = WAL;` and `PRAGMA busy_timeout = 5000;`, enabling concurrent read and write transactions without locking errors.

Set up an automated daily backup cron job:
```bash
sudo cat << 'EOF' > /usr/local/bin/backup-apexpulse.sh
#!/bin/bash
BACKUP_DIR="/var/backups/apexpulse"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
sqlite3 /var/lib/apexpulse/apexpulse.db ".backup '$BACKUP_DIR/apexpulse_$TIMESTAMP.db'"
# Retain backups for 14 days
find "$BACKUP_DIR" -type f -name "*.db" -mtime +14 -delete
EOF

sudo chmod +x /usr/local/bin/backup-apexpulse.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-apexpulse.sh") | crontab -
```

### 3. Log Rotation
Prevent log buildup on the central server and monitored nodes:
```bash
sudo cat << 'EOF' > /etc/logrotate.d/apexpulse
/var/log/nginx/apexpulse*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
EOF
```

---

## Part 6: Troubleshooting & FAQ

### Q1: The agent outputs `HTTP 401 Unauthorized`
- **Cause**: The central server has `NODE_INGEST_SECRET` configured, but the agent's `APEX_NODE_SECRET` does not match.
- **Fix**: Verify `/etc/systemd/system/apex-agent.service` matches the secret set in the central server `.env`.

### Q2: Docker containers are not detected on the monitored node
- **Cause**: The user running `apex-agent.py` does not have access to `/var/run/docker.sock`.
- **Fix**: Run `sudo usermod -aG docker <USER>` and restart the agent, or run the agent service as `root`. Test with `docker ps -a --format "{{.Status}}"`.

### Q3: Ingestion returns `HTTP 502 Bad Gateway` from Nginx
- **Cause**: The backend Node.js process is stopped or crashing on port 4000.
- **Fix**: Inspect backend logs: `sudo journalctl -u apexpulse-server -n 50 --no-pager` or `sudo docker compose logs server`.

### Q4: Dashboard metrics are paused or not updating
- **Cause**: The auto-refresh switch in the header bar is toggled to "LIVE PAUSED".
- **Fix**: Click the "PAUSED" button in the top right of the dashboard header to resume live 2.5s streaming polling.
