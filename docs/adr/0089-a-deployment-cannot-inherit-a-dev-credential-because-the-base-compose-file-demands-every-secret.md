# ADR-0089: A deployment cannot inherit a dev credential, because the base compose file demands every secret and the dev stack adds its own

- **Status:** accepted
- **Date:** 2026-10-26

## Context

`docker-compose.yml` was both the local stack and the only definition of the
deployed one. It defaulted the Postgres password, the feed cursor key, the
Auth.js secret and the Keycloak admin login to dev values, ran a service that
resets `testuser` to a known password on every `up`, and imported a public
`kalia-swagger` Keycloak client that mints `kalia-backend` tokens outside the
BFF's session lifecycle. A deployment that forgot a variable did not fail; it
ran with the dev value, and `verifyRequiredConfiguration` accepted it because
it checks presence only. Valkey held every session in plaintext without
authentication, and a session's key *is* its cookie value.

[Iteration 10](../tasks/iteration-10.md) is the first time anything beyond
localhost reaches the stack, so what had been safe only because the stack was
loopback-bound needed a definition that is safe without it.

## Decision

`docker-compose.base.yml` is the deployable definition: it requires every
secret with `${NAME:?…}`, carries no dev default, and defines no seed service
and no Swagger client, while the local stack is `docker-compose.yml` — which
includes the base with the dev values in `docker-compose.dev.env` — merged
with `docker-compose.override.yml` for what only development has.

- **Deploy with `docker compose -f docker-compose.base.yml`.** It names the
  base alone, so a variable left unset stops Compose and names it.
  `scripts/check-compose.mjs` proves that for each required variable and runs
  in `make verify` and CI's static-checks job.
- **A bare `docker compose` is the local stack**, so `docker compose up`
  needs only the root `.env` it always needed (`KALIA_FRONTEND_CLIENT_SECRET`,
  which keeps no dev default).
- **The dev values reach the base through `include`'s `env_file`, not through
  `${VAR:-default}` in the override.** Compose interpolates each file on its
  own before merging, so a `:?` in the base fails whatever an override sets.
  The root `.env` and the shell still win over the env file, so a worktree's
  own ports apply as before.
- **The override carries the dev-only service and settings:** `keycloak-seed`,
  the debug log level and Swagger UI, the `KALIA_DEV_STACK` marker the
  frontend needs to accept the dev `AUTH_SECRET`, and the Swagger client as a
  second realm file (`keycloak/realm-swagger.json`). The realm file the base
  imports pins no public client.
- **Valkey requires a password**, `VALKEY_PASSWORD`, carried in the URL the
  frontend uses and in the e2e `valkey` fixture. TLS waits for a deployment;
  a per-client ACL user was more configuration than one client needs.
- **`verifyRequiredConfiguration` rejects the committed dev `AUTH_SECRET`**
  unless `KALIA_DEV_STACK` is `true`.
- **Every sign-in starts by ending any local session** (the wrapper in
  `frontend/lib/auth/endingLocalSession.ts`), so the second person to sign in
  on a browser always gets a session and token set of their own.

Out of scope: the nginx edge and TLS ([iteration 8.5 task 10](../tasks/iteration-8.5/10-unauthenticated-edges-throttled.md),
[backlog](../tasks/backlog.md)), the mail catcher and the SMTP defaults, which
hold no secret, and refresh-token rotation, which
[ADR-0029](0029-silent-token-refresh.md) now records as deferred to iteration 9.

## Alternatives considered

**Harden `docker-compose.yml` in place.** Make the dev values required there
too, and have developers supply them. Rejected by the product owner: the
common case, `docker compose up` on a fresh checkout, would need a page of
variables, and the seed service and Swagger client would still be one
forgotten flag from a deployment.

**A plain override file with `${VAR:-default}` for the dev values.** The
obvious reading of "base plus overlay", and what this started as. It cannot
work: the base's `:?` fires during that file's own interpolation, before the
override is merged (see Evidence).

**Dev defaults written into the root `.env` by a `make` target.** Works with
`:?` in the base and needs no `include`, but a developer with an existing `.env`
would find `docker compose up` broken until they re-ran it, and the dev
values would live in an untracked file per checkout.

**A separate dev compose file selected by `COMPOSE_FILE`.** Same
interpolation limit, and a deployment that omitted the variable would get the
base, which is the opposite default from the one wanted locally.

**Keep `kalia-swagger` in the one realm file, disabled by a variable.** The
client would still exist in a deployed realm, and every other value in the
file would need to tolerate the toggle.

**Valkey ACL users, one per client.** Per-client revocation, at the price of
user definitions and a second credential, for one client.

## Consequences

- Good, because a deployment cannot start on a dev credential by omission:
  every secret is required by name, and the one that is checked by value, the
  Auth.js secret, is refused.
- Good, because the session store no longer answers an unauthenticated client,
  so listing `auth:session:*` no longer yields live session cookies.
- Good, because a second person signing in never inherits the first person's
  tokens.
- Bad, because the local stack is now four files instead of one, and its
  `include` needs a Docker Compose that supports `env_file` there.
- Bad, because a bare `docker compose up` on a server still starts the dev
  stack; only `-f docker-compose.base.yml` is the deployable one, and the
  ADR is what tells an operator so.
- Bad, because `keycloak-seed`'s admin login is spelled in the override as
  well as in `docker-compose.dev.env`, which the override is not interpolated
  with; `scripts/check-compose.mjs` fails if they differ.
- Neutral, because the dev stack's `keycloak-config` imports with client
  deletion off, so a client created in the admin console is no longer removed
  by the next import there; the deployable stack keeps full reconciliation.
- Neutral, because `kalia-frontend`'s client secret keeps its
  `${KALIA_FRONTEND_CLIENT_SECRET:?…}` in both, as before.
- **Revisit trigger:** the first real deployment, which will want TLS, a
  secret store rather than environment variables, and possibly a verdict on
  whether `docker-compose.base.yml` should simply be named `docker-compose.yml`
  with the dev stack moved out.

## Evidence

Checked against Docker Compose v5.5.1.

A `${SECRET:?need SECRET}` in one file and `SECRET: ${SECRET:-devdefault}` in
a second, rendered with `docker compose -f a.yml -f b.yml config` and no
`SECRET` in the environment: `error while interpolating
services.s.environment.SECRET: required variable SECRET is missing a value`.

An `include` with `env_file: dev.env` and no `.env` rendered the dev value; with
a project `.env` setting the same name it rendered the `.env` value, and a
shell export beat both. A listed `.env` that does not exist is an error, and
`env_file` there accepts strings only, which is why `.env` is left off.

`keycloak-config-cli` 6.5.1-26.5.5 given `/cfg/a.json,/cfg/b.json` for one
realm logs `Importing file` once per file and applies them in turn. With a
second file listing only `kalia-swagger`, the realm ended with that client
alone: the import deleted `kalia-frontend` and `kalia-backend`.
`IMPORT_MANAGED_CLIENT=no-delete` kept all three.
