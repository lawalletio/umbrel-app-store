#!/bin/sh
# Regenerates config.toml from env on every start so the RPC password always
# matches the node. Anything not set here keeps Frigate's own default.
set -eu

: "${FRIGATE_NETWORK:=signet}"
: "${FRIGATE_HOME:=/data}"
: "${BITCOIND_RPC_URL:?}"
: "${BITCOIND_RPC_AUTH:?}"          # user:password
: "${BITCOIND_ZMQ_SEQUENCE:?}"      # tcp://host:port
: "${BACKEND_ELECTRUM_SERVER:?}"    # tcp://fulcrum:port
: "${FRIGATE_TCP:=tcp://0.0.0.0:60001}"
: "${FRIGATE_CACHE_SIZE:=1M}"
: "${FRIGATE_DB_MEMORY_LIMIT:=512MB}"

# Where Frigate reads config.toml: the home itself on mainnet, a per-network folder otherwise
# (named after drongo's Network home: testnet is testnet3). frigate.log always lands in the home.
case "${FRIGATE_NETWORK}" in
  mainnet) dir="${FRIGATE_HOME}" ;;
  testnet) dir="${FRIGATE_HOME}/testnet3" ;;
  *) dir="${FRIGATE_HOME}/${FRIGATE_NETWORK}" ;;
esac
mkdir -p "$dir"
cat > "$dir/config.toml" <<EOF
[core]
connect = true
server = "${BITCOIND_RPC_URL}"
authType = "USERPASS"
auth = "${BITCOIND_RPC_AUTH}"
zmqSequenceEndpoint = "${BITCOIND_ZMQ_SEQUENCE}"

[index]
cacheSize = "${FRIGATE_CACHE_SIZE}"

[scan]
memoryLimit = "${FRIGATE_DB_MEMORY_LIMIT}"

[server]
tcp = "${FRIGATE_TCP}"
backendElectrumServer = "${BACKEND_ELECTRUM_SERVER}"
EOF

exec /opt/frigate/bin/frigate -d "${FRIGATE_HOME}" -n "${FRIGATE_NETWORK}" "$@"
