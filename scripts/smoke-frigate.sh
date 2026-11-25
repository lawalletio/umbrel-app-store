#!/usr/bin/env bash
# Starts lawallet-frigate locally against the lawallet-signet stack (./scripts/smoke-signet.sh first),
# which stands in for the Bitcoin Node and Electrs apps, then checks the wiring and the dashboard.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export APP_DATA_DIR="${APP_DATA_DIR:-${ROOT_DIR}/.umbrel-local/lawallet-frigate}"
export FRIGATE_UI_PORT="${FRIGATE_UI_PORT:-2353}"
# What the bitcoin and electrs apps' exports.sh provide on Umbrel.
export APP_BITCOIN_NETWORK=signet APP_BITCOIN_NODE_IP=lawallet-signet_signet-bitcoind_1 APP_BITCOIN_RPC_PORT=38332 \
  APP_BITCOIN_RPC_USER=signet APP_BITCOIN_RPC_PASS="${APP_PASSWORD:-signet-local-password}" APP_BITCOIN_ZMQ_SEQUENCE_PORT=28335 \
  APP_ELECTRS_NODE_IP=lawallet-signet_signet-fulcrum_1 APP_ELECTRS_NODE_PORT=50001
compose=(docker compose --project-name lawallet-frigate
  -f "${ROOT_DIR}/lawallet-frigate/docker-compose.yml"
  -f "${ROOT_DIR}/test/docker-compose.frigate.override.yml")

node "${ROOT_DIR}/test/frigate-dashboard.test.js"
mkdir -p "${APP_DATA_DIR}"
cp -Rn "${ROOT_DIR}/lawallet-frigate/data" "${APP_DATA_DIR}/" 2>/dev/null || true
"${compose[@]}" up -d --build

wait_for() { # description, command...
  local what="$1"; shift
  for _ in $(seq 1 60); do "$@" >/dev/null 2>&1 && { echo "ok: ${what}"; return 0; }; sleep 2; done
  echo "FAIL: ${what}" >&2; "${compose[@]}" logs --tail 60 >&2; exit 1
}
logs_have() { "${compose[@]}" logs "$1" 2>&1 | grep "$2" >/dev/null; } # not -q: early exit + pipefail = SIGPIPE failure
ui="http://127.0.0.1:${FRIGATE_UI_PORT}"

wait_for "dashboard on :${FRIGATE_UI_PORT}" sh -c "curl -fsS ${ui}/ | grep -q 'src=\"app.js\"'"
wait_for "dashboard assets" sh -c "curl -fsS ${ui}/app.js | grep -q parseLog && curl -fsS ${ui}/icon.svg | grep -q '<svg' && curl -fsSo /dev/null ${ui}/fonts/outfit.woff2"
wait_for "config.toml in the signet folder" test -s "${APP_DATA_DIR}/data/signet/config.toml"
wait_for "frigate started on signet" logs_have frigate-sp "Starting Frigate v.* on signet"
wait_for "frigate log readable" sh -c "curl -fsS -H 'Range: bytes=-4096' ${ui}/api/log | grep -q 'Starting Frigate'"
wait_for "frigate reached bitcoind RPC" logs_have frigate-sp "Waiting for sync\|ndex"
echo "smoke ok. Stop with: ${compose[*]} down"
