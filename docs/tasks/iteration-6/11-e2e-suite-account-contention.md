# Task 11: The e2e suite's specs contend for one Keycloak account

- **Status:** needs-refinement
- **Iteration:** [6](../iteration-6.md)

## Why

`make verify`'s end-to-end step (`npm run test:e2e`) is non-deterministic on a
machine that runs Playwright with more than one worker. `add-to-cellar.spec.ts`
and `sign-in-out.spec.ts` both authenticate as the single seeded
`testuser`/`testuser123` account (`keycloak/realm-export.json`), and
`playwright.config.ts` sets `fullyParallel: true`, so the two files run in
parallel workers. `sign-in-out.spec.ts` contains specs that end `testuser`'s
session server-side mid-run — backchannel logout, "Keycloak ending the SSO
session ends the matching Kalia session", "ends the local session when
Keycloak rejects the refresh token". When one of those lands alongside
`add-to-cellar.spec.ts`, that spec's `bottleCount()` helper navigates to
`/en/cellar`, meets a signed-out page, reads it as zero bottles, and fails its
post-removal delta assertion.

Each file sets `test.describe.configure({ mode: "serial" })`, which orders
specs *within* a file and does nothing *across* files. CI does not see this:
`retries` is `process.env.CI ? 2 : 0`, so a first-try failure is retried away
in the pipeline while local `make verify` fails intermittently — the same
"developer sees flakiness the pipeline denies" arrangement
[iteration-6.5 task 09](../iteration-6.5/09-deterministic-test-accounts.md)
describes for a different cause.

Observed 2026-09-03 running the e2e gate for
[task 06](06-entry-with-no-bottles.md): the full suite gave 16 pass / 1 fail /
2 skipped (the fail aborts the rest of that file's serial group), reproducibly;
`npx playwright test add-to-cellar.spec.ts` on its own passes 3/3. The comment
at `frontend/e2e/sign-in-out.spec.ts:10` and
[ADR-0043](../../adr/0043-createuser-race-safety.md) already note the
shared-account fragility; `sign-in-out.spec.ts`'s serial mode exists because
"measured runs failed 1–2 specs in 6 when parallel".

## Scope

The `make verify` e2e step passes deterministically with `retries` at its local
default of 0 on a multi-worker run, without collapsing the whole suite onto a
single worker. A spec that mutates or ends a session no longer disturbs another
spec's session.

## Non-goals

- Cross-*run* Keycloak state accumulation on a durable realm — that is
  [iteration-6.5 task 09](../iteration-6.5/09-deterministic-test-accounts.md),
  triggered by that iteration's realm-persistence and account-creating specs.
  This task is one run against today's `start-dev --import-realm` realm.
- Changing CI's clean-slate e2e behaviour — it is fine as is.
- The backend integration and Vitest suites — unaffected by this.

## Constraints

- `testuser` must still exist with no manual step on a fresh clone — the realm
  file re-imports it on every `docker compose up`.
- The measurement behind `sign-in-out.spec.ts`'s serial mode ("1–2 of 6 specs
  failed when parallel") must stay honest: anything that changes how specs
  share an account either keeps serial mode or re-takes that measurement
  ([ADR-0043](../../adr/0043-createuser-race-safety.md)).
- No test identity may become a real credentialed account on any deployment —
  the reason
  [iteration-6.5 task 02](../iteration-6.5/02-parameterise-realm-configuration.md)
  takes the password out of the committed realm file.
- A seeding or cleanup step that silently does nothing is worse than none — a
  green exit code proving only that a script ran, the same class as the
  [backlog](../backlog.md)'s import-boundary fixture.

## Open questions

1. **How do the two specs stop sharing an identity?** Distinct accounts per
   spec file in the realm export; one account per Playwright worker via a
   worker-scoped fixture; or a Playwright project dependency that runs the
   session-ending auth specs last. Each has a different blast radius on the
   other e2e files.
2. **Converge with
   [iteration-6.5 task 09](../iteration-6.5/09-deterministic-test-accounts.md)
   or keep separate?** Both turn on "where do test accounts come from"; they
   differ in failure mode (intra-run parallelism here, cross-run state there)
   and in iteration. One answer, or two that must not contradict.
3. **Is `bottleCount()` returning 0 for both "beer absent" and "not signed in"
   a second bug to fix here?** It masks an auth failure as an empty cellar,
   which is what made this take time to recognise.
4. **Does any of the fix belong in `playwright.config.ts`** (worker count,
   project dependencies) rather than entirely in how specs acquire an
   identity?

## Acceptance criteria

- [ ] `cd frontend && npm run test:e2e` — the `make verify` invocation, with
      `retries` left at the local default of 0 and the run using more than one
      worker — passes on three consecutive runs against one already-up stack
- [ ] `add-to-cellar.spec.ts` and `sign-in-out.spec.ts` no longer share an
      identity, or it is demonstrated (state which) that a shared identity can
      no longer let one spec fail another — with a Playwright run as evidence
- [ ] A spec or helper that lands on a signed-out page where it expected a
      signed-in one fails as an authentication error, not as a silent "0
      bottles" / empty-state reading — verified by forcing that state
- [ ] `frontend/README.md` and/or `playwright.config.ts` state how e2e specs
      acquire their identity and why, so the next spec author does not
      re-introduce the sharing

## Notes

Found 2026-09-03 while implementing [task 06](06-entry-with-no-bottles.md)
(PR [#212](https://github.com/MiguelSombrero/kalia/pull/212)), running the e2e
gate. Not caused by that change — `add-to-cellar.spec.ts` removes a *non-last*
bottle and never exercises task 06's code, and every file involved predates
that branch.

Not in the [quality backlog](../quality-backlog.md).
[iteration-6.5 task 09](../iteration-6.5/09-deterministic-test-accounts.md) is
the nearest existing record and, as scoped, does not resolve this: its Scope
and acceptance criteria are about repeated runs on a persistent Keycloak and
about registration-spec addresses, not one run's parallel account contention.
Its Constraints do carry the "failed 1–2 specs in 6 when parallel" measurement,
which is this finding stated from the other side.
