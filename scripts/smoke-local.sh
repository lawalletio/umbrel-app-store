#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="${PROJECT_NAME:-lawallet-nwc-local}"
COMPOSE_FILE="${ROOT_DIR}/test/docker-compose.regtest.yml"

export LOCAL_APP_DATA_DIR="${LOCAL_APP_DATA_DIR:-${ROOT_DIR}/.umbrel-local/lawallet-nwc}"
export APP_SEED="${APP_SEED:-lawallet-local-jwt-secret-at-least-32-chars}"
export APP_PASSWORD="${APP_PASSWORD:-lawallet-local-password}"
export LAWALLET_PORT="${LAWALLET_PORT:-2289}"

mkdir -p "${LOCAL_APP_DATA_DIR}"

docker compose --project-name "${PROJECT_NAME}" --file "${COMPOSE_FILE}" up --detach bitcoin lnd postgres lawallet-nwc

lawallet_ready=false
for attempt in $(seq 1 120); do
  if response="$(curl -fsS "http://127.0.0.1:${LAWALLET_PORT}/api/health" 2>/dev/null)" && \
    printf "%s" "${response}" | grep -q '"status":"ok"'; then
    lawallet_ready=true
    break
  fi
  sleep 2
done

if [[ "${lawallet_ready}" != "true" ]]; then
  echo "LaWallet health check did not pass in time." >&2
  docker compose --project-name "${PROJECT_NAME}" --file "${COMPOSE_FILE}" logs --tail 200 postgres lawallet-nwc >&2
  exit 1
fi

lnd_ready=false
for attempt in $(seq 1 60); do
  if lnd_info="$(docker compose --project-name "${PROJECT_NAME}" --file "${COMPOSE_FILE}" exec -T lnd \
    lncli --network=regtest --rpcserver=localhost:10009 --tlscertpath=/root/.lnd/tls.cert getinfo 2>/dev/null)" && \
    printf "%s" "${lnd_info}" | grep -q '"synced_to_chain": true'; then
    lnd_ready=true
    break
  fi
  sleep 2
done

if [[ "${lnd_ready}" != "true" ]]; then
  echo "LND regtest check did not pass in time." >&2
  docker compose --project-name "${PROJECT_NAME}" --file "${COMPOSE_FILE}" logs --tail 200 bitcoin lnd >&2
  exit 1
fi

echo "LaWallet health check passed: ${response}"
echo "LND regtest check passed."
echo "Admin UI: http://127.0.0.1:${LAWALLET_PORT}/admin"
echo "Bitcoin regtest RPC: 127.0.0.1:${BITCOIN_RPC_PORT:-18443} user=umbrel password=umbrel"
echo "LND regtest ports: grpc=${LND_GRPC_PORT:-10009} rest=${LND_REST_PORT:-18080}"
