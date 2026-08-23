# Task 03: Fix the concurrent-first-sign-in duplicate-user race

- **Status:** needs-refinement
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

## Constraints

- [ADR-0025](../../adr/0025-authjs-valkey-adapter.md): the hand-written
  Valkey adapter and why it exists; this task works within it, not around
  it.
- Auth.js's `Adapter` interface has no compare-and-set primitive to lean on —
  the fix has to be a Valkey-side lock or conditional write (e.g. `SET NX`
  on the account index, or a short-lived lock with the loser re-reading),
  not a change to the interface contract.

## Open questions

- **Edge cases and failure handling:** if two concurrent sign-ins race and
  one loses, what does that request see — does it retry and read the
  winner's record, or does the sign-in fail and the user is asked to sign in
  again? This governs a small piece of user-visible sign-in behavior in a
  case that essentially never happens today but will exist as coded
  behavior once fixed.

## Acceptance criteria

- [ ] Two concurrent first-ever sign-ins by the same Keycloak subject result
      in exactly one `auth:user:*` record — proven by an automated test that
      reproduces the race (e.g. firing `createUser`/`getUserByAccount`
      concurrently against a real or emulated Valkey) and is confirmed to
      fail against today's adapter
- [ ] `frontend/e2e/sign-in-out.spec.ts` run with default Playwright
      parallelism against a freshly flushed Valkey shows no duplicate user
      record
- [ ] `npm test` and `npm run test:e2e` are green

## Notes

Quality backlog: SHOULD-8. Found while measuring whether ADR-0030 lets the
E2E suite drop `mode: "serial"`; it is not the cause of the parallel
failures that investigation was about, which reproduce with the user already
present.
