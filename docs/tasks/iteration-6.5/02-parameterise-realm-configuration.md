# Task 02: One realm file for every environment

- **Status:** needs-refinement
- **Iteration:** [6.5](../iteration-6.5.md)
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

1. **Placeholders in the export, or a different mechanism entirely?** If
   `replace-placeholders` proves unreliable on `26.7.0`, the alternatives are a
   generated file, `kcadm.sh` at startup, or a configuration tool such as
   `keycloak-config-cli` — which would also answer
   [task 03](03-prevent-realm-configuration-drift.md), making these two
   arguably one decision. A tool is a new dependency and needs a version
   confirmed, per [CLAUDE.md](../../../CLAUDE.md)'s dependency rule.
2. **Where does the local client secret live?** A committed `.env` is the same
   plaintext secret in a different file; a generated one on first run is
   reproducible-build-hostile; an untracked `.env` needs documenting or a new
   contributor gets a broken stack with no message saying why.
3. **Does `testuser` survive this file at all?** If the export stops carrying
   credentials, the fixture account has to come from somewhere —
   [task 01](01-persist-keycloak-state.md) question 3 and
   [task 09](09-deterministic-test-accounts.md).
4. **Is `sslRequired` per-environment, or does local also move to HTTPS?**
   Keeping it variable means shipping a realm that *can* be insecure; making
   local HTTPS means certificates in the dev stack.
5. **How much of the realm should the file still own?** Every value that varies
   is a placeholder, and a file that is more placeholder than content is harder
   to review than one generated from a template.

## Acceptance criteria

- [ ] Whether `keycloak.migration.replace-placeholders` actually substitutes
      environment variables on `quay.io/keycloak/keycloak:26.7.0` is confirmed
      by running it, and the result is written into the task's chosen approach
      — not assumed from the documentation
- [ ] `git grep` finds no client secret and no user password anywhere in
      `keycloak/`
- [ ] From an empty volume, the local stack still signs `testuser` in end to
      end — full Playwright suite, not a manual click
- [ ] An automated test asserts the imported realm's `kalia-frontend` redirect
      URI equals the configured frontend origin, and fails when the two are
      made to disagree — confirmed to fail against a deliberately broken value
- [ ] The same realm file imports against a second, non-localhost set of
      values, demonstrated by running it with those values supplied

## Notes

Lifts the [backlog](../backlog.md) entry "The Keycloak realm export is
hardcoded to localhost" into this iteration, including the trap it records:
an unresolved placeholder may leave a healthy server serving a broken realm,
and `--import-realm` will not retry against an existing database.
