# LaWallet Umbrel Community App Store

This repository packages community apps for Umbrel.

## LaWallet NWC

- App id: `lawallet-nwc`
- App entrypoint: `/admin/`
- Published image: `masize/lawallet-nwc:2.10.1`
- Internal port: `2288`
- Health check: `GET /api/health`
- Runtime data: PostgreSQL persisted in `${APP_DATA_DIR}/data/postgres`
- Umbrel dependencies: none. Alby Hub is not required.

## LNCurl

- App id: `lawallet-lncurl`
- Published image: `ghcr.io/agustinkassis/lncurl:1.0.1`
- Internal port: `3000`
- Runtime data: SQLite persisted in `${APP_DATA_DIR}/data`
- Umbrel dependencies: Alby Hub (`albyhub`)

## Signet Node + SP

- App id: `lawallet-signet`
- Services: Bitcoin Core signet with the Umbrel Bitcoin Node dashboard, Fulcrum, and
  [Frigate](https://github.com/sparrowwallet/frigate) for BIP352 silent payments
- Images: `ghcr.io/getumbrel/umbrel-bitcoin`, `cculianu/fulcrum`, `masize/frigate`
  (built from `images/frigate/`)
- Ports: dashboard `2352`, Electrum + silent payments TCP `60001`. RPC, ZMQ and
  Fulcrum stay internal.
- Isolation: no `exports.sh`, no `implements: electrs`, `signet-` prefixed services
  addressed by container name on Umbrel's shared network, and bitcoind pinned with
  `-chain=signet`
- Umbrel dependencies: none
- Local smoke test: `./scripts/smoke-signet.sh` (checks wiring only; Electrum answers
  once the chain has synced)

## Local Smoke Test

Run the app with local Postgres, Bitcoin Core regtest, and LND regtest:

```bash
./scripts/smoke-local.sh
```

The script leaves the stack running when successful.

## Package Smoke Test (runs before every release is published)

`scripts/smoke-umbrel-package.sh` boots the real `lawallet-nwc/docker-compose.yml`
the way umbrelOS runs it: on a shared `umbrel_main_network`, with umbreld's
`lawallet-nwc_<service>_1` container names, and next to a decoy `postgres` from
"another app" (as BTCPay Server has). Pass the previous compose to test the
upgrade path on existing data:

```bash
git show origin/master:lawallet-nwc/docker-compose.yml > /tmp/previous.yml
./scripts/smoke-umbrel-package.sh /tmp/previous.yml
```

`update-lawallet-nwc.yml` runs it before merging a release (so a failing
release never reaches Umbrel nodes), and `smoke-lawallet-nwc.yml` runs it on
pull requests that touch the package. It cleans up after itself.

Default local endpoints:

- LaWallet admin: http://127.0.0.1:2289/admin
- LaWallet health: http://127.0.0.1:2289/api/health

Local state is written to `.umbrel-local/lawallet-nwc/` and ignored by git.

To stop the local stack:

```bash
docker compose --project-name lawallet-nwc-local --file test/docker-compose.regtest.yml down
```

To reset the local stack:

```bash
docker compose --project-name lawallet-nwc-local --file test/docker-compose.regtest.yml down
rm -rf .umbrel-local/lawallet-nwc
./scripts/smoke-local.sh
```

## Using The Community App Store

Add this repository URL as a community app store in the umbrelOS UI, then install
`LaWallet NWC` or `LNCurl`. LaWallet NWC has no app dependencies; LNCurl asks
Umbrel to install Alby Hub first.

## Release Automation

LaWallet NWC releases can update this Umbrel package automatically through the
multi-repository GitHub Actions flow documented in
[docs/lawallet-nwc-release-automation.md](docs/lawallet-nwc-release-automation.md).
