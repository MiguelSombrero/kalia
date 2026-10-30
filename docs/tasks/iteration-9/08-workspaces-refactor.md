# Task 08: The repository is npm workspaces, with the web app in `web/`

- **Status:** done
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-4

## Why

[Task 03](03-decision-repo-layout-and-code-sharing.md) decides the layout; this
task moves the repository into it. Shared packages cannot exist before the
workspace does, and the `frontend/` → `web/` rename is cheapest now, while
every path in CI, the Dockerfile, compose, the Makefile and the docs is being
touched anyway.

The risk is entirely silent breakage: a path that still says `frontend/` in a
workflow filter, a Dependabot directory or a Trivy manifest list does not fail
— it stops checking.

## Scope

The repository is the layout [ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md) decides: plain npm
workspaces over `web/`, `mobile/` and `packages/`, with the web app moved from
`frontend/` to `web/`, the one lockfile at the root and a root `package.json`
declaring the workspaces. Every consumer of the old path follows — CI, the
Dockerfile and compose (service and image renamed `web`), the Makefile, the
check scripts, Dependabot, Trivy's manifest scan, `.claude/settings.json`, the
nested `CLAUDE.md` and the docs. The web's Docker build moves to the repository
root as its context, because the lockfile and `packages/` are outside `web/`.
CI's change filter also matches `packages/`, the root `package.json` and the
lockfile. Every `frontend` name in configuration follows the paths, the
Keycloak client `kalia-frontend` included, and so do the places that spell the
compose service's name out: the realm's back-channel logout URL and the edge's
upstream. No behaviour changes beyond those names. `mobile/` and the packages
themselves arrive with tasks 11 and 09; this task leaves `packages/` empty or
absent.

## Non-goals

- Shared packages — [task 09](09-shared-packages.md).
- `mobile/` — [task 11](11-app-skeleton.md).
- Any dependency upgrade riding along with the move.

## Constraints

- [ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md),
  [task 03](03-decision-repo-layout-and-code-sharing.md)'s decision.
- **This Next.js version postdates model training** — check
  `web/node_modules/next/dist/docs/` (after the move) before relying on memory
  about workspaces or `transpilePackages` (`CLAUDE.md`).
- Each worktree runs its own compose project on its own ports (`make
  stack-env`); the rename must not reintroduce a fixed project name.
- [ADR-0089](../../adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md):
  the base compose file still demands every secret.

**Decided at refinement, 2026-10-30** (product owner):

- **The compose service and image are renamed `web` too,** per
  [task 03](03-decision-repo-layout-and-code-sharing.md), so the edge
  proxy's upstream and every `docker compose` command in the READMEs follow.
- **Every link to a `frontend/` path is rewritten, including in accepted
  ADRs and finished task files** — a mechanical path fix, not an amendment.
  The word `frontend/` may stay only as history: in the prose of accepted
  ADRs, finished task files, and rows of `docs/common-failures.md` and
  `docs/ci-playbook.md`. Those are the exceptions the `grep` in the first
  criterion allows.
- **The `git mv` is its own commit,** before any edit, so `git log --follow`
  and review both see a pure rename.
- **"No behaviour change" is proven** by the web's Vitest and Playwright
  suites green against the moved tree, and the Docker image built from it
  serving the same pages.

**Decided in the second pass, 2026-10-30** (product owner), after
[ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)
was accepted:

- **Every `frontend` name in configuration is renamed, the Keycloak client
  included.** The client `kalia-frontend` becomes `kalia-web`, and with it
  `KALIA_FRONTEND_CLIENT_SECRET` becomes `KALIA_WEB_CLIENT_SECRET`,
  `AUTH_KEYCLOAK_ID`'s value follows, `FRONTEND_PORT` and `FRONTEND_URL`
  become `WEB_PORT` and `WEB_URL`, the Makefile's `frontend-*` targets become
  `web-*`, CI's job and output names follow, and so do the edge's rate-limit
  zone and the `kalia-frontend` image the vulnerability scan names. Renaming
  only the paths, service and image was rejected because it leaves
  `FRONTEND_*` beside a service called `web`; keeping the OAuth client was
  rejected because "one name for one thing" was the reason for the rename. A
  client is a registered identity, so this is a realm change, accepted
  because the web is its only consumer and nothing is deployed. Sign-in
  itself behaves as before.
- **A compose service name is also a DNS name.** The realm's
  `backchannel.logout.url` is `http://frontend:3000/...` and the edge's
  upstream is `http://frontend:3000`, so renaming the service without them
  stops sign-out reaching the web and the edge reaching it, without failing a
  build.
- **Prose follows too, in living documents.** "The frontend" in the root
  README, `CLAUDE.md`, `docs/architecture.md`, the glossary and the READMEs
  becomes "the web app" where it means the Next.js app, because a mobile app
  makes "the frontend" ambiguous. Accepted ADRs, finished task files and the
  rows of `docs/common-failures.md` and `docs/ci-playbook.md` keep the old
  word as history. A `grep` can only check `frontend/` with its slash, so
  prose is checked by reading.
- **The web image installs with `npm ci --workspace web`.** Run in a scratch
  workspace of a web app, a second app and a package, it installed the web's
  dependencies and the package's and left the second app's out, with or
  without that app's `package.json` in the Docker context. The Dockerfile
  therefore copies only the root `package.json` and lockfile,
  `web/package.json` and `packages/*/package.json` before installing. This
  was read with the local npm, not the image's; the image build is the proof.
- **`outputFileTracingRoot` is set to the repository root,** because Next.js
  traces from the project directory by default and a file outside it, such as
  a package under `packages/`, is left out of the standalone output
  (`output` in the Next.js documentation). Where `server.js` lands in the
  standalone output then depends on that root, so the Dockerfile's copy paths
  and `CMD` follow whatever the build produces, and the running image serving
  the pages is the proof.
- **A root `.dockerignore` keeps the web image's build context to what the
  image needs.** The context widens to the whole repository
  ([ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)),
  and without it the backend's build output, every `node_modules` and `.git`
  are sent and can invalidate the image's cache.
- **No dependency changes version.** The root lockfile resolves every
  existing dependency to the version `frontend/package-lock.json` has,
  compared before and after (`npm ls --all`).
- **A stack that already exists converges.** After the rename, `make up` on a
  stack with a Keycloak volume from before ends with the realm drift check
  green and no `kalia-frontend` client left, or the task states the one
  command that removes it. Whether keycloak-config-cli removes a client the
  file no longer lists is not known and is found by running it.
- **An old `.env` fails loudly.** A worktree's `.env` carrying
  `KALIA_FRONTEND_CLIENT_SECRET` or `FRONTEND_PORT` must not fall back to a
  default silently: the secret is already required with a message pointing at
  the README, and `make stack-env` replaces the old port and URL keys.
- **This task lands alone.** No other branch touches `frontend/` while it is
  open, and the `git mv` commit comes first so that others rebase over a pure
  rename.

## Open questions

**None.** The two points [ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)
left to this task, scoping the image's install and the standalone output's
tracing root, were settled by running them and are recorded in Constraints.
The refinement also found the names that are not paths, which the product
owner decided.

## Acceptance criteria

- [x] `web/` holds the web app, the root `package.json` declares the
      workspaces, and no tracked file outside history references
      `frontend/` except where refinement allows it — checked by a `grep` in
      the PR description
- [x] No tracked file outside history names `kalia-frontend`,
      `KALIA_FRONTEND`, `FRONTEND_PORT`, `FRONTEND_URL` or the `frontend`
      compose service, checked by a `grep` in the PR description, and the
      living documents' prose was re-read for "the frontend"
- [x] The web's Vitest and Playwright suites are green against the moved
      tree, including the specs for sign-in, sign-out and back-channel logout,
      and `make verify` passes
- [x] The web image builds from the repository root with
      `npm ci --workspace web`, serves the same pages as before when run, and
      `docker build` sends a context limited by the root `.dockerignore`
- [x] The root lockfile resolves every existing dependency to its previous
      version, compared before and after
- [x] On a stack created before the rename, `make up` ends with the realm
      drift check green and the old client gone, or the PR states the command
      that removes it; a `.env` with the old secret or port keys fails loudly
- [x] CI's path filters, Dependabot and the Trivy manifest scan cover the new
      paths, and Dependabot's `react` and `react-dom` grouping still applies —
      each confirmed by a run that touched `web/`
- [x] `node scripts/check-links.mjs` and `make verify-fast` are green

## Notes

Provenance: [backlog](../backlog.md#mobile-client) decision 4.

The scoped install cannot be shown to leave another workspace's dependencies
out of the image until a second workspace exists. [Task 09](09-shared-packages.md)
adds the first package and [task 11](11-app-skeleton.md) adds `mobile/`, so the
check that the web image carries none of the app's dependencies is task 11's.
