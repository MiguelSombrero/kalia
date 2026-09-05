# Task 09: Keep the test suites deterministic against a Keycloak that no longer resets

- **Status:** refined
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** DW-3

## Why

The Playwright suite depends on Keycloak forgetting everything. Its specs sign
in as `testuser`/`testuser123`, an account that exists because
`start-dev --import-realm` recreates it on every start, and they run serially
because "all specs share one realm user"
(`frontend/e2e/sign-in-out.spec.ts`). Each run begins from a realm nobody has
touched.

Two things in this iteration end that. [Task 01](01-persist-keycloak-state.md)
makes the realm durable, so state accumulates between runs on a developer's
machine. [Task 05](05-self-registration-with-email-verification.md) adds a spec
that *creates a user*, so every local run leaves a permanent account behind,
and a second run of a spec that registers a fixed address hits "email already
registered" — a failure that looks like a bug in registration and is not.

CI is not where this shows up. Its `e2e` job starts the compose stack fresh
each time (`playwright.config.ts`), so CI keeps passing while local runs rot,
which is the worst arrangement: the developer sees flakiness the pipeline
denies.

Left alone, the usual outcome is a suite people re-run after a manual
`docker compose down -v`, which is a reset with no error message when someone
forgets.

## Scope

The test suites pass repeatedly against a persistent Keycloak, on a machine
that has already run them, without a manual reset — and a spec that creates
accounts does not depend on being the first to run.

## Non-goals

- Running Playwright in CI differently. CI's clean-slate behaviour is fine and
  is not the problem.
- Backend integration tests. Testcontainers already gives each run a fresh
  database (`backend/README.md`); this is about Keycloak state only.
- Test *data* for the cellar. Seeding a populated cellar was
  [iteration 5 task 21](../iteration-5/21-seed-testuser-cellar-data.md), which
  was dropped; reviving it is not this task.

## Constraints

- **Correction found during refinement (2026-09-05):** the Playwright suite no
  longer depends on `testuser` at all — [iteration 6 task
  11](../iteration-6/11-e2e-suite-account-contention.md) already moved every
  spec onto dynamically-provisioned `e2e-worker-N` accounts
  (`frontend/e2e/support/keycloakAccount.ts`); `grep -rn testuser
  frontend/e2e/` finds nothing. `testuser` itself is [task
  01](01-persist-keycloak-state.md)'s seeded manual/demo account, not a test
  fixture this task's suite needs — this task's own scope is the
  `e2e-worker-N` accounts (question 5) and registration-spec-created accounts
  (questions 1–2) instead.
- It must not become a real account with a known password on any deployment
  — the reason [task 02](02-parameterise-realm-configuration.md) takes the
  password out of the committed realm file in the first place.
- The serial-execution constraint in `frontend/e2e/sign-in-out.spec.ts` exists
  because measured runs failed 1–2 specs in 6 when parallel. Anything that
  changes how specs share an account has to keep that measurement honest, or
  re-take it.
- The Keycloak `sub` is the key everything else hangs off
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)); cellar rows
  reference it, so deleting a test user without its cellar data leaves orphans.
- A cleanup step that silently does nothing is worse than none. This is the
  same class as the [backlog](../backlog.md)'s frontend import-boundary
  fixture: a green exit code proving only that a script ran.
- **`testuser` (and any other worker-derived e2e identity) is provisioned by
  a worker-scoped Playwright fixture, idempotently (create-if-not-exists) via
  the Keycloak admin API** — the same mechanism
  [iteration 6 task 11](../iteration-6/11-e2e-suite-account-contention.md)
  introduces for intra-run parallelism, converged with this task on
  2026-09-04 rather than decided separately. This answers this task's own
  "where does `testuser` come from" question below for worker-derived
  accounts: **accumulate, not reset** — idempotent creation means a leftover
  account from a prior run is harmless and reused rather than recreated.
  Registration-spec-created accounts are a different case and still open,
  below.

## Open questions

**None.**

Resolved during refinement (2026-09-05):

1. **How does a registration spec get a fresh address every run?** Decided:
   a timestamp/random local-part per run.
2. **Does anything delete test accounts, and when?** Decided: no — nothing
   ever deletes a test account, worker-derived or registration-spec-created.
   `docker compose down -v` is the only reset, consistent with
   [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md) treating a
   volume wipe as an ordinary, expected step pre-deployment.
3. **Do cellar rows belonging to a deleted test user get cleaned up?** Moot,
   given question 2: since nothing ever deletes a test account, this task
   creates no orphaned cellar rows to clean up.
4. **Should the local stack warn about stale Keycloak state?** Decided: no
   special warning needed here. [Task 03](03-prevent-realm-configuration-drift.md)'s
   keycloak-config-cli mechanism already reconciles an old volume's
   realm-level configuration to the committed file on every boot, so the
   specific "old realm shape" staleness this question worried about is
   handled structurally rather than needing a separate check in this task.
5. **Does account identity need to be unique per Playwright process/run?**
   Resolved as no-longer-applicable to this task's remaining scope: the
   `e2e-worker-N` naming/collision question is
   [iteration 6 task 11](../iteration-6/11-e2e-suite-account-contention.md)'s
   own already-`done` mechanism (`parallelIndex`, documented in
   `frontend/README.md`), unchanged by this task. Registration-spec accounts
   (question 1) use an entirely different, timestamp/random-based naming
   scheme, so they carry none of the same collision risk — two concurrent
   Playwright processes each minting a fresh timestamped address don't derive
   the same name the way two `e2e-worker-0` derivations could.

## Acceptance criteria

- [ ] The full Playwright suite passes twice in a row, on the same stack, with
      no `docker compose down -v` and no manual step between the runs —
      the failure mode this task exists for, demonstrated absent
- [ ] It also passes from an empty volume on a machine that has never run it
- [ ] A registration spec run twice does not fail the second time on an
      already-registered address
- [ ] Whatever seeds `testuser` fails loudly if it does not, rather than
      leaving the suite to discover it — verified by breaking it on purpose
- [ ] `frontend/README.md` states what a developer is expected to do about
      Keycloak state before running the suite, if anything

## Notes

Found while sketching this iteration on 2026-08-29, from reading
`frontend/e2e/sign-in-out.spec.ts` against
[task 01](01-persist-keycloak-state.md)'s change. Ordered after
[task 05](05-self-registration-with-email-verification.md) because the
account-creating spec is what makes the problem concrete —
[task 01](01-persist-keycloak-state.md) still owns keeping the existing suite
green on its own, since the definition of done requires it.

Open question 5 above surfaced from `/code-review` on
[iteration 6 task 11](../iteration-6/11-e2e-suite-account-contention.md), PR
[#226](https://github.com/MiguelSombrero/kalia/pull/226).
