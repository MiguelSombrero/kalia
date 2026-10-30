# ADR-0003: Backend-for-frontend (BFF) pattern

- **Status:** accepted
- **Date:** 2026-07-15
- **Amended:** 2026-10-24 — two details below are out of date. The `cartId`
  cookie went with the cart ([ADR-0004](0004-backend-cart.md)); what the
  server attaches is the session's Keycloak access token. And docker-compose
  publishes the backend too, on `127.0.0.1` only, so the API is not
  reachable beyond the developer's machine rather than unpublished. The
  decision itself stands
- **Amended:** 2026-10-26 by [ADR-0090](0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md) — the backend,
  Keycloak and the frontend are published only through an nginx edge proxy,
  still on `127.0.0.1`; the Spring API is reached through its limits, not
  directly
- **Amended:** 2026-10-30 by [ADR-0095](0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md) — the mobile app
  calls the Spring API directly through the edge with its own bearer token, so
  "no CORS surface" and "the Spring API is not exposed publicly" below hold for
  the browser only, not for the system. The decision stands for the web: the
  browser still talks only to Next.js, and "usable by other clients later" is
  now so

## Context

The browser needs data from the Spring Boot API. Options: call it directly
(bearer tokens in the browser, CORS config) or route everything through the
Next.js server.

## Decision

The browser talks only to Next.js. Server components and route handlers call
the Spring Boot REST API and attach whatever the request needs: the `cartId`
cookie now, Keycloak access tokens from the Redis-backed session later.

## Consequences

- No tokens or secrets in the browser; sessions and tokens live server-side.
- No CORS surface; the Spring API is not exposed publicly (docker-compose
  publishes only Next.js).
- Cost: an extra network hop and a thin proxy layer (`apiClient` wrapper +
  route handlers) to maintain.
- Backend stays a clean, UI-agnostic REST API — usable by other clients later.
