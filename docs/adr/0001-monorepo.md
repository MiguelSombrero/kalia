# ADR-0001: Monorepo for frontend and backend

- **Status:** accepted
- **Date:** 2026-07-15

## Context

Kalia consists of a Next.js frontend and a Spring Boot backend, developed by a
single developer, iteratively, with features landing as vertical slices that
touch both applications.

## Decision

Keep both applications in this single repository: `backend/`, `frontend/`,
shared `docs/`, and a root `docker-compose.yml` for local infrastructure.

## Consequences

- Cross-stack features are one atomic PR; docs and code stay in sync.
- One CI pipeline covers both apps (path filters can skip unaffected builds).
- If deployments or teams ever diverge significantly, the apps can be split
  into separate repos; nothing in the code couples them beyond the REST API.
