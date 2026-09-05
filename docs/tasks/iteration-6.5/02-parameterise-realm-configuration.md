# Task 02: One realm file for every environment

- **Status:** done
- **Iteration:** [6.5](../iteration-6.5.md)
- **PR:** #235
- **Covers:** DW-2

## Why

`keycloak/realm-export.json` cannot be imported anywhere but a dev machine, and
two of the values it pins are credentials. It hardcodes the `kalia-frontend`
client's `redirectUris`, `webOrigins` and `post.logout.redirect.uris` to
`http://localhost:3000`, `sslRequired` to `none`, the client secret to
`kalia-dev-secret` in plaintext, and `testuser`'s password to `testuser123`.

That was tolerable while the realm was a disposable fixture reimported on every
start. [Task 01](01-persist-keycloak-state.md) makes it durable, and the rest
of this iteration invites strangers into it — at which point a committed secret
and a known-password account stop being fixtures and become live credentials
waiting for the first deployment.

Already recorded in the [backlog](../backlog.md), where it is also named a
blocker for the deployment item and a prerequisite for the mobile client's
second realm client.

## Scope

One committed realm file that serves every environment, with per-environment
values supplied from outside it, and no credential in the repository. The local
stack keeps today's literals, moved to where environment-specific values
belong, so local development is unchanged.

A mis-set or unresolved value has to fail loudly. A realm that imports with the
literal `${KALIA_FRONTEND_URL}` as its redirect URI leaves a *healthy* Keycloak
that silently rejects every sign-in, and that is the failure this task is
mostly about preventing.

## Non-goals

- Making Keycloak's state durable — [task 01](01-persist-keycloak-state.md).
- Keeping the file true to the running realm over time —
  [task 03](03-prevent-realm-configuration-drift.md).
- Adding a realm client for the mobile app, or any deployment configuration.
  This makes those possible; it does not do them.
- Rotating or managing production secrets. Where a secret comes from in a
  deployment that does not exist yet is that deployment's question.

## Constraints

- **Placeholder substitution is not on by default, and is not reliable.**
  Keycloak's importer resolves `${VAR}` only when
  `keycloak.migration.replace-placeholders` is enabled, and its own issue
  tracker carries repeated reports of substitution failing or rejecting `$`
  outright (keycloak/keycloak#12069, #20199). The
  [backlog](../backlog.md)'s assumption that startup import "resolves `${VAR}`
  placeholders from environment variables" is therefore true only with that
  flag and needs proving on `26.7.0` before the approach is committed to — this
  is the task's first piece of work, not a detail.
- `KC_HOSTNAME` and `AUTH_KEYCLOAK_ISSUER` must keep matching exactly, and the
  issuer string must stay Keycloak's public address
  ([ADR-0025](../../adr/0025-authjs-valkey-adapter.md)).
- The frontend validates its own environment variables at startup
  ([ADR-0018](../../adr/0018-frontend-env-var-validation.md)); anything added
  on that side follows it rather than inventing a second mechanism.
- Configuration conventions follow
  [ADR-0015](../../adr/0015-configuration-strategy.md).
- Verification starts from an empty volume. `--import-realm` skips an existing
  realm, so a second run against the same database changes nothing and proves
  nothing.

## Open questions

**None.**

Resolved during refinement (2026-09-05):

1. **Placeholders, or a different mechanism?** Decided: **keycloak-config-cli**
   (new dependency — the `~v6.4`/`v6.5` line, exact patch confirmed against
   Keycloak `26.7.0` compatibility at implementation time). This is the same
   decision as [task 03](03-prevent-realm-configuration-drift.md)'s Q1/Q2, as
   both tasks suspected: one tool applies the committed file idempotently on
   every boot (task 03's drift problem) and handles per-environment
   substitution (this task's problem) rather than two mechanisms. Needs a
   written record per this task's own acceptance criteria and
   [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s tests (a
   credible rejected alternative — raw `${VAR}` placeholder substitution,
   hand-scripted `kcadm.sh` — whose reasoning [task 04](04-send-email-from-kalia.md),
   [task 05](05-self-registration-with-email-verification.md),
   [task 06](06-kalia-branded-bilingual-auth-pages.md) and
   [task 07](07-google-as-a-sign-up-route.md) will all need, since each
   inherits "realm configuration" through this mechanism): a new ADR, numbered
   via `make next-adr` at implementation time, shared by this task and
   task 03 rather than duplicated.
2. **Where does the local client secret live?** Decided: an **untracked `.env`
   at the repository root** (not `frontend/.env.local` — the secret is
   consumed by both the `keycloak` and `frontend` services in
   `docker-compose.yml` itself, which is genuinely root-level, not
   frontend-scoped). This needs no new mechanism: Docker Compose already
   auto-loads a `.env` file beside `docker-compose.yml` for `${VAR}`
   substitution in the compose file — the same mechanism
   `${POSTGRES_PASSWORD:-kalia}` and `${AUTH_SECRET:-kalia-dev-auth-secret}`
   already use, just without a default this time — and `.gitignore` already
   carries a bare `.env` entry that matches at any depth including root, so no
   `.gitignore` change is needed either. Document it in the root
   [README.md](../../../README.md)'s "Run locally" section, the only existing
   doc home that already covers `docker compose up --build`
   ([ADR-0020](../../adr/0020-documentation-roles.md) — neither app README
   owns a docker-compose-level secret).
3. **Does `testuser` survive this file at all?** Decided in
   [task 01](01-persist-keycloak-state.md): `testuser` stays, but with **no
   credential in the committed file** — it is seeded via the same idempotent
   create-if-not-exists mechanism as e2e worker accounts
   (`frontend/e2e/support/keycloakAccount.ts`), not a `credentials` block in
   `realm-export.json`. `git grep` finding no password for it is therefore
   part of this task's own acceptance criteria, not a carve-out.
4. **Is `sslRequired` per-environment, or does local also move to HTTPS?**
   Decided: stays an environment-varying placeholder; local dev stays HTTP,
   unchanged from today. No certificate management added to the dev stack.
5. **How much of the realm should the file still own?** Decided: the file
   keeps the full realm definition (clients, flows, identity providers as
   later tasks add them); per-environment values are substituted via
   keycloak-config-cli's own variable mechanism rather than Keycloak's native
   `${VAR}` placeholder resolution, following from question 1's answer.

## Acceptance criteria

- [x] Whether `keycloak.migration.replace-placeholders` actually substitutes
      environment variables on `quay.io/keycloak/keycloak:26.7.0` is confirmed
      by running it, and the result is written into the task's chosen approach
      — not assumed from the documentation
- [x] `git grep` finds no client secret and no user password anywhere in
      `keycloak/`
- [x] From an empty volume, the local stack still signs `testuser` in end to
      end — full Playwright suite, not a manual click
- [x] An automated test asserts the imported realm's `kalia-frontend` redirect
      URI equals the configured frontend origin, and fails when the two are
      made to disagree — confirmed to fail against a deliberately broken value
- [x] The same realm file imports against a second, non-localhost set of
      values, demonstrated by running it with those values supplied

## Notes

Lifts the [backlog](../backlog.md) entry "The Keycloak realm export is
hardcoded to localhost" into this iteration, including the trap it records:
an unresolved placeholder may leave a healthy server serving a broken realm,
and `--import-realm` will not retry against an existing database.
