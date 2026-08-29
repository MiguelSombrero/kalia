# Task 01: Persist Keycloak's state across restarts

- **Status:** needs-refinement
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

1. **Its own PostgreSQL container, or a second database in the existing one?**
   A separate container is the honest boundary — Keycloak's schema is its own
   and Flyway must never see it — and it is one more service, one more volume
   and one more thing to start. A second database inside the running `postgres`
   service is cheaper and puts an identity store in the same failure domain as
   the application data.
2. **Does the Keycloak image stay stock, or become a `Dockerfile` with
   `kc.sh build --optimized`?** Stock means an implicit build on every boot and
   a slower start; an optimized image is the documented production practice and
   adds a build step to the repo.
3. **What happens to `testuser` once the realm stops reimporting?** It has to
   exist for the Playwright specs on a fresh machine, and it must not become a
   real account with a known password on any future deployment. Seeded on first
   import only, created by a script the developer runs, or something else —
   this is the question [task 09](09-deterministic-test-accounts.md) inherits
   if it is not settled here.
4. **Does the realm's `sslRequired: none` stay?** It is what makes local HTTP
   work and it is exactly wrong anywhere else, so it is an environment-varying
   value — which makes it [task 02](02-parameterise-realm-configuration.md)'s
   business, unless it should block this task instead.
5. **Should a persistent `sub` change anything about
   [ADR-0033](../../adr/0033-keycloak-account-relinking.md)?** Half that ADR's
   justification is the dev stack's reimport churn, which this task ends.
   Flagged here, decided in [task 08](08-revisit-account-linking.md).
6. **Does anything need to survive `down -v`?** If not, say so — the answer
   sets what a developer is expected to lose when they reset the stack, and
   it is better stated than discovered.

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
- [ ] An automated check fails if Keycloak comes up serving a realm that
      rejects sign-in — a healthy container is not the assertion
- [ ] `(cd backend && mvn verify)` and `(cd frontend && npm test)` stay green

## Notes

Prompted by a sign-up options analysis on 2026-08-29, which found this to be
the first real blocker rather than any question about the sign-up form itself.

Related [backlog](../backlog.md) entries: "Deployment target + IaC", which
this does not close, and "The Keycloak realm export is hardcoded to
localhost", which [task 02](02-parameterise-realm-configuration.md) does.
