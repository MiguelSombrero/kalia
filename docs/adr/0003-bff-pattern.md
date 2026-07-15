# ADR-0003: Backend-for-frontend (BFF) pattern

- **Status:** accepted
- **Date:** 2026-07-15

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
