# LaWallet Umbrel Community App Store

This repository packages community apps for Umbrel.

## LaWallet NWC

- App id: `lawallet-nwc`
- App entrypoint: `/admin/`
- Published image: `masize/lawallet-nwc:2.2.2`
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

## Local Smoke Test

Run the app with local Postgres, Bitcoin Core regtest, and LND regtest:

```bash
./scripts/smoke-local.sh
```

The script leaves the stack running when successful.

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
