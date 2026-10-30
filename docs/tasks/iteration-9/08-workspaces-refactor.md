# Task 08: The repository is npm workspaces, with the web app in `web/`

- **Status:** needs-refinement
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
lockfile. No behaviour changes. `mobile/` and the packages themselves arrive
with tasks 11 and 09; this task leaves `packages/` empty or absent.

## Non-goals

- Shared packages — [task 09](09-shared-packages.md).
- `mobile/` — [task 11](11-app-skeleton.md).
- Any dependency upgrade riding along with the move.

## Constraints

- [Task 03](03-decision-repo-layout-and-code-sharing.md)'s ADR, once accepted.
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

## Open questions

The layout questions were answered at refinement on 2026-10-30 (Constraints)
and recorded in [ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md). Two points that ADR leaves
to this task, to settle when it is refined:

1. **Can the web image's `npm ci` be scoped to the web workspace** (and the
   packages it uses), or does one root lockfile make it install every
   workspace's dependencies, `mobile/`'s included? Verify by running it; if it
   cannot, say what the image build costs instead.
2. **Standalone output.** Next.js traces files from the project directory by
   default, so `outputFileTracingRoot` has to include `packages/` and the
   image has to be run to prove the pages still serve (Next.js docs, `output`).

The task stays `needs-refinement`: only the product owner moves it on.

## Acceptance criteria

- [ ] `web/` holds the web app, the root `package.json` declares the
      workspaces, and no tracked file outside history references
      `frontend/` except where refinement allows it — checked by a `grep` in
      the PR description
- [ ] The web's Vitest and Playwright suites are green against the moved
      tree, and `make verify` passes
- [ ] CI's path filters, Dependabot and the Trivy manifest scan cover the new
      paths — each confirmed by a run that touched `web/`
- [ ] `node scripts/check-links.mjs` and `make verify-fast` are green

## Notes

Provenance: [backlog](../backlog.md#mobile-client) decision 4.
