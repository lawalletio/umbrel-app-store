# Frigate (sparrowwallet/frigate): BIP352 silent payments Electrum server.
# Upstream ships no Docker image, so this wraps the signed release .deb (amd64 and arm64).
FROM debian:trixie-slim

ARG FRIGATE_VERSION=1.6.1
ARG TARGETARCH
# From the release's signed frigate-<version>-manifest.txt
ARG FRIGATE_SHA256_amd64=6607d2ed4d4cf94a0c328eb603ae2fc6c7b42a3cd744cc88f8498f3c08adbba2
ARG FRIGATE_SHA256_arm64=d187529167c7b0f1da1399230b46a8798850df6b6c7c0c2b4443177e5f613c53

RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) sha="${FRIGATE_SHA256_amd64}" ;; \
      arm64) sha="${FRIGATE_SHA256_arm64}" ;; \
      *) echo "unsupported arch ${TARGETARCH}"; exit 1 ;; \
    esac; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    curl -fsSLo /tmp/frigate.deb "https://github.com/sparrowwallet/frigate/releases/download/${FRIGATE_VERSION}/frigate_${FRIGATE_VERSION}_${TARGETARCH}.deb"; \
    echo "${sha}  /tmp/frigate.deb" | sha256sum -c -; \
    apt-get install -y --no-install-recommends /tmp/frigate.deb; \
    rm -rf /tmp/frigate.deb /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/frigate-entrypoint
ENTRYPOINT ["/usr/local/bin/frigate-entrypoint"]
