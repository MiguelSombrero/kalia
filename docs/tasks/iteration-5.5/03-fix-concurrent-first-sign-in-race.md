# Task 03: Fix the concurrent-first-sign-in duplicate-user race

- **Status:** refined
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

`frontend/lib/auth/valkeyAdapter.ts` has no compare-and-set between checking
whether a Keycloak subject has signed in before and creating their user
record. Two simultaneous first-ever sign-ins by the same subject each find
no user (`getUserByAccount` → null) and each call `createUser`, leaving two
`auth:user:*` records for one subject with `auth:account-index:*` resolving
to whichever wrote last.

Reproduced by flushing Valkey and running `frontend/e2e/sign-in-out.spec.ts`
with Playwright's default parallelism: the key dump afterwards shows two user
records for `testuser`. Narrow in practice — it needs concurrent sign-ins
during a subject's very first authentication, and the duplicate is inert once
the index settles — but the losing record is orphaned forever, and any future
per-user data written against it (e.g. a profile row keyed by user id) would
be stranded.

## Scope

Make the first-ever sign-in for a given Keycloak subject race-safe: exactly
one `auth:user:*` record survives concurrent first sign-ins, with no
orphaned loser.

## Non-goals

- Any other Auth.js adapter behavior — this is scoped to the create-on-first-
  sign-in path.
- Migrating existing orphaned records, if any exist in a running environment
  today — this task prevents new ones.
- Making the index-claim and the full user-record write atomic against a
  process crash landing exactly between the two (e.g. via a Valkey Lua
  script) — the bounded-wait timeout below (Constraints) already bounds the
  user-visible impact of that already-rare case, and that is enough here.

## Constraints

- [ADR-0025](../../adr/0025-authjs-valkey-adapter.md): the hand-written
  Valkey adapter and why it exists; this task works within it, not around
  it.
- Auth.js's `Adapter` interface has no compare-and-set primitive to lean on —
  the fix has to be a Valkey-side lock or conditional write, not a change to
  the interface contract.
- **The compare-and-set has to live in `createUser`, not `linkAccount`.**
  Auth.js's own login handler (`@auth/core`, outside this adapter's control)
  calls `getUserByAccount` → `createUser` → `linkAccount` → `createSession`
  in a fixed sequence and threads whatever `createUser` *returns* straight
  into the two calls that follow. A conditional write inside `linkAccount`
  alone (e.g. `SET NX` on the account index) cannot save the losing request:
  by the time `linkAccount` runs, the session-to-be already carries the
  loser's own freshly-created (and about-to-be-orphaned) user id, since that
  id came from `createUser`'s return value, not from anything `linkAccount`
  does. Only `createUser`'s return value can redirect a request onto the
  canonical user.
- **Confirmed with the product owner (2026-08-23): a losing sign-in must
  succeed transparently against the winner's user record, with no
  user-visible failure in the ordinary (non-crash) case.** `createUser`
  claims the email index (the field it actually receives — `linkAccount`'s
  account info arrives too late, per the point above) with a conditional
  write; the request that loses the claim waits a bounded time and re-reads
  the index to return the winner's already-created user object instead of
  creating its own. Both concurrent sign-ins then get a valid session
  against the same user.
- **Confirmed with the product owner (2026-08-23): if the winning write
  never completes (crash mid-write), the waiting request's bounded wait
  times out to failure** rather than hanging indefinitely or falling back to
  creating a second user record. This reuses Auth.js's existing default
  error page — no `pages.error` override exists today (confirmed:
  `auth.ts` sets none), so this is already how every other adapter-thrown
  error surfaces (e.g. `updateUser`'s `Cannot update unknown user` throw);
  no new UI or copy is needed for this new failure path either.
- This is a genuine architectural decision under
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md) — a credible
  alternative (`linkAccount`-only compare-and-set; unconditional fail-fast)
  was rejected, and the reasoning above would not survive in the code alone.
  Record it as its own new ADR, following the precedent of
  [ADR-0029](../../adr/0029-silent-token-refresh.md)/[0030](../../adr/0030-per-session-token-storage.md)/[0031](../../adr/0031-backchannel-logout.md)/[0033](../../adr/0033-keycloak-account-relinking.md)
  (small, focused adapter-behavior ADRs), not as an amendment to
  ADR-0025 itself, since nothing here contradicts what ADR-0025 already says.

## Open questions

**None.**

## Acceptance criteria

- [ ] Two concurrent first-ever sign-ins by the same Keycloak subject result
      in exactly one `auth:user:*` record, and **both sign-ins still
      succeed** (each resolves to a valid session against that one user) —
      proven by an automated test that fires `createUser` concurrently
      against a real or emulated Valkey and is confirmed to fail against
      today's adapter
- [ ] When the winning write never completes, a concurrent request waiting
      on it fails after a bounded wait instead of hanging indefinitely or
      creating a second user record — covered by an automated test that
      simulates the incomplete write
- [ ] `frontend/e2e/sign-in-out.spec.ts` run with default Playwright
      parallelism against a freshly flushed Valkey shows no duplicate user
      record
- [ ] `npm test` and `npm run test:e2e` are green

## Notes

Quality backlog: SHOULD-8. Found while measuring whether ADR-0030 lets the
E2E suite drop `mode: "serial"`; it is not the cause of the parallel
failures that investigation was about, which reproduce with the user already
present.
