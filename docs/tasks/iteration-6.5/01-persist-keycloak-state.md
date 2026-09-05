# Task 01: Persist Keycloak's state across restarts

- **Status:** refined
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** DW-1

## Why

`docker-compose.yml`'s `keycloak` service runs `start-dev --import-realm`,
which holds the realm in an in-memory database and reimports
`keycloak/realm-export.json` on every start. That was the right call while the
only account was a fixture ([iteration 4](../iteration-4.md) chose it
deliberately), but it makes an account something the stack throws away: any
user created through a sign-up form would be gone at the next
`docker compose restart`.

So the account store has to outlive the container before sign-up can mean
anything. Nothing later in this iteration can be honestly verified without it
— "the same account works tomorrow" is not a claim an ephemeral realm can
support, and an acceptance criterion that cannot fail is the one
[the template](../template.md) warns about.

The instability is not hypothetical and is already documented from the other
side: [ADR-0033](../../adr/0033-keycloak-account-relinking.md) exists because
a reimport hands `testuser` a fresh `sub` every start.

## Scope

Keycloak keeps its realm, its users and their credentials across a container
restart and a `docker compose down` without `-v`, in the local stack. That
means a real database behind it and a server mode that will use one, plus
whatever configuration that mode demands that `start-dev` supplied for free.

The existing suites keep passing — including the Playwright specs, which sign
in as `testuser` and today rely on the reimport to put that account there.

## Non-goals

- Deploying Keycloak anywhere. This is the local stack only; a deployment
  target is still [backlog](../backlog.md).
- Removing the localhost literals and the committed secret from the realm
  export — [task 02](02-parameterise-realm-configuration.md).
- Deciding how realm configuration stays true once the import stops running —
  [task 03](03-prevent-realm-configuration-drift.md). This task creates that
  problem; that one answers it.
- Enabling registration ([task 05](05-self-registration-with-email-verification.md)).

## Constraints

- **Production mode is not a drop-in swap.** `kc.sh start` refuses to boot
  without either `--hostname` or `--hostname-strict false`, and defaults to
  requiring HTTPS — a local HTTP stack needs `KC_HTTP_ENABLED=true` set
  deliberately. `start-dev` supplied both implicitly.
- `KC_HOSTNAME` must stay Keycloak's **public** address and must keep matching
  `AUTH_KEYCLOAK_ISSUER`. [ADR-0025](../../adr/0025-authjs-valkey-adapter.md)
  records three separate live failures caused by getting this wrong, one of
  which broke sign-in outright while leaving the container healthy.
- The backend reaches Keycloak at the **internal** address for JWKS and the
  frontend at the internal origin via `customFetch`
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md),
  ADR-0025). The two-address split survives this change unchanged.
- `--import-realm` **skips a realm that already exists**, so the second boot
  against a populated database imports nothing. Any verification has to start
  from an empty volume (`docker compose down -v`), and "the container came up"
  proves nothing ([backlog](../backlog.md) records this trap).
- Ports 5432 and 8080 are already taken in the local stack
  (`docker-compose.yml`), and worktrees collide on them
  ([CLAUDE.md](../../../CLAUDE.md) environment notes).

## Open questions

**None.**

Resolved during refinement (2026-09-05), recorded as Constraints above and
below:

1. **Own PostgreSQL container, or a second database in the existing one?**
   Decided: a second database inside the existing `postgres` service. Cheaper,
   one fewer service and volume; acceptable because this is local-stack-only
   (see Non-goals) rather than a deployment.
2. **Stock Keycloak image, or a `Dockerfile` with `kc.sh build --optimized`?**
   Decided: the optimized build, from this task rather than deferred — matches
   documented production practice from the start rather than adding a second
   migration of the image later.
3. **What happens to `testuser`?** Decided: it stays, as a seeded manual/demo
   account a developer can sign in with directly — but it is **no longer a
   credential baked into the committed realm file**. It is seeded via the same
   idempotent create-if-not-exists mechanism [task 02](02-parameterise-realm-configuration.md)
   and [task 09](09-deterministic-test-accounts.md) use for e2e accounts
   (`frontend/e2e/support/keycloakAccount.ts`'s pattern, generalised), not a
   `credentials` block in `realm-export.json`. This was checked against the
   current code rather than assumed: [iteration 6 task
   11](../iteration-6/11-e2e-suite-account-contention.md) already moved the
   Playwright suite entirely onto dynamically-provisioned `e2e-worker-N`
   accounts — `grep -rn testuser frontend/e2e/` finds nothing — so this task's
   AC2 (`sub` stability across a restart) now targets this seeded demo
   account, not a suite dependency.
4. **Does `sslRequired: none` stay?** Not this task's decision to make — see
   [task 02](02-parameterise-realm-configuration.md), which keeps it an
   environment-varying value with local staying HTTP. Not a blocker here.
5. **Should a persistent `sub` change ADR-0033?** Decided in
   [task 08](08-revisit-account-linking.md):
   `allowDangerousEmailAccountLinking` stays, for the narrower residual case
   (an admin deleting and recreating a Keycloak user with the same email).
6. **Does anything need to survive `down -v`?** Decided: no. Consistent with
   [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md) treating a
   volume wipe as an ordinary, expected step pre-deployment — a
   `docker compose down -v` resets Keycloak's persisted state the same way it
   resets Postgres's.

## Acceptance criteria

- [ ] A user created through Keycloak's admin console is still there and can
      still sign in after `docker compose restart keycloak` and after
      `docker compose down && docker compose up` — verified in a browser
      against the running stack, not by reading configuration
- [ ] `testuser`'s Keycloak `sub` is byte-for-byte identical before and after
      that restart cycle, checked against the token the backend receives — the
      instability [ADR-0033](../../adr/0033-keycloak-account-relinking.md)
      documents is gone
- [ ] The full Playwright suite passes against the changed stack, from an
      empty volume (`docker compose down -v` first), on a machine that has
      never run it
- [x] An automated check fails if Keycloak comes up serving a realm that
      rejects sign-in — a healthy container is not the assertion
- [x] `(cd backend && mvn verify)` and `(cd frontend && npm test)` stay green

## Notes

Prompted by a sign-up options analysis on 2026-08-29, which found this to be
the first real blocker rather than any question about the sign-up form itself.

Related [backlog](../backlog.md) entries: "Deployment target + IaC", which
this does not close, and "The Keycloak realm export is hardcoded to
localhost", which [task 02](02-parameterise-realm-configuration.md) does.

Implementation opened as a PR with AC1–AC3 unchecked (2026-09-05): the
sandbox this was implemented in cannot pull `maven:3.9-eclipse-temurin-25-noble`
(backend's build-stage base image) or any other not-yet-cached image —
`docker pull hello-world` hangs the same way, and survives a Docker Desktop
restart — so the full stack (frontend+backend) never came up locally. AC4
and AC5 don't need it and are verified. AC1 and AC2 explicitly require a
browser against the running stack / the token the backend receives, so they
need a manual pass once Docker access is available, in this sandbox or
elsewhere; AC3 needs a working `docker compose build backend`, which CI has
(normal internet access) even where this sandbox didn't. The persistence
mechanism itself was independently verified against Keycloak's admin REST
API directly (restart and full `down`/`up` cycles, `testuser`'s user id
byte-identical across both, `down -v` genuinely resetting it, the seed
script racing and winning against Keycloak's transient post-healthcheck
"Bootstrap in progress" 503).
