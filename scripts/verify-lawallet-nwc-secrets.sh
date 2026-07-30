#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
package_compose="${repo_root}/lawallet-nwc/docker-compose.yml"
regtest_compose="${repo_root}/test/docker-compose.regtest.yml"

require_exact_count() {
  local file="$1"
  local expected="$2"
  local needle="$3"
  local actual

  actual="$(grep -Fxc "${needle}" "${file}" || true)"
  if [[ "${actual}" != "${expected}" ]]; then
    printf 'Expected %s exact occurrence(s) in %s, found %s: %s\n' \
      "${expected}" "${file}" "${actual}" "${needle}" >&2
    exit 1
  fi
}

# These strings are a persisted-data contract, not cosmetic labels. Changing
# any suffix rotates the corresponding key and makes existing ciphertext
# unreadable. Web/listener request auth is also deliberately domain-separated.
require_exact_count "${package_compose}" 2 \
  '      NWC_VAULT_SECRET: "${APP_SEED}-nwc-vault-v1"'
require_exact_count "${package_compose}" 1 \
  '      KEY_VAULT_SECRET: "${APP_SEED}-key-vault-v1"'
require_exact_count "${package_compose}" 2 \
  '      LISTENER_REQUEST_AUTH_SECRET: "${APP_SEED}-listener-request-v1"'

require_exact_count "${regtest_compose}" 2 \
  '      NWC_VAULT_SECRET: "${APP_SEED:-lawallet-local-jwt-secret-at-least-32-chars}-nwc-vault-v1"'
require_exact_count "${regtest_compose}" 1 \
  '      KEY_VAULT_SECRET: "${APP_SEED:-lawallet-local-jwt-secret-at-least-32-chars}-key-vault-v1"'
require_exact_count "${regtest_compose}" 2 \
  '      LISTENER_REQUEST_AUTH_SECRET: "${APP_SEED:-lawallet-local-jwt-secret-at-least-32-chars}-listener-request-v1"'

printf 'LaWallet NWC persistent secret derivations are stable.\n'
