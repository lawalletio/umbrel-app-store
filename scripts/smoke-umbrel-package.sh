#!/usr/bin/env bash
# Boots the REAL lawallet-nwc/docker-compose.yml the way umbrelOS runs it and
# fails if the app does not come up healthy.
#
#   scripts/smoke-umbrel-package.sh [<previous-compose>]
#
# With <previous-compose>, the previous package boots first on the same data
# directory and the new one is started over it, so the update path (migrations
# on existing data) is what gets tested, as on a user's node.
#
# Reproduces the umbrelOS conditions the regtest stack does not:
#   - every app shares one external network (umbrel_main_network);
#   - umbreld names containers <app>_<service>_1;
#   - other apps on that network have services with the same names. A decoy
#     `postgres` (no lawallet role, like BTCPay Server's) sits beside ours, so
#     a package that reaches its database by the shared alias fails here
#     instead of on users' nodes (2.10.0 incident).
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
new_compose="${repo_root}/lawallet-nwc/docker-compose.yml"
previous_compose="${1:-}"

project="lawallet-nwc"
network="umbrel_main_network"
decoy="umbrel-smoke-decoy_postgres_1"
work_dir="$(mktemp -d)"
probes="${SMOKE_PROBES:-30}"

export APP_SEED="${APP_SEED:-$(openssl rand -hex 32)}"
export APP_PASSWORD="${APP_PASSWORD:-$(openssl rand -hex 16)}"
export APP_DATA_DIR="${work_dir}/app-data"
mkdir -p "${APP_DATA_DIR}"

# What umbreld adds on top of the store compose. app_proxy has no image in
# the store file (umbrelOS supplies it), so it is parked behind a profile.
cat > "${work_dir}/umbrel.override.yml" <<YAML
services:
  app_proxy:
    image: alpine:3
    profiles: ["umbrel-only"]
  web:
    container_name: ${project}_web_1
  listener:
    container_name: ${project}_listener_1
  postgres:
    container_name: ${project}_postgres_1
networks:
  default:
    name: ${network}
    external: true
YAML

compose() {
  docker compose --project-name "${project}" \
    --file "$1" --file "${work_dir}/umbrel.override.yml" "${@:2}"
}

dump_logs() {
  echo "::group::container logs"
  docker logs --tail 150 "${project}_web_1" 2>&1 || true
  docker logs --tail 80 "${project}_listener_1" 2>&1 || true
  docker logs --tail 40 "${project}_postgres_1" 2>&1 || true
  echo "::endgroup::"
}

cleanup() {
  compose "${new_compose}" down --volumes --timeout 5 >/dev/null 2>&1 || true
  docker rm -f "${decoy}" >/dev/null 2>&1 || true
  docker network rm "${network}" >/dev/null 2>&1 || true
  # Postgres writes the data dir as uid 70; clear it from a container.
  docker run --rm -v "${work_dir}:/w" alpine:3 rm -rf /w/app-data >/dev/null 2>&1 || true
  rm -rf "${work_dir}"
}
trap cleanup EXIT

fail() {
  echo "::error::$*" >&2
  dump_logs >&2
  exit 1
}

up() {
  local file="$1" label="$2"
  echo "Starting ${label} package"
  compose "${file}" up --detach --wait --wait-timeout 300 web listener postgres ||
    fail "${label} package did not become healthy"
}

docker network create "${network}" >/dev/null

if [[ -n "${previous_compose}" ]]; then
  up "${previous_compose}" previous
fi

docker run --detach --name "${decoy}" --network "${network}" \
  --network-alias postgres -e POSTGRES_HOST_AUTH_METHOD=trust \
  postgres:15-alpine >/dev/null

up "${new_compose}" new

# Every request must succeed: the shared-alias bug only bit on the
# connections DNS happened to send to the other app's database.
for i in $(seq 1 "${probes}"); do
  for path in /api/health /.well-known/lawallet.json; do
    docker exec "${project}_web_1" \
      sh -c "curl -fsS -o /dev/null http://\$(hostname -i):2288${path}" ||
      fail "web ${path} failed on probe ${i}/${probes}"
  done
done
docker exec "${project}_listener_1" curl -fsS http://localhost:4100/health >/dev/null ||
  fail "listener /health failed"

if docker logs "${project}_web_1" 2>&1 | grep -E 'loading instrumentation hook|role "[^"]+" does not exist'; then
  fail "web logged a startup or database-role error"
fi
if docker logs "${project}_listener_1" 2>&1 | grep -E 'role "[^"]+" does not exist'; then
  fail "listener logged a database-role error"
fi

version="$(docker exec "${project}_web_1" sh -c 'curl -fsS http://$(hostname -i):2288/api/version')"
echo "Umbrel package smoke passed (${probes} probes): ${version}"
