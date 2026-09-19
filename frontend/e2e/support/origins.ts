// The two origins the suite drives, published by docker-compose.yml on
// localhost only. Keycloak's is its *public* address on purpose: ADR-0025
// splits it from the compose-internal one, and a spec asserting on a link
// Keycloak generated is asserting that split held.
export const FRONTEND_ORIGIN = "http://localhost:3000";
export const KEYCLOAK_ORIGIN = "http://localhost:8081";
