# Task 13: Sessions and the stack's credentials are safe beyond one laptop

- **Status:** refined
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

[Iteration 10](../iteration-10.md) is the first time anything beyond
localhost reaches the stack: a real iPhone talks to the backend and Keycloak
on the developer's Mac. Today the stack is safe only because it is loopback-
bound.

**The dev setup is also the only deployment definition.**
`docker-compose.yml` and `keycloak/realm-export.json` serve both. The
`keycloak-seed` service runs by default and
`scripts/seed-keycloak-account.mjs:69-74` resets `testuser` to a known,
non-temporary password on every `up`. The file ships `AUTH_SECRET:
${AUTH_SECRET:-kalia-dev-auth-secret}` (`:60`), which
`frontend/lib/config/requiredConfiguration.ts:18` accepts because it checks only
presence; Keycloak admin `admin/admin` (`:118-119`, `:162-163`, `:221-222`);
and `KEYCLOAK_SSL_REQUIRED:-none` (`:188`). The realm ships the `kalia-swagger`
public client unconditionally (`realm-export.json:75-101`), so any user can
mint `kalia-backend`-audience tokens outside the BFF's session lifecycle.

**Valkey holds every session in plaintext with no authentication.** The URL is
`redis://` with no credentials (`frontend/lib/auth/valkeyClient.ts:6`) and the
service sets no `requirepass`, ACL or TLS (`docker-compose.yml:230-239`). Each
key name *is* the session cookie value (`valkeyAdapter.ts:18`), so anything
reaching port 6379 can enumerate `auth:session:*` and hijack every session.
`revokeRefreshToken: false` (`realm-export.json:14`) means a refresh token read
out of Valkey replays alongside its holder for the whole SSO session,
undetected — the question iteration 9's mobile refresh design must also answer.

**Signing in while signed in keeps the previous user's tokens.** With a live
session, Auth.js links an unseen OAuth account to the signed-in user
(`@auth/core/lib/actions/callback/handle-login.js:206-212`). `createdSession()`
is then undefined, so `putSessionAccount` is skipped (`frontend/auth.ts:59-64`),
`auth.ts:51-57` renames user A to B's username, and `valkeyAdapter.ts:170-172`
maps B's `sub` to A permanently. On a shared browser, B sees their own name
while every backend call carries A's token. Narrow: it needs a live Auth.js
session and a Keycloak login as someone else. Not reproduced live.

## Scope

A deployment cannot inherit a dev credential by omission. The session store
requires authentication. Signing in as a second person never carries the
first person's tokens. Whether refresh tokens rotate is handed to iteration
9's mobile-authentication decision, with the web's current reuse recorded.

## Non-goals

- A real deployment, TLS, IaC — [backlog](../backlog.md).
- The mobile client's own token storage — iteration 9.

## Constraints

- [ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md): the realm
  is managed by keycloak-config-cli under a drift check.
- [ADR-0025](../../adr/0025-authjs-valkey-adapter.md),
  [ADR-0030](../../adr/0030-per-session-token-storage.md),
  [ADR-0029](../../adr/0029-silent-token-refresh.md): where tokens live and how
  they refresh. `frontend/README.md`'s trap: the Auth.js handlers stay wrapped
  in `withSignInContext`.
- [ADR-0015](../../adr/0015-configuration-strategy.md) and
  [ADR-0018](../../adr/0018-frontend-env-var-validation.md): required
  configuration fails startup rather than defaulting.
- The e2e suite's per-worker accounts and the `valkey` fixture must keep
  working (`frontend/README.md`).

**Decided at refinement, 2026-10-24** (product owner):

- **A dev overlay split.** A base compose file demands every secret (`:?` interpolation) and runs no seed service; a dev overlay adds `keycloak-seed`, the dev defaults and the `kalia-swagger` client, so local `docker compose up` keeps working unchanged. Hardening one file in place was rejected.
- **Valkey requires a password now**, from a required `VALKEY_PASSWORD` (a dev default only in the overlay), carried in the URL the frontend and the e2e `valkey` fixture use; TLS waits for a deployment. A per-client ACL user was rejected as more configuration than one client needs.
- **Refresh-token rotation is deferred to [iteration 9](../iteration-9.md)'s mobile-authentication decision**, which chooses it for both clients at once. This task records in ADR-0029 why the web keeps reuse until then.
- **Every sign-in action ends any local session first**, so a new sign-in always starts a fresh session with its own tokens. Refusing sign-in while signed in was rejected.
- **Recorded in a new ADR** for the base/overlay split.

## Open questions

**None.**

## Acceptance criteria

- [ ] Starting the deployable definition without a secret it needs fails with
      the variable named — a test of `verifyRequiredConfiguration` rejecting
      the known dev `AUTH_SECRET`, and the compose check run in CI
- [ ] An unauthenticated client cannot read `auth:session:*` from Valkey — an
      integration or e2e test against the stack
- [ ] Starting a sign-in while signed in ends the local session first, and
      signing in as B after A leaves no request carrying A's token — a vitest
      test, and an e2e flow if reachable there
- [ ] Local `docker compose up` with the dev overlay still brings up a
      working stack with the seeded account — e2e green
- [ ] ADR-0029 records why the web keeps refresh-token reuse until iteration 9
      decides rotation
- [ ] `keycloak-check` and `make verify` are green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-25 (with the
Swagger client), SHOULD-26 (with `revokeRefreshToken`) and COULD-64. Merged
because each is what an attacker gets once the stack is reachable from more
than one machine.
