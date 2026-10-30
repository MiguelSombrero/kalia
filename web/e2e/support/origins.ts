// Keycloak's is its *public* address on purpose: ADR-0025 splits it from the
// compose-internal one, and a spec asserting on a link Keycloak generated is
// asserting that split held.
import { STACK } from "../../stackOrigins";

export const WEB_ORIGIN = STACK.web;
export const KEYCLOAK_ORIGIN = STACK.keycloak;
export const BACKEND_ORIGIN = STACK.backend;
