# Task 17: Reconcile check-signup-survives-restart.mjs with the shared Keycloak helper

- **Status:** done
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** none

## Why

`scripts/check-signup-survives-restart.mjs` has its own two implementations of
the password-grant-against-`admin-cli` token fetch that
[task 15](15-shared-keycloak-admin-helper.md) centralizes into
`scripts/keycloak-admin.mjs` for three other scripts:

- `adminToken()` (`check-signup-survives-restart.mjs:80`) — a master-realm
  admin token, the same shape task 15's helper covers.
- `trySignIn()` (`check-signup-survives-restart.mjs:192`) — a `kalia`-realm
  sign-in check, the same shape as `check-keycloak-signin.mjs`'s copy task 15
  also folds in.
- `signInWithRetry()` (`check-signup-survives-restart.mjs:210`) — a bounded
  retry loop, the same shape as the helper's retry function.

Task 15's Scope names exactly three scripts to migrate
(`seed-keycloak-account.mjs`, `check-keycloak-signin.mjs`,
`check-keycloak-realm-config.mjs`) and was refined 2026-09-12 — four days
after `check-signup-survives-restart.mjs` was added (2026-09-08) — so this
fourth copy wasn't caught during that refinement, even though task 15's own
Why section already named the risk: "a fourth copy is exactly the kind of
duplication that stops being a coincidence and starts being a pattern nobody
maintains."

The catch this task exists to resolve: `check-signup-survives-restart.mjs`'s
error paths deliberately avoid calling `response.text()` on password-bearing
requests (see its comments at lines 91, 198-206, and the fix for a CodeQL
clear-text-logging finding those comments point back to). Task 15's shared
`fetchToken` always calls `await response.text()` on a non-ok response and
hands it to a `describeError` callback. Reusing it as written for this script
would either reintroduce that CodeQL finding (if `describeError` logs the
text) or requires redesigning `fetchToken` to make the body read
conditional/opt-out per caller — an interface change beyond a drop-in
call-site swap, and outside what task 15 itself scoped or reviewed.

## Scope

Migrate `check-signup-survives-restart.mjs` onto
`scripts/keycloak-admin.mjs`'s exported `fetchToken`/`withRetry`, replacing
its own `adminToken()` (line 80), `trySignIn()` (line 192), and
`signInWithRetry()` (line 210) — with identical caller-visible behavior (same
log lines, same error wording, same exit codes, same retry counts/delays).

Each call site composes `fetchToken` + `withRetry` directly, the same pattern
`seed-keycloak-account.mjs` and `check-keycloak-realm-config.mjs` already use
(task 15 never exported a combined "admin token" helper — only the two
lower-level pieces are shared):

- Master-realm admin token (replacing `adminToken()`): `fetchToken({realm:
  "master", username: ADMIN_USERNAME, password: ADMIN_PASSWORD,
  describeError})` wrapped in `withRetry(..., {attempts: 15, delayMs:
  2000})`, matching the other two scripts' identical composition.
- `kalia`-realm sign-in check (replacing `trySignIn()`): `fetchToken({realm:
  REALM, username, password, describeError})`, retried via `withRetry(...,
  {attempts: 30, delayMs: 2000})` in place of `signInWithRetry()`.

No change to `scripts/keycloak-admin.mjs` itself: `fetchToken`'s existing
`describeError(status, text)` contract already supports omitting the response
body from a thrown message — a caller's `describeError` simply doesn't
reference the `text` argument. `response.text()` is still read internally by
`fetchToken`, but since that value never reaches a thrown message or a log
call for either of this script's call sites, there is no CodeQL
clear-text-logging data-flow path from it, so no interface change is needed
to avoid reintroducing the finding.

## Non-goals

- Any change to `check-signup-survives-restart.mjs`'s observable behavior —
  its retry counts, delays, error wording, and the flow it drives against
  Keycloak stay identical.
- Re-opening task 15's own scope or its three already-named call sites.
- A generic "read the body or don't" flag on every `keycloak-admin.mjs`
  function regardless of whether anything needs it — only the password-bearing
  paths this script exercises are in play.
- Any change to `fetchToken`'s signature, or to `scripts/keycloak-admin.test.mjs`
  — see Scope: the existing contract already covers this script's needs.
- Exporting a shared `adminToken()` composition (or any other new export)
  from `scripts/keycloak-admin.mjs` — this script composes `fetchToken` and
  `withRetry` at its own call sites instead, matching `seed-keycloak-account.mjs`
  and `check-keycloak-realm-config.mjs`.

## Constraints

- [Task 15](15-shared-keycloak-admin-helper.md) is done and
  `scripts/keycloak-admin.mjs` exists, so this task is unblocked.
- No password or other credential value may reach `console.log`/`console.error`
  or a thrown `Error` message — the constraint the original CodeQL finding
  enforced stays in force.
- `describeError` for the master-realm admin token call site must reproduce
  `adminToken()`'s current exact wording, `could not obtain a Keycloak admin
  token: ${response.status}` (no response body — its current behavior already
  omits it, unlike `keycloak-admin.mjs`'s own private `adminToken()`, whose
  `describeError` includes `${text}`).
- `describeError` for the `kalia`-realm sign-in call site must reproduce
  `trySignIn()`'s current exact wording, `Keycloak rejected sign-in for
  ${username} after the restart: ${response.status}` (no response body).
- `fetchToken` only returns whatever `access_token` field it finds (or
  `undefined`) — it does not itself check for a missing token. The migrated
  sign-in call site must keep `trySignIn()`'s explicit check (line 203-205)
  and its exact message, `Keycloak accepted sign-in for ${username} after the
  restart but returned no access token`, for the case where Keycloak accepts
  credentials but the grant response omits a token.

## Open questions

**None.**

Resolved during refinement (2026-09-12):

1. **(a) shared helper with an opt-out, or (b) keep the script's own copy
   with an explaining comment?** Decided: (a) — migrate onto
   `scripts/keycloak-admin.mjs`'s exported `fetchToken`/`withRetry`. See
   Scope.
2. **What should the opt-out look like on `fetchToken`'s call signature?**
   Decided: no signature change. `fetchToken`'s existing `describeError(status,
   text)` callback already lets a caller ignore `text`; since neither of this
   script's two call sites' `describeError` implementations reference it, no
   data flows from the response body to a thrown message, so the CodeQL
   clear-text-logging finding the original fix addressed does not reappear.
   `withRetry` needs no change either — its shape (attempts/delayMs, always
   throws at exhaustion) already matches `signInWithRetry()` and `adminToken()`
   exactly.
3. **Should `scripts/keycloak-admin.mjs` export a shared `adminToken()`
   composition, now that a third script would use the identical
   master-realm/attempts:15/delayMs:2000 shape?** Decided: no — compose
   `fetchToken` + `withRetry` inline at this script's own call site, matching
   `seed-keycloak-account.mjs` and `check-keycloak-realm-config.mjs`. Keeps
   this task's diff a like-for-like swap and avoids re-opening task 15's
   scope (Non-goals).

## Acceptance criteria

- [x] `check-signup-survives-restart.mjs` no longer duplicates
      `scripts/keycloak-admin.mjs`'s `fetchToken`/`withRetry` — verified by
      reading the diff
- [x] `make keycloak-check` and `node --test scripts/check-signup-survives-restart.test.mjs`
      still pass with identical observable behavior (same log lines, same
      exit codes) before and after
- [x] No password value appears in any log line or thrown error message —
      verified by triggering each error path (bad credentials, sign-in
      rejected) locally and inspecting the output

## Notes

Found while working task 15's refinement follow-through: the fourth copy task
15's own Why section warned about, but that task's Scope (fixed before
`check-signup-survives-restart.mjs` existed) never named.
