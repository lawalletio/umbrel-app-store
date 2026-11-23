# Frigate (sparrowwallet/frigate): BIP352 silent payments Electrum server.
# Upstream ships no Docker image, so this wraps the signed release .deb.
FROM debian:trixie-slim

ARG FRIGATE_VERSION=1.6.1
ARG FRIGATE_SHA256=6607d2ed4d4cf94a0c328eb603ae2fc6c7b42a3cd744cc88f8498f3c08adbba2

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    curl -fsSLo /tmp/frigate.deb "https://github.com/sparrowwallet/frigate/releases/download/${FRIGATE_VERSION}/frigate_${FRIGATE_VERSION}_amd64.deb"; \
    echo "${FRIGATE_SHA256}  /tmp/frigate.deb" | sha256sum -c -; \
    apt-get install -y --no-install-recommends /tmp/frigate.deb; \
    rm -rf /tmp/frigate.deb /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/frigate-entrypoint
ENTRYPOINT ["/usr/local/bin/frigate-entrypoint"]
