# Iteration 0 — Walking skeleton (scaffolding)

Goal: empty but *running* end-to-end stack with CI-able test suites.

1. [x] Monorepo layout: `backend/`, `frontend/`, `docs/`, root `docker-compose.yml` with PostgreSQL
2. [x] Spring Boot 4.1 skeleton: Maven, Spring Modulith, Flyway wired, health endpoint, `ApplicationModules.verify()` test, Testcontainers smoke test
3. [x] Next.js 16 skeleton: TypeScript, Tailwind, Vitest + RTL configured, one trivial passing test, placeholder home page
4. [x] GitHub Actions: build + test both apps on push
5. [x] Dockerfiles for backend and frontend; `docker compose up` starts the full stack (PostgreSQL + backend + frontend)

**Done when:** a single `docker compose up` brings up database, backend and frontend, and the app answers on localhost; all test suites run green locally and in CI.
