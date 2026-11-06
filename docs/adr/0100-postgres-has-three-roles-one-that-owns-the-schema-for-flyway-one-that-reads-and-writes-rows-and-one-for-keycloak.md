# ADR-0100: Postgres has three roles — one that owns the schema for Flyway, one that reads and writes rows, one for Keycloak — and the superuser belongs to Postgres alone

- **Status:** accepted
- **Date:** 2026-11-02
- **Amended:** 2026-11-06 by [ADR-0102](0102-a-suggestion-is-a-pending-beer-with-its-new-brewery-and-an-admin-reviews-it-inside-catalog-which-publishes-one-event-per-decision.md) — `make moderate` was retired
  (iteration 10.5 task 08), so `make app-config` is the one operator command left
  that connects as the superuser

## Context

The backend and Keycloak both connected to Postgres as `kalia`, the superuser
the image creates from `POSTGRES_USER`. Compromising either service, or any
injection in the backend, therefore owned both databases, could `DROP` the
schema and could read Keycloak's credentials and sessions from the backend's
connection. [ADR-0089](0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)
made every secret required, but one password still opened everything.

[Iteration 10](../tasks/iteration-10.md) puts the stack on a network a phone
reaches, which is the first time that mattered. Flyway runs as the backend at
start-up (`backend/README.md`), so the role the application's queries use
cannot simply lose its rights to change the schema: something has to keep them.

## Decision

Postgres has three roles, created once by the init script in `postgres/init/`,
and the bootstrap superuser is used by nothing but Postgres's own start-up,
its health check and an operator's `make app-config`.

- **`kalia_owner`** owns the `kalia` database and everything Flyway creates in
  it. The backend uses it for migrations alone, through Spring's separate
  Flyway credentials.
- **`kalia_app`** is what the backend's queries use. It reads and writes rows
  and uses sequences; it cannot `DROP`, `ALTER`, `TRUNCATE` or create a
  table, so the application never starts without being unable to change its
  own schema.
- **`keycloak`** owns the `keycloak` database. No other role may connect to
  that database, and `keycloak` may not connect to `kalia`.

Each password is its own secret that `docker-compose.base.yml` requires, with
a dev value in `docker-compose.dev.env` ([ADR-0089](0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)).
The backend asks for them as `DATABASE_PASSWORD` and `DATABASE_OWNER_PASSWORD`
([ADR-0015](0015-configuration-strategy.md)). What `kalia_app` may do with the
owner's tables is granted by default privileges, so a table a later migration
creates is usable without a grant in that migration.

The deployable definition also stops carrying what only development needs:
it runs no Mailpit, whose API has no authentication, so Keycloak's SMTP
settings are required like any secret; and it publishes neither Postgres nor
Valkey, which the dev overlay still binds to loopback for a developer's host.

The roles exist only on an empty data directory, because Postgres runs the
init script then and never again. An existing volume is recreated once with
`docker compose down -v`; no migration of volumes is built, as none outlives a
developer's machine ([ADR-0036](0036-pre-deployment-migration-edits.md)).

## Alternatives considered

**One role per service, the backend's owning the schema.** Keycloak is
separated from the backend, and nothing else changes. Rejected: the backend is
the service exposed to the most input, and a role that can `DROP` the schema
is the thing an injection should not have.

**Accept the shared superuser.** No change, no new secrets. Rejected: it is
the exposure this decision exists to close, and the cost of closing it is one
init script and three variables.

**Grant the runtime role its rights inside each migration.** Needs no default
privileges. Rejected: a migration that forgets a `GRANT` passes every test run
as the owner and fails only in a deployment, where the role differs.

## Consequences

- Good, because a compromised backend can change rows but not the schema, and
  cannot reach Keycloak's database at all.
- Good, because the integration test connects as the real roles, created by
  the real script, so a table the runtime role cannot use fails a build.
- Bad, because the backend now holds two credentials and a stack needs three
  database passwords where it needed one.
- Bad, because Spring Modulith's own start-up `CREATE TABLE IF NOT EXISTS` for
  the event registry needs a right the runtime role lacks, so it is switched
  off (`spring.modulith.events.jdbc.schema-initialization.enabled=false`) and
  Flyway's `V002` is the only definition of that table.
- Bad, because a developer's existing Postgres volume does not have the roles
  and must be recreated, losing its data.
- Neutral, because an operator's `make app-config` still runs as the superuser:
  it is manual and not reachable from the network.
- **Revisit trigger:** the first deployment, which may want the superuser's
  password destroyed after bootstrap or a managed database whose roles are not
  created by an init script.

## Evidence

Checked against `postgres:18.4`. `backend/src/test/java/fi/kalia/DatabaseRolesIT.java`
starts a container with the real init script, boots the application with
`kalia_app` for queries and `kalia_owner` for Flyway, and shows that `DROP
TABLE`, `ALTER TABLE`, `TRUNCATE`, `CREATE TABLE` and `DROP SCHEMA` are refused
for the runtime role, that every module table is owned by `kalia_owner`, and
that `keycloak` is refused a connection to `kalia` while `kalia_app` and
`kalia_owner` are refused one to `keycloak`.

With the runtime role alone and Modulith's schema initializer on, the
context failed to start with `permission denied for schema public` from
`CREATE TABLE IF NOT EXISTS event_publication`, a statement that was a no-op
for as long as the role was a superuser.
