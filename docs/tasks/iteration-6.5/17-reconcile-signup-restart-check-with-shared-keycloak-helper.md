# Task 17: Reconcile check-signup-survives-restart.mjs with the shared Keycloak helper

- **Status:** needs-refinement
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

Decide, and implement, one of:

- **(a)** Extend `scripts/keycloak-admin.mjs`'s `fetchToken`/retry helper with
  an opt-out from reading and forwarding the response body on password-bearing
  error paths, then migrate `check-signup-survives-restart.mjs` onto it.
- **(b)** Leave `check-signup-survives-restart.mjs`'s copy as its own
  implementation, with a comment explaining why it isn't shared — pointing at
  the CodeQL fix and at `scripts/keycloak-admin.mjs`.

Whichever is chosen, the decision and its reasoning are recorded in this task
file (Open questions, once resolved) rather than left implicit in a diff.

## Non-goals

- Any change to `check-signup-survives-restart.mjs`'s observable behavior —
  its retry counts, delays, error wording, and the flow it drives against
  Keycloak stay identical.
- Re-opening task 15's own scope or its three already-named call sites.
- A generic "read the body or don't" flag on every `keycloak-admin.mjs`
  function regardless of whether anything needs it — only the password-bearing
  paths this script exercises are in play.

## Constraints

- This task cannot start implementation before [task 15](15-shared-keycloak-admin-helper.md)
  lands, if option (a) is chosen — there is no `scripts/keycloak-admin.mjs` to
  extend until then. If option (b) is chosen, this task does not depend on
  task 15's implementation timing, only on its existence as the thing the
  comment points to.
- Whatever the outcome, no password or other credential value may reach
  `console.log`/`console.error` or a thrown `Error` message — the constraint
  the original CodeQL finding enforced stays in force.

## Open questions

1. **(a) shared helper with an opt-out, or (b) keep the script's own copy
   with an explaining comment?** See Scope. This is the product-owner
   decision this task exists to capture.
2. If (a): what should the opt-out look like on `fetchToken`'s call
   signature — a boolean flag, or a `describeError` that simply never
   receives the body (e.g., called with `undefined` when the caller opted
   out) — and does `withRetry` need any change at all, or only `fetchToken`?

## Acceptance criteria

- [ ] `check-signup-survives-restart.mjs` no longer duplicates
      `scripts/keycloak-admin.mjs`'s helper (option a), or carries a comment
      explaining why it keeps its own copy (option b) — verified by reading
      the diff
- [ ] `make keycloak-check` and `node --test scripts/check-signup-survives-restart.test.mjs`
      still pass with identical observable behavior (same log lines, same
      exit codes) before and after
- [ ] No password value appears in any log line or thrown error message —
      verified by triggering each error path (bad credentials, sign-in
      rejected) locally and inspecting the output

## Notes

Found while working task 15's refinement follow-through: the fourth copy task
15's own Why section warned about, but that task's Scope (fixed before
`check-signup-survives-restart.mjs` existed) never named.
