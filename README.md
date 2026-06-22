# LaWallet Umbrel Community App Store

This repository packages [LaWallet NWC](https://github.com/lawalletio/lawallet-nwc)
as an Umbrel community app.

## App

- App id: `lawallet-nwc`
- App entrypoint: `/admin/`
- Published image: `masize/lawallet-nwc:1.0.0`
- Internal port: `2288`
- Health check: `GET /api/health`
- Runtime data: PostgreSQL persisted in `${APP_DATA_DIR}/data/postgres`
- Umbrel dependencies: none. Alby Hub is not required.

## Local Smoke Test

Run the app with local Postgres, Bitcoin Core regtest, and LND regtest:

```bash
./scripts/smoke-local.sh
```

The script leaves the stack running when successful.

Default local endpoints:

- LaWallet admin: http://127.0.0.1:2289/admin
- LaWallet health: http://127.0.0.1:2289/api/health
- Bitcoin regtest RPC: `127.0.0.1:18443`, user `umbrel`, password `umbrel`
- LND regtest gRPC: `127.0.0.1:10009`
- LND regtest REST: `127.0.0.1:18080`

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
`LaWallet NWC`. The app installs directly from this store without requiring
Alby Hub or any other Umbrel app to be installed first.
