FROM quay.io/adorsys/keycloak-config-cli:6.6.0-26.8.1

USER 0

RUN apt-get update \
    && apt-get install -y --no-install-recommends --only-upgrade apt libapt-pkg7.0 \
    && rm -rf /var/lib/apt/lists/*

USER 65534
