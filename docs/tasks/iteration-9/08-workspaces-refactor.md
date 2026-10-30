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

The repository is an npm workspace with the web app in `web/`, and every
consumer of the old path — CI, the Dockerfile and compose, the Makefile, the
check scripts, Dependabot, `.claude/settings.json`, the nested `CLAUDE.md` and
the docs — follows. No behaviour changes.

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

**Answered, waiting on an accepted ADR.** Every question raised for this task
was answered at refinement on 2026-10-30 (Constraints). It stays
`needs-refinement` only because [the iteration](../iteration-9.md) has a
decision accepted before the build tasks it binds are refined — here
[task 03](03-decision-repo-layout-and-code-sharing.md)'s. A second pass moves
it once that ADR merges, or reopens a question the ADR contradicts.

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
