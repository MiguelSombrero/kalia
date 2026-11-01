# Task 11: The deployable stack carries no dev convenience and no shared superuser

- **Status:** needs-refinement
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

[ADR-0089](../../adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)
makes the deployable definition, `docker-compose.base.yml`, demand every
secret so a deployment cannot inherit a dev one. Two gaps remain:

- **Dev conveniences in the base.** `KEYCLOAK_SMTP_HOST` defaults to `mailpit`
  with auth and TLS off, and the base runs Mailpit with an unauthenticated
  API, so a deployment that forgets SMTP starts cleanly and parks every reset
  link where loopback can read it. Postgres and Valkey are also published on
  host loopback (SHOULD-70).
- **One superuser for everything.** The backend and Keycloak both connect to
  Postgres as the bootstrap superuser `kalia`, so compromising either service,
  or any future injection, owns both databases. No ADR records it
  (SHOULD-77).

This iteration is the first in which the stack serves something other than the
Mac it runs on ([task 01](01-decision-how-a-phone-reaches-the-mac.md)), and
the first time the stack is closer to a deployment than to a laptop.

## Scope

The base compose file starts no service and publishes no port that only
development needs, and requires the SMTP settings like every other secret. Who
each service connects to Postgres as is decided, and either implemented or
recorded as a trade-off.

## Non-goals

- A deployment itself: parked for cost.

## Constraints

- ADR-0089: a dev default goes in `docker-compose.dev.env` or the dev
  overlay, never as `:-` in the base; `scripts/check-compose.mjs` enforces it.
- Flyway migrations run as the backend at start-up (`backend/README.md`), so
  a DML-only role needs a separate migration identity.
- `make verify` and the CI Docker gate start the deployable definition with a
  test environment; whatever moves must keep them green.

## Open questions

1. **Database roles (SHOULD-77):** separate owner, DML-only and Keycloak
   roles; separate roles per service only; or accept the shared superuser as
   an [architecture §8](../../architecture.md#8-trade-offs-made-explicit)
   trade-off.
2. **If roles are separated:** created by an init script, by Flyway, or by a
   one-off `make` target — and how existing developer volumes are migrated.
3. **Loopback ports:** do any host scripts need Postgres or Valkey on host
   loopback, so that the dev overlay must keep publishing them?

## Acceptance criteria

- [ ] `docker compose -f docker-compose.base.yml config` without SMTP values
      fails, and `scripts/check-compose.mjs`'s test covers it
- [ ] The base file runs no Mailpit and publishes no Postgres or Valkey port;
      the local stack still does, through the dev overlay
- [ ] The database-role decision is implemented with an integration test
      showing the backend cannot `DROP` a table, or recorded in §8
- [ ] `make verify` is green
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-70 and SHOULD-77;
SHOULD-77 is `[needs decision]`, open question 1.
