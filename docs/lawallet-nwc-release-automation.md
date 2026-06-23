# LaWallet NWC Release Automation

This document explains how LaWallet NWC releases update the Umbrel community
app package automatically across two repositories:

- `lawalletio/lawallet-nwc`: builds and publishes the Docker image.
- `lawalletio/umbrel-app-store`: updates the Umbrel package files and merges
  the package bump.

## Workflow Overview

1. A new GitHub Release is published in `lawalletio/lawallet-nwc`.
2. `lawalletio/lawallet-nwc/.github/workflows/docker-publish.yml` builds and
   pushes the Docker image:

   ```text
   masize/lawallet-nwc:<version>
   masize/lawallet-nwc:latest
   ```

3. After Docker Hub publish succeeds, the same workflow sends a
   `repository_dispatch` event to `lawalletio/umbrel-app-store`.
4. `lawalletio/umbrel-app-store/.github/workflows/update-lawallet-nwc.yml`
   receives the dispatch and updates:

   ```text
   README.md
   lawallet-nwc/umbrel-app.yml
   lawallet-nwc/docker-compose.yml
   test/docker-compose.regtest.yml
   ```

5. The app-store workflow opens or updates a package bump PR.
6. The app-store workflow squash-merges that PR into `master`.
7. The app-store workflow deletes the automation branch.

The app-store workflow also supports manual runs with `workflow_dispatch`.

## Required Repository Secrets

### `lawalletio/lawallet-nwc`

Configure these under:

```text
lawalletio/lawallet-nwc
Settings
Secrets and variables
Actions
Repository secrets
```

Required secrets:

```text
UMBREL_APP_STORE_DISPATCH_TOKEN=<GitHub fine-grained PAT>
DOCKERHUB_USERNAME=masize
DOCKERHUB_TOKEN=<Docker Hub access token with push access to masize/lawallet-nwc>
```

`UMBREL_APP_STORE_DISPATCH_TOKEN` lets the release repository notify
`lawalletio/umbrel-app-store` after the Docker image is available.

`DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are used by Docker Hub login before
building and pushing the multi-architecture image.

### `lawalletio/umbrel-app-store`

Configure this under:

```text
lawalletio/umbrel-app-store
Settings
Secrets and variables
Actions
Repository secrets
```

Required secret:

```text
UMBREL_APP_STORE_UPDATE_TOKEN=<same GitHub fine-grained PAT>
```

`UMBREL_APP_STORE_UPDATE_TOKEN` lets the app-store workflow push the automation
branch, open or update the package bump PR, squash-merge it, and delete the
automation branch.

Use the same GitHub token value for both:

```text
lawalletio/lawallet-nwc:
  UMBREL_APP_STORE_DISPATCH_TOKEN

lawalletio/umbrel-app-store:
  UMBREL_APP_STORE_UPDATE_TOKEN
```

## Creating The GitHub Token

Create one fine-grained personal access token:

```text
GitHub
Your avatar
Settings
Developer settings
Personal access tokens
Fine-grained tokens
Generate new token
```

Use these settings:

```text
Token name: LaWallet Umbrel automation
Resource owner: lawalletio
Repository access: Only select repositories
Selected repository: lawalletio/umbrel-app-store
```

Repository permissions:

```text
Contents: Read and write
Pull requests: Read and write
Metadata: Read-only
```

`Metadata: Read-only` is added automatically by GitHub.

Do not choose `Public repositories` when creating the token. That option is
read-only and hides repository write permissions such as `Contents` and
`Pull requests`.

The `Pull requests` permission is under repository permissions, not
organization permissions. If only the `Organizations` permission box is visible,
switch `Repository access` to `Only select repositories` and select
`lawalletio/umbrel-app-store`.

After generating the token, copy the full value:

```text
github_pat_...
```

Use that full value as the value for both GitHub secrets listed above.

## Setting Secrets With The GitHub CLI

Set the dispatch secret in `lawalletio/lawallet-nwc`:

```bash
gh secret set UMBREL_APP_STORE_DISPATCH_TOKEN \
  --repo lawalletio/lawallet-nwc \
  --body 'github_pat_...'
```

Set the update secret in `lawalletio/umbrel-app-store`:

```bash
gh secret set UMBREL_APP_STORE_UPDATE_TOKEN \
  --repo lawalletio/umbrel-app-store \
  --body 'github_pat_...'
```

Set or rotate Docker Hub secrets in `lawalletio/lawallet-nwc`:

```bash
gh secret set DOCKERHUB_USERNAME \
  --repo lawalletio/lawallet-nwc \
  --body 'masize'

gh secret set DOCKERHUB_TOKEN \
  --repo lawalletio/lawallet-nwc \
  --body '<docker-hub-access-token>'
```

## Why A PAT Is Required

The app-store repository may have repository-level GitHub Actions
`Read and write permissions` disabled by organization policy.

The app-store workflow therefore does not depend on the built-in
`GITHUB_TOKEN` for write access. It checks out the repository with persisted
credentials disabled and uses `UMBREL_APP_STORE_UPDATE_TOKEN` when it needs to
push and merge.

## Manual Test Paths

### Test The App-Store Updater Directly

In `lawalletio/umbrel-app-store`, open:

```text
Actions
Update LaWallet NWC
Run workflow
```

Use:

```text
version: 1.2.3
image: masize/lawallet-nwc:1.2.3
```

Expected result:

1. Workflow updates the package files.
2. Workflow opens a PR named `Update LaWallet NWC to 1.2.3`.
3. Workflow squash-merges the PR into `master`.
4. Workflow deletes the automation branch.

Use a real published Docker tag for a meaningful end-to-end test.

### Test From The Release Repository

In `lawalletio/lawallet-nwc`, open:

```text
Actions
Docker Publish
Run workflow
```

Provide a tag that exists or that you intentionally want to publish:

```text
tag: 1.2.3
```

Expected result:

1. Docker image is built and pushed to Docker Hub.
2. Workflow dispatches `lawallet-nwc-release` to `lawalletio/umbrel-app-store`.
3. The app-store updater runs.
4. The app-store package update is merged into `master`.

## Publishing A Normal Release

The normal release path is:

1. Publish a GitHub Release in `lawalletio/lawallet-nwc`, usually with a tag
   such as `v1.2.3`.
2. The Docker workflow normalizes the version by removing the leading `v`.
3. Docker Hub receives:

   ```text
   masize/lawallet-nwc:1.2.3
   masize/lawallet-nwc:latest
   ```

4. The app-store package is updated to:

   ```text
   version: "1.2.3"
   image: masize/lawallet-nwc:1.2.3
   ```

## Branches And Pull Requests

The app-store updater creates branches named:

```text
automation/lawallet-nwc-<version>
```

For example:

```text
automation/lawallet-nwc-1.2.3
```

The PR title is:

```text
Update LaWallet NWC to <version>
```

The workflow uses a squash merge into `master` and deletes the automation
branch afterward.

## Troubleshooting

### `Missing UMBREL_APP_STORE_DISPATCH_TOKEN`

Add the secret to `lawalletio/lawallet-nwc`.

The value should be the fine-grained GitHub PAT with access to
`lawalletio/umbrel-app-store`.

### `Missing UMBREL_APP_STORE_UPDATE_TOKEN`

Add the secret to `lawalletio/umbrel-app-store`.

Use the same PAT value as `UMBREL_APP_STORE_DISPATCH_TOKEN`.

### `Resource not accessible by integration`

This usually means the workflow is using the built-in `GITHUB_TOKEN` without
write permissions, or the PAT does not have enough repository permissions.

Confirm the PAT has:

```text
Contents: Read and write
Pull requests: Read and write
```

Confirm the token is scoped to:

```text
lawalletio/umbrel-app-store
```

### Package PR Is Created But Not Merged

The token can open the PR but cannot merge it, or branch protection blocks the
merge.

Check:

- The PAT has `Pull requests: Read and write`.
- The app-store branch protection allows this automation to merge.
- Required checks, if any, pass before the workflow tries to merge.

The workflow uses direct `gh pr merge --squash`, not GitHub's separate
auto-merge queue.

### Docker Publish Succeeds But App-Store Workflow Does Not Start

Check the `Request Umbrel app package update` job in
`lawalletio/lawallet-nwc`.

Common causes:

- `UMBREL_APP_STORE_DISPATCH_TOKEN` is missing.
- The PAT is expired.
- The PAT is not authorized for the `lawalletio` organization.
- The PAT does not have access to `lawalletio/umbrel-app-store`.

### Docker Publish Fails Before Dispatch

The dispatch only happens after Docker Hub publish succeeds.

Check:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- Docker Hub repository access for `masize/lawallet-nwc`
- Build errors in `apps/web/Dockerfile`

## Files Owned By This Automation

In `lawalletio/lawallet-nwc`:

```text
.github/workflows/docker-publish.yml
```

In `lawalletio/umbrel-app-store`:

```text
.github/workflows/update-lawallet-nwc.yml
README.md
lawallet-nwc/umbrel-app.yml
lawallet-nwc/docker-compose.yml
test/docker-compose.regtest.yml
```
