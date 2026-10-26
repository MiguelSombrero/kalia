# Task 22: Each worktree can run its own stack at the same time as another

- **Status:** refined
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

**Two worktrees cannot both run the stack.** Every service in
`docker-compose.yml` publishes a fixed host port: frontend 3000, backend 8080,
Keycloak 8081, Postgres 5432, Valkey 6379, Mailpit 8025. PR #248 gave each
worktree its own compose project, so containers, networks and volumes no longer
collide, but the ports still do. CLAUDE.md's environment note says to run the
full stack "in one at a time". With parallel sessions in their own worktrees as
the normal way of working, the second session waiting for the first one's
stack, or stopping it, is now a regular wait. It falls on `make verify`, the
e2e suite and every browser check, the gates that need the stack.

**The ports are not only in the compose file.** The host addresses are also
built into the configuration that has to agree on them. Keycloak's public
address (`KC_HOSTNAME`), the issuer the frontend and backend validate against
(`AUTH_KEYCLOAK_ISSUER`, `KEYCLOAK_ISSUER_URI`), the realm's Swagger redirect
URI in `keycloak/realm-export.json`, the e2e suite's origins
(`frontend/e2e/support/origins.ts`, `mailpit.ts`, `valkey.ts`,
`playwright.config.ts` and `sign-in-out.spec.ts`), `Makefile`'s backend health
wait, and the backend's and scripts' localhost defaults all name a port. The
Keycloak issuer values fail silently if they disagree: sign-in breaks with
"unexpected iss" instead of an error at startup.

**A different port is not a different site to the browser.** Cookies are scoped
to a host, not to a port. Two stacks on `localhost:3000` and `localhost:3100`
would share the Auth.js and Keycloak session cookies in one browser and
overwrite each other's sessions. Playwright's isolated browser contexts hide
this from the e2e suite, but not from a manual browser check.

## Scope

Two worktrees can bring up the full stack at the same time on one machine, each
reachable at its own addresses. `make verify`, the e2e suite and a manual
sign-in pass in both at once. A worktree that sets nothing keeps today's
addresses, so CI and the main checkout are unchanged. A new worktree gets its
addresses without anyone having to choose them by hand. The documents that
today say the ports are fixed say how they are assigned instead.

## Non-goals

- Running two stacks on one set of addresses through a shared reverse proxy,
  or giving each worktree its own host name. Refinement rejected both (see
  Constraints).
- Native runs (`npm run dev`, `mvn spring-boot:run`). They keep today's
  defaults and stay one-at-a-time, as the READMEs say; they need no new
  variable or code.
- CI. Each job already runs on its own runner, where the defaults hold.
- How the mobile app reaches a worktree's backend. That is
  [iteration 9](../iteration-9.md)'s decision, and it can follow whatever this
  task settles.

## Constraints

- [ADR-0025](../../adr/0025-authjs-valkey-adapter.md): Keycloak
  has one public, canonical address that every issued token names, plus an
  internal one. A per-worktree address changes the public one, and every
  consumer of the issuer has to change with it.
- [ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md):
  the realm is reconciled from `realm-export.json` on every boot, so a
  per-worktree redirect URI has to come in through its variable substitution.
  `FRONTEND_URL` takes no trailing slash, and
  `scripts/check-keycloak-realm-config.mjs` mirrors the compose defaults.
- [ADR-0015](../../adr/0015-configuration-strategy.md): the backend's
  environment contract names the app's own variables, not Spring properties.
- Every published port stays bound to `127.0.0.1`
  (`docs/architecture.md` §6).
- Each worktree's root `.env` is already its own and gitignored. Nothing
  per-worktree gets committed.
- The compose file must not get a fixed `name:` back (its header comment, and
  PR #248).

Decided in refinement, 2026-10-26:

- **A worktree gets its own host ports, not its own host name.** A host name
  per worktree cannot free the ports: every stack would still bind
  `127.0.0.1:3000`, and only a shared reverse proxy or `sudo` loopback aliases
  avoid that, so there is no host-name option without a proxy. Cookies are
  therefore shared across stacks on `localhost`, in one browser. A manual
  browser check of two stacks uses one browser profile per worktree; the root
  README says so. The e2e suite is unaffected, as Playwright's contexts are
  isolated.
- **One variable per published port, with the public addresses derived from
  them.** Compose has no arithmetic, so `.env` holds `FRONTEND_PORT`,
  `BACKEND_PORT`, `KEYCLOAK_PORT`, `POSTGRES_PORT`, `VALKEY_PORT` and
  `MAILPIT_PORT`. Everything that names a host address is built from those in
  one place each: `KC_HOSTNAME`, `AUTH_KEYCLOAK_ISSUER`, `KEYCLOAK_ISSUER_URI`,
  `AUTH_URL` and `FRONTEND_URL`, and the `kalia-swagger` redirect URI in
  `keycloak/realm-export.json` (a new `$(env:...)` placeholder, defined in
  `scripts/check-keycloak-realm-config.mjs` as well). Unset, each falls back to
  today's value. The container-internal ports (`keycloak:8080`, `backend:8080`,
  `postgres:5432`) do not change, since every stack has its own network.
- **All six services keep a published port.** The e2e suite reads Valkey and
  Mailpit on the host, and the native backend dials Postgres there. Stopping
  the publishing is not part of this task.
- **A make target allocates, not the person.** `make stack-env` writes a
  worktree's ports into its root `.env`, and the `worktree` skill's Start step
  runs it. It takes the lowest slot no other worktree's `.env` holds and whose
  ports it can bind, and slot *n* adds 100×*n* to each default (slot 1:
  frontend 3100, backend 8180, Keycloak 8181, Postgres 5532, Valkey 6479,
  Mailpit 8125; an offset of 1 would put the backend on Keycloak's port). The
  main checkout is slot 0 and the target writes nothing for it. Re-running it
  keeps the ports already written. It finds the other worktrees through
  `git worktree list`, so nothing per-worktree is committed.
- **Every host-side reader gets its addresses from the root `.env`**, falling
  back to today's defaults: the e2e suite, `playwright.config.ts` (including
  its `webServer` URL), `Makefile`'s health wait, the `api-drift` client
  generation, and `scripts/check-keycloak-realm-config.mjs`,
  `check-keycloak-signin.mjs` and `seed-keycloak-account.mjs`. Make does not
  read `.env` by itself, so how each gets it is part of the implementation.
- **No ADR.** The decision touches local-development tooling only, as PR #248
  did; this section, the compose comments and the READMEs carry the reasoning
  ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)).

## Open questions

**None.**

## Acceptance criteria

- [ ] With no port settings in `.env`, the stack comes up on today's addresses
      and the e2e suite passes — verified by running it
- [ ] Two worktrees with their allocated settings run `make verify` at the same
      time, and both are green — verified by running it in both
- [ ] Changing a worktree's Keycloak address changes the issuer every consumer
      validates against, without editing any other file — verified by a sign-in
      on a non-default address in the e2e suite
- [ ] The e2e suite, `playwright.config.ts`, `Makefile`'s health wait and the
      `scripts/` that dial the stack read their addresses from the
      environment, falling back to today's defaults — verified by a search that
      finds no remaining hard-coded `localhost:<port>` outside tests of those
      defaults and the compose fallbacks
- [ ] `make stack-env` has a script test (`node --test`) covering: the main
      checkout gets no ports, a second worktree gets the lowest slot no other
      worktree's `.env` holds, a slot whose port is bound is skipped, and a
      re-run keeps the ports already written — confirmed to fail without the
      script's slot check
- [ ] The realm's `kalia-swagger` redirect URI follows the backend port, and
      `scripts/check-keycloak-realm-config.mjs` fails when it does not — covered
      by its existing script test
- [ ] CLAUDE.md's environment note, the root README (including the
      profile-per-worktree caveat) and the `worktree` skill say how a worktree
      gets its addresses, not that they are fixed

## Notes

Raised by the product owner on 2026-10-25: concurrent worktree sessions waiting
for one another to free the stack's ports. Follows PR #248, which isolated the
compose projects and left the ports fixed.
