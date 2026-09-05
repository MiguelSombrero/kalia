FROM quay.io/keycloak/keycloak:26.7.0

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true

RUN /opt/keycloak/bin/kc.sh build
