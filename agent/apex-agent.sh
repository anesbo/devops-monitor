#!/usr/bin/env bash
# ==============================================================================
# ApexPulse Lightweight Bash Telemetry Agent
# ==============================================================================
# Zero-dependency Bash agent for Alpine, Ubuntu, Debian, CentOS, RHEL, Arch.
# Requires only: bash, curl, awk, grep.
#
# Environment variables:
#   APEX_SERVER_URL    Central server URL (e.g. http://10.0.0.1:5000)
#   SERVER_URL         Alias for APEX_SERVER_URL
#   APEX_NODE_ID       Unique node identifier (default: hostname)
#   NODE_ID            Alias for APEX_NODE_ID
#   APEX_NODE_NAME     Display name for this node (default: hostname)
#   NODE_NAME          Alias for APEX_NODE_NAME
#   APEX_NODE_SECRET   Shared secret key for authentication (optional)
#   NODE_SECRET        Alias for APEX_NODE_SECRET
#   APEX_NODE_REGION   Cloud region label (e.g. us-east-1, default)
#   NODE_REGION        Alias for APEX_NODE_REGION
#   POLL_INTERVAL      Sampling interval in seconds (default: 3)
#   APEX_INTERVAL_SEC  Alias for POLL_INTERVAL
# ==============================================================================

set -u

SERVER_URL="${APEX_SERVER_URL:-${SERVER_URL:-http://localhost:5000}}"
SERVER_URL="${SERVER_URL%/}"
HOSTNAME_LOWER="$(hostname 2>/dev/null | tr '[:upper:]' '[:lower:]' || echo "linux-node")"
NODE_ID="${NODE_ID:-${APEX_NODE_ID:-node-${HOSTNAME_LOWER}}}"
NODE_NAME="${NODE_NAME:-${APEX_NODE_NAME:-$(hostname 2>/dev/null || echo "Linux Server")}}"
NODE_SECRET="${NODE_SECRET:-${APEX_NODE_SECRET:-}}"
NODE_REGION="${NODE_REGION:-${APEX_NODE_REGION:-default}}"
INTERVAL_SEC="${POLL_INTERVAL:-${APEX_INTERVAL_SEC:-3}}"
ENDPOINT="${SERVER_URL}/api/metrics/ingest"

echo "============================================================"
echo " ApexPulse Bash Telemetry Agent"
echo "============================================================"
echo " Target Endpoint : $ENDPOINT"
echo " Node Identifier : $NODE_ID"
echo " Node Name       : $NODE_NAME"
echo " Cloud Region    : $NODE_REGION"
echo " Interval        : ${INTERVAL_SEC}s"
echo "============================================================"

# Helper: Detect outbound IP
HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [ -z "$HOST_IP" ]; then
  HOST_IP="127.0.0.1"
fi

# Detect CPU Cores
CPU_CORES=$(grep -c ^processor /proc/cpuinfo 2>/dev/null || echo "4")

# Auto-Registration on first run
AUTH_HEADERS=(-H "Content-Type: application/json")
if [ -n "$NODE_SECRET" ]; then
  AUTH_HEADERS+=(-H "X-Apex-Node-Secret: $NODE_SECRET" -H "X-API-Key: $NODE_SECRET")
fi

echo "[ApexPulse Agent] Checking node registration at ${SERVER_URL}..."
CHECK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${AUTH_HEADERS[@]}" "${SERVER_URL}/api/nodes/${NODE_ID}" || echo "000")

if [ "$CHECK_STATUS" != "200" ]; then
  echo "[ApexPulse Agent] Node '${NODE_ID}' not found (HTTP $CHECK_STATUS). Registering..."
  
  # Read total RAM for registration payload
  TOTAL_RAM_GB="16.0"
  if [ -f /proc/meminfo ]; then
    MEM_TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_RAM_GB=$(awk "BEGIN { printf \"%.2f\", $MEM_TOTAL_KB / 1048576 }")
  fi

  REG_PAYLOAD=$(cat <<EOF
{
  "id": "$NODE_ID",
  "name": "$NODE_NAME",
  "hostname": "$(hostname 2>/dev/null || echo "$NODE_ID")",
  "ip": "$HOST_IP",
  "status": "online",
  "os": "$(uname -s 2>/dev/null || echo "Linux") $(uname -r 2>/dev/null || echo "")",
  "region": "$NODE_REGION",
  "cpu_cores": $CPU_CORES,
  "total_ram_gb": $TOTAL_RAM_GB,
  "tags": ["bash-agent", "$NODE_REGION", "$(uname -m 2>/dev/null || echo "x86_64")"]
}
EOF
)
  curl -s -X POST "${AUTH_HEADERS[@]}" -d "$REG_PAYLOAD" "${SERVER_URL}/api/nodes" >/dev/null 2>&1 || true
  echo "[ApexPulse Agent] Registration request completed."
else
  echo "[ApexPulse Agent] Node '${NODE_ID}' is already registered."
fi

# State tracking for network and CPU deltas
PREV_TOTAL=0
PREV_IDLE=0
PREV_RX=0
PREV_TX=0
PREV_TIME=$(date +%s)

get_network_bytes() {
  if [ -f /proc/net/dev ]; then
    awk 'NR>2 && $1 !~ /lo/ { rx+=$2; tx+=$10 } END { printf "%d %d", rx, tx }' /proc/net/dev
  else
    echo "0 0"
  fi
}

read -r PREV_RX PREV_TX <<< "$(get_network_bytes)"

echo "[ApexPulse Agent] Starting telemetry streaming..."
PING_COUNT=0

while true; do
  # 1. CPU Aggregate Metrics from /proc/stat
  if [ -f /proc/stat ]; then
    CPU_LINE=$(grep '^cpu ' /proc/stat)
    USER=$(echo "$CPU_LINE" | awk '{print $2}')
    NICE=$(echo "$CPU_LINE" | awk '{print $3}')
    SYS=$(echo "$CPU_LINE" | awk '{print $4}')
    IDLE=$(echo "$CPU_LINE" | awk '{print $5}')
    IOW=$(echo "$CPU_LINE" | awk '{print $6}')
    IRQ=$(echo "$CPU_LINE" | awk '{print $7}')
    SIRQ=$(echo "$CPU_LINE" | awk '{print $8}')

    TOTAL=$((USER + NICE + SYS + IDLE + IOW + IRQ + SIRQ))
    IDLE_SUM=$((IDLE + IOW))

    DIFF_TOTAL=$((TOTAL - PREV_TOTAL))
    DIFF_IDLE=$((IDLE_SUM - PREV_IDLE))

    PREV_TOTAL=$TOTAL
    PREV_IDLE=$IDLE_SUM

    if [ "$DIFF_TOTAL" -gt 0 ]; then
      CPU_PERCENT=$(awk "BEGIN { printf \"%.1f\", (($DIFF_TOTAL - $DIFF_IDLE) / $DIFF_TOTAL) * 100 }")
    else
      CPU_PERCENT="0.0"
    fi
  else
    CPU_PERCENT="15.0"
  fi

  # 2. RAM Metrics from /proc/meminfo
  if [ -f /proc/meminfo ]; then
    MEM_TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEM_AVAIL_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    if [ -z "$MEM_AVAIL_KB" ]; then
      MEM_FREE_KB=$(grep MemFree /proc/meminfo | awk '{print $2}')
      BUFFERS=$(grep Buffers /proc/meminfo | awk '{print $2}')
      CACHED=$(grep '^Cached:' /proc/meminfo | awk '{print $2}')
      MEM_AVAIL_KB=$((MEM_FREE_KB + BUFFERS + CACHED))
    fi

    MEM_USED_KB=$((MEM_TOTAL_KB - MEM_AVAIL_KB))
    RAM_TOTAL_GB=$(awk "BEGIN { printf \"%.2f\", $MEM_TOTAL_KB / 1048576 }")
    RAM_USED_GB=$(awk "BEGIN { printf \"%.2f\", $MEM_USED_KB / 1048576 }")
  else
    RAM_TOTAL_GB="16.00"
    RAM_USED_GB="4.00"
  fi

  # 3. Network Throughput (Mbps)
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - PREV_TIME))
  if [ "$ELAPSED" -le 0 ]; then ELAPSED=1; fi

  read -r CURR_RX CURR_TX <<< "$(get_network_bytes)"
  DIFF_RX=$((CURR_RX - PREV_RX))
  DIFF_TX=$((CURR_TX - PREV_TX))
  if [ "$DIFF_RX" -lt 0 ]; then DIFF_RX=0; fi
  if [ "$DIFF_TX" -lt 0 ]; then DIFF_TX=0; fi

  NET_IN_MBPS=$(awk "BEGIN { printf \"%.2f\", ($DIFF_RX * 8) / ($ELAPSED * 1000000) }")
  NET_OUT_MBPS=$(awk "BEGIN { printf \"%.2f\", ($DIFF_TX * 8) / ($ELAPSED * 1000000) }")

  PREV_RX=$CURR_RX
  PREV_TX=$CURR_TX
  PREV_TIME=$CURRENT_TIME

  # 4. Container Health via Docker CLI (if available)
  CON_TOTAL=0
  CON_RUNNING=0
  CON_FAILED=0
  if command -v docker >/dev/null 2>&1; then
    DOCKER_STATUSES=$(docker ps -a --format "{{.Status}}" 2>/dev/null || true)
    if [ -n "$DOCKER_STATUSES" ]; then
      CON_TOTAL=$(echo "$DOCKER_STATUSES" | wc -l | tr -d ' ')
      CON_RUNNING=$(echo "$DOCKER_STATUSES" | grep -ci '^up' || true)
      CON_FAILED=$(echo "$DOCKER_STATUSES" | grep -ciE '(exit \([1-9]|dead|restarting)' || true)
    fi
  fi

  TIMESTAMP=$(date +%s%3N 2>/dev/null || date +%s000)

  # 5. Build JSON Payload
  JSON_PAYLOAD=$(cat <<EOF
{
  "nodeId": "$NODE_ID",
  "name": "$NODE_NAME",
  "hostname": "$(hostname 2>/dev/null || echo "$NODE_ID")",
  "ip": "$HOST_IP",
  "os": "$(uname -s 2>/dev/null || echo "Linux") $(uname -r 2>/dev/null || echo "")",
  "region": "$NODE_REGION",
  "cpuPercent": $CPU_PERCENT,
  "perCoreCpu": [$CPU_PERCENT],
  "ramUsedGb": $RAM_USED_GB,
  "ramTotalGb": $RAM_TOTAL_GB,
  "networkInMbps": $NET_IN_MBPS,
  "networkOutMbps": $NET_OUT_MBPS,
  "containerTotal": $CON_TOTAL,
  "containerRunning": $CON_RUNNING,
  "containerFailed": $CON_FAILED,
  "timestamp": $TIMESTAMP,
  "tags": ["bash-agent", "$NODE_REGION", "$(uname -m 2>/dev/null || echo "x86_64")"]
}
EOF
)

  # 6. Transmit Telemetry
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    "${AUTH_HEADERS[@]}" \
    -d "$JSON_PAYLOAD" \
    --connect-timeout 4 \
    --max-time 6 2>/dev/null || echo "000")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  PING_COUNT=$((PING_COUNT + 1))

  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "[$(date +%T)] [Ping #$PING_COUNT] Ingest OK (HTTP $HTTP_CODE) -> CPU: ${CPU_PERCENT}% | RAM: ${RAM_USED_GB}/${RAM_TOTAL_GB} GB | Net: ${NET_IN_MBPS} IN / ${NET_OUT_MBPS} OUT Mbps | Containers: ${CON_RUNNING}/${CON_TOTAL}"
  elif [ "$HTTP_CODE" -eq 401 ]; then
    echo "[$(date +%T)] [Ping #$PING_COUNT] ERROR 401: Unauthorized. Please configure matching NODE_SECRET." >&2
  else
    echo "[$(date +%T)] [Ping #$PING_COUNT] Ingest warning (HTTP $HTTP_CODE): $BODY" >&2
  fi

  sleep "$INTERVAL_SEC"
done
