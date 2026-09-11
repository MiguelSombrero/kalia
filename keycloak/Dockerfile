FROM quay.io/keycloak/keycloak:26.7.0

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true

RUN /opt/keycloak/bin/kc.sh build

# The Kalia login theme (ADR-0056). A folder theme is read at runtime, so it
# needs no rebuild — it is copied after the build step for that reason.
COPY themes/kalia /opt/keycloak/themes/kalia
