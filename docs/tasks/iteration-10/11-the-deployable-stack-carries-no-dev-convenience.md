# Task 11: The deployable stack carries no dev convenience and no shared superuser

- **Status:** refined
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

**Decided at refinement, 2026-11-01** (product owner):

- **Three database roles.** A schema-owner role used only by Flyway, through
  Spring's separate Flyway credentials; a runtime role for the backend that
  reads and writes rows but cannot `DROP` or `ALTER`; and a Keycloak role that
  owns only the `keycloak` database. The superuser `kalia` is left to Postgres's
  own bootstrap. Each role's password is a secret the base file requires, with
  a dev value in `docker-compose.dev.env`
  ([ADR-0089](../../adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)).
- **The roles are created by the Postgres init script,** which runs only on an
  empty volume. An existing volume is recreated once (`docker compose down
  -v`) — `README.md` says so; no migration of existing volumes is built.
- **No host script needs Postgres or Valkey on host loopback:** `make moderate`
  and `make app-config` use `docker compose exec`. The dev overlay keeps
  publishing them on loopback, with Mailpit, whose API the e2e suite reads.
- Whether the role split earns an ADR is weighed at implementation
  ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)); the rejected
  alternatives were one role per service and accepting the shared superuser.

## Open questions

**None.**

## Acceptance criteria

- [ ] `docker compose -f docker-compose.base.yml config` without SMTP values
      fails, and `scripts/check-compose.mjs`'s test covers it
- [ ] The base file runs no Mailpit and publishes no Postgres or Valkey port;
      the local stack still does, through the dev overlay
- [ ] An integration test shows the backend's runtime role cannot `DROP` a
      table, and Flyway's migrations still run at start-up as the owner role
- [ ] Keycloak connects as its own role and cannot reach the `kalia` database
- [ ] `docker compose -f docker-compose.base.yml config` without a role's
      password fails, and `README.md` says to recreate an existing volume
- [ ] `make verify` is green
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-70 and SHOULD-77;
SHOULD-77 is `[needs decision]`, open question 1.
