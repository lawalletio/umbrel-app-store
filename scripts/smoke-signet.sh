#!/usr/bin/env bash
# Starts lawallet-signet locally and checks every service is up and wired:
# dashboard answers, bitcoind runs signet, Fulcrum and Frigate authenticate to RPC.
# Full Electrum checks need a synced chain; run those on the Umbrel (see PR notes).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export APP_DATA_DIR="${APP_DATA_DIR:-${ROOT_DIR}/.umbrel-local/lawallet-signet}"
export APP_PASSWORD="${APP_PASSWORD:-signet-local-password}"
export NETWORK_IP="${NETWORK_IP:-10.99.0.0}"
export DEVICE_DOMAIN_NAME="${DEVICE_DOMAIN_NAME:-localhost}"
export SIGNET_UI_PORT="${SIGNET_UI_PORT:-2352}"
compose=(docker compose --project-name lawallet-signet
  -f "${ROOT_DIR}/lawallet-signet/docker-compose.yml"
  -f "${ROOT_DIR}/test/docker-compose.signet.override.yml")

mkdir -p "${APP_DATA_DIR}"
cp -Rn "${ROOT_DIR}/lawallet-signet/data" "${APP_DATA_DIR}/" 2>/dev/null || true
# Only data/ is copied (umbreld does that on install; updates copy no app-folder files besides
# compose, templates, exports.sh, torrc, hooks and the manifest). signet-web is built from source.
"${compose[@]}" up -d --build

wait_for() { # description, command...
  local what="$1"; shift
  for _ in $(seq 1 90); do "$@" >/dev/null 2>&1 && { echo "ok: ${what}"; return 0; }; sleep 2; done
  echo "FAIL: ${what}" >&2; "${compose[@]}" logs --tail 60 >&2; exit 1
}
logs_have() { "${compose[@]}" logs "$1" 2>&1 | grep "$2" >/dev/null; } # not -q: early exit + pipefail = SIGPIPE failure
stale_page_refreshed() { # a browser cached the page before the proxy existed and revalidates with its ETag
  local etag
  etag=$("${compose[@]}" exec -T signet-web wget -S -O /dev/null http://lawallet-signet_signet-bitcoind_1:3000/ 2>&1 |
    sed -n 's/^ *[Ee][Tt]ag: //p' | tr -d '\r')
  [ -n "${etag}" ] && curl -fsS -H "If-None-Match: ${etag}" "http://127.0.0.1:${SIGNET_UI_PORT}/" | grep -q /__frigate/tab.js
}
is_signet() {
  "${compose[@]}" exec -T signet-bitcoind bitcoin-cli -signet -rpcport=38332 -rpcuser=signet \
    -rpcpassword="${APP_PASSWORD}" getblockchaininfo | grep -q '"chain": "signet"'
}

wait_for "dashboard on :${SIGNET_UI_PORT}" curl -fsS "http://127.0.0.1:${SIGNET_UI_PORT}/"
wait_for "frigate tab injected" sh -c "curl -fsS http://127.0.0.1:${SIGNET_UI_PORT}/ | grep -q /__frigate/tab.js"
wait_for "stale cached page gets the tab" stale_page_refreshed
wait_for "fulcrum stats proxied" sh -c "curl -fsS http://127.0.0.1:${SIGNET_UI_PORT}/__frigate/fulcrum | grep -q Controller"
wait_for "frigate log readable" curl -fsS -H "Range: bytes=-512" "http://127.0.0.1:${SIGNET_UI_PORT}/__frigate/log"
wait_for "bitcoind chain=signet" is_signet
wait_for "fulcrum reached bitcoind RPC" logs_have signet-fulcrum "bitcoind is still downloading headers\|Block height\|Processed height"
wait_for "frigate reached bitcoind RPC" logs_have signet-frigate "Waiting for sync\|ndex"
echo "smoke ok. Stop with: ${compose[*]} down"
