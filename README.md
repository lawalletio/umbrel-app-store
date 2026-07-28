# LaWallet Umbrel Community App Store

This repository packages [LaWallet NWC](https://github.com/lawalletio/lawallet-nwc)
as an Umbrel community app.

## App

- App id: `lawallet-nwc`
- App entrypoint: `/admin/`
- Published image: `masize/lawallet-nwc:2.0.0`
- Listener image: `masize/lawallet-nwc-listener:2.0.0`
- Internal port: `2288`
- Health check: `GET /api/health`
- Runtime data: PostgreSQL persisted in `${APP_DATA_DIR}/data/postgres`
- Umbrel dependencies: none. Alby Hub is not required.

Umbrel derives stable, domain-separated user-key vault, NWC vault, webhook, and
listener-request secrets from its persistent per-app seed. Web and listener
receive the matching values automatically, and the listener runs the deferred
settlement recovery pass every ten minutes. The NWC vault encrypts all
RemoteWallet NWC connection strings; the web startup migration automatically
encrypts legacy plaintext rows before becoming ready. When the deferred proxy
is used, its NIP-57 receipt signer is an `nsec` entered through LaWallet Admin
Settings; it is never stored directly in the Umbrel environment.

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
`LaWallet NWC`. The app installs directly from this store without requiring
Alby Hub or any other Umbrel app to be installed first.

## Release Automation

LaWallet NWC releases can update this Umbrel package automatically through the
multi-repository GitHub Actions flow documented in
[docs/lawallet-nwc-release-automation.md](docs/lawallet-nwc-release-automation.md).
