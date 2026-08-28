# ADR-0043: `createUser` claims the email index with SET NX so a losing concurrent sign-in joins the winner

- **Status:** accepted
- **Date:** 2026-08-23

## Context

`frontend/lib/auth/valkeyAdapter.ts`'s `createUser` wrote `auth:user:*` and
`auth:user-by-email:*` with two unconditional `SET`s, in that order, with no
compare-and-set between "does a user for this email already exist?" and
"write one". Two concurrent first-ever sign-ins by the same Keycloak subject
each find no user via `getUserByAccount`, and Auth.js's own login handler
(`@auth/core`'s `lib/actions/callback/handle-login.js`) then calls
`createUser` → `linkAccount` → `createSession` in a fixed sequence, threading
whatever `createUser` returns into the two calls that follow. Both requests'
`createUser` calls therefore each generate their own id and write their own
full user record; the email index ends up pointing at whichever wrote last,
and the other's record is orphaned — reproduced by flushing Valkey and
running `frontend/e2e/sign-in-out.spec.ts` with Playwright's default
parallelism (`fullyParallel: true`, `playwright.config.ts`), which showed two
`auth:user:*` records for `testuser` in the key dump afterwards.

Auth.js's `Adapter` interface has no compare-and-set primitive of its own,
and per the task's confirmed constraint the fix has to live in `createUser`
specifically: `linkAccount` runs after `createUser` in the fixed sequence
above and receives only the account, not the email, so a conditional write
there cannot redirect a request that already generated and returned its own
user id.

The product owner confirmed on 2026-08-23 that a losing sign-in must succeed
transparently against the winner's user record in the ordinary case, and that
if the winning write never completes (a crash between claiming the index and
finishing the user record), the waiting request should fail after a bounded
wait rather than hang or create a second record.

## Decision

**`createUser` claims `auth:user-by-email:<email>` with `SET … NX` before
writing anything else.** The request whose `NX` succeeds is the winner: it
writes the full `auth:user:*` record and returns it, unchanged from before.
The request whose `NX` fails is the loser: it polls the email index and the
winner's `auth:user:*` record (25 ms interval) for up to 2 seconds, and
returns the winner's `AdapterUser` the moment both exist — so `createUser`'s
return value, and therefore the session `linkAccount`/`createSession` build
from it, point at the one surviving user for both requests. If the 2-second
wait elapses without ever finding a complete winner record, `createUser`
throws; Auth.js has no `pages.error` override configured
(`auth.ts`), so this surfaces through its default error page — the same path
`updateUser`'s existing `Cannot update unknown user` throw already uses, so
no new UI or copy is needed.

This is deliberately not made atomic against a crash landing exactly between
the index claim and the record write via a Valkey Lua script or similar: the
bounded wait above already caps the user-visible cost of that already-rare
case to one failed sign-in, and the loser can simply retry.

If the winner's own `auth:user:*` write *rejects* rather than hanging (a
live process getting a Valkey error, as opposed to a crash mid-write), the
winner releases its `NX` claim (`DEL` on the email index) before rethrowing
— otherwise that claim would never clear, and every future sign-in for that
email, including the same user's own retry, would lose the race against a
claim nothing will ever finish and time out after 2 seconds, forever.

## Alternatives considered

**Compare-and-set inside `linkAccount` instead** (e.g. `SET NX` on the
account index `auth:account-index:<provider>:<providerAccountId>`). Rejected:
by the time `linkAccount` runs, Auth.js has already committed to whichever
user id the losing request's own `createUser` call returned — `linkAccount`
receives the account, not the email, and cannot retroactively redirect a
session that is already being built around the loser's own orphaned user id.

**Unconditional fail-fast**: let both writes happen as today, but make the
second request's `createUser` throw instead of silently orphaning a record.
Rejected: the product owner asked for the ordinary case to succeed
transparently for both concurrent sign-ins, and a first-ever-sign-in failure
is a worse user experience than a few milliseconds of extra latency on the
losing side.

**Atomic index-claim-and-record-write via a Valkey Lua script**, closing the
crash-mid-write gap entirely rather than bounding it. Rejected as
disproportionate to how rare a crash in that exact window is; the bounded
wait already turns that case into a single failed sign-in rather than a
duplicate record or a hang, which is enough per the task's own non-goals.

## Consequences

- Good, because two concurrent first-ever sign-ins for one subject now
  produce exactly one `auth:user:*` record, with both requests resolving to
  a valid session against it.
- Good, because the fix is contained to `createUser` and uses a primitive
  (`SET NX`) `ValkeyClient` already exposes a typed overload for, alongside
  the existing `PXAT`/`KEEPTTL XX` ones — no new dependency, no change to
  the `Adapter` interface.
- Good, because a live write failure (not just a crash) releases its claim
  immediately, so the affected email is never locked out longer than that
  one failed attempt.
- Bad, because a losing request now waits up to 2 seconds before either
  succeeding or failing, where it previously returned instantly (with a
  latent duplicate-record bug); every first-ever sign-in pays a fixed
  `SET NX` round-trip it did not pay before, though a returning sign-in hits
  `getUserByAccount` first and never reaches `createUser` at all.
- Neutral, because a genuine crash mid-write (rare, and only reachable in the
  narrow first-sign-in window) now surfaces as a sign-in failure through
  Auth.js's default error page rather than a silent orphaned record — a
  visible failure in exchange for no data left behind.
- **Revisit trigger:** if a future adapter operation needs the same
  claim-and-wait shape, factor `waitForClaimedUser` into a shared helper
  instead of duplicating it — not done now, since `createUser` is still its
  only caller.

## Evidence

`frontend/lib/auth/valkeyAdapter.test.ts`'s "createUser race safety" suite
reproduces all three cases directly against a fake `ValkeyClient`, each
confirmed to fail against the pre-fix (or pre-rollback) `createUser`:

- Two concurrent `createUser` calls for the same email resolve to
  `toEqual` the same `AdapterUser`, with exactly one `auth:user:*` key
  written. Fails against the pre-fix adapter with two distinct generated
  ids and two `auth:user:*` keys.
- A losing call whose winner's `auth:user:*` write is mocked to never
  resolve (simulating a crash mid-write) rejects once fake timers advance
  2000 ms, matching `CREATE_USER_CLAIM_TIMEOUT_MS`. Times out against the
  pre-fix adapter instead (no `waitForClaimedUser` path exists at all).
- A winner whose `auth:user:*` write is mocked to reject rejects with that
  same error, and a subsequent `createUser` call for the same email
  succeeds and claims a fresh record. Times out against the pre-rollback
  adapter (the `DEL` never runs, so the retry loses its own `NX` claim
  against a record that will never exist).
