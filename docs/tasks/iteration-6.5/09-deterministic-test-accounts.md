# Task 09: Keep the test suites deterministic against a Keycloak that no longer resets

- **Status:** needs-refinement
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

- `testuser` must still exist on a fresh clone with no manual step, or the
  suite is unrunnable for a new contributor.
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

## Open questions

1. **Reset, or accumulate cleanly?** Tearing Keycloak's state down before each
   run restores today's behaviour and throws away the durability
   [task 01](01-persist-keycloak-state.md) just built. Letting accounts
   accumulate means unique addresses per run and something that eventually
   removes them.
2. **Where does `testuser` come from once the realm file has no credentials?**
   First-import seed, a setup script, a Playwright global setup, or the
   admin API. [Task 01](01-persist-keycloak-state.md) question 3 is the same
   question — whichever task answers it, the other should not answer it
   differently.
3. **How does a registration spec get a fresh address every run?** A timestamp
   or random local-part is the obvious answer and it is what fills the realm
   with junk accounts.
4. **Does anything delete test accounts, and when?** Per-run teardown is
   reliable until a run crashes; a periodic sweep needs something to run it;
   never is a choice too, if the junk is genuinely harmless.
5. **Do cellar rows belonging to a deleted test user get cleaned up?** They key
   on `sub` and the backend has no user table to cascade from, so nothing
   removes them today.
6. **Should the local stack tell a developer their Keycloak state is stale**
   rather than failing in a confusing way three specs later?

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
