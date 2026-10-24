# Task 09: The sign-up limiter can never lock sign-up for good

- **Status:** done
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

`createSignUpRateLimiter` (`frontend/features/auth/signUpRateLimit.ts:29-30`)
runs `SET NX EX` and, when the key already exists, a separate `INCR`. If the
window's key expires between the two, `INCR` creates `auth:sign-up-rate` at 1
with no expiry. After 20 more attempts every sign-up answers `rate-limited`,
for good, until someone deletes the key by hand. The odds per window are low
and the effect is permanent.

The comment above it (`:22-26`) claims exactly this failure is impossible, and
[ADR-0055](../../adr/0055-self-registration-via-keycloak.md):73 describes the
mechanism as `INCR`+`EXPIRE` — which the code's comment says it rejects — so
the ADR and the code disagree with each other as well as with what is safe.

## Scope

However the commands interleave with the key's expiry, the counter always
expires within one window. The comment and ADR-0055 describe what the code
does.

## Non-goals

- Changing the limit, the window, or the one-shared-counter design
  ([task 10](10-unauthenticated-edges-throttled.md) covers throttling more
  widely).

## Constraints

- [ADR-0055](../../adr/0055-self-registration-via-keycloak.md): one global
  counter, 20 attempts per 10 minutes; the ADR is amended, not rewritten.
- [ADR-0037](../../adr/0037-functional-modules.md): the client stays an
  injected `RateLimitClient` seam.
- The e2e `signUpBudget` fixture clears this key by name
  (`frontend/e2e/support/keycloakAccount.ts`); the key name does not change.

**Decided at refinement, 2026-10-24** (product owner):

- **`INCR` then `EXPIRE … NX`**: an expiry is set only where none exists, so the counter can never be left without one, and the `RateLimitClient` seam stays two plain commands. `MULTI`/Lua was rejected as more machinery for the same guarantee.

## Open questions

**None.**

## Acceptance criteria

- [x] A vitest test in which the key expires between the two calls ends with
      a counter that has an expiry — confirmed to fail against today's code
- [x] The existing limiter tests pass, and the 21st attempt in a window is
      still refused
- [x] ADR-0055 and the code comment describe the mechanism that ships, and
      `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-18. Listed first:
it is a MUST and small.
