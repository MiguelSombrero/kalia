FROM quay.io/keycloak/keycloak:26.8.2-3

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true

# Counters at /metrics on the management port, which no host port reaches. A
# build-time option: the deployable image is built without it, and only the
# local stack's docker-compose.override.yml turns it on, for the observability
# profile to scrape (ADR-0114).
ARG KC_METRICS_ENABLED=false
ENV KC_METRICS_ENABLED=${KC_METRICS_ENABLED}

RUN /opt/keycloak/bin/kc.sh build

# The Kalia login theme (ADR-0056). A folder theme is read at runtime, so it
# needs no rebuild — it is copied after the build step for that reason.
COPY themes/kalia /opt/keycloak/themes/kalia
