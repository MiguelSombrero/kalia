# Task 22: Each worktree can run its own stack at the same time as another

- **Status:** needs-refinement
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

- Running two stacks on one set of addresses through a shared reverse proxy.
  Unless refinement chooses that answer, it stays out of scope.
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

## Open questions

- **Ports or host names?** One option is a port per service per worktree. The
  other is one host name per worktree, `<worktree>.localhost`, keeping today's
  ports behind it. A separate host name also fixes the cookie collision, but it
  only works if everything that dials it resolves `*.localhost`. Chrome does;
  Node, curl and Java on macOS need checking. Ports keep cookies colliding in
  one browser. Is "use a separate browser profile per worktree" an acceptable
  answer to that?
- **Who allocates, and how?** Options: a `make` target writing the worktree's
  `.env`, the `worktree` skill's Start steps, or a deterministic offset derived
  from the worktree's name. How is a clash with an address another stack
  already holds detected?
- **One offset or one variable per service?** Compose has no arithmetic, so
  "offset 100" either means six variables written out, or a generated `.env`.
- **Which services need a host port at all?** The e2e suite reads Valkey and
  Mailpit directly, and a backend run from `mvn` outside Docker dials Postgres
  on 5432. Is it the right moment to stop publishing any of them?
- **Does the choice earn an ADR?** It rejects a credible alternative (ports
  against host names) whose reasons the compose file will not show. Or are the
  task file and the compose comments enough, as with the PR #248 fix
  (local-dev tooling only)?
- **Done signal:** is "two worktrees run `make verify` at the same time, both
  green" the criterion, or is a manual sign-in in each, in one browser, also
  required?

## Acceptance criteria

- [ ] With no port settings in `.env`, the stack comes up on today's addresses
      and the e2e suite passes — verified by running it
- [ ] Two worktrees with their allocated settings run `make verify` at the same
      time, and both are green
- [ ] Changing a worktree's Keycloak address changes the issuer every consumer
      validates against, without editing any other file — verified by a sign-in
      on a non-default address in the e2e suite
- [ ] The e2e suite and `scripts/check-keycloak-realm-config.mjs` read their
      addresses from the environment, falling back to today's defaults
- [ ] CLAUDE.md's environment note, the root README and the `worktree` skill
      say how a worktree gets its addresses, not that they are fixed

## Notes

Raised by the product owner on 2026-10-25: concurrent worktree sessions waiting
for one another to free the stack's ports. Follows PR #248, which isolated the
compose projects and left the ports fixed.
