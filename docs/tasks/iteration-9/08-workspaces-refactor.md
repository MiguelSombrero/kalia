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

## Open questions

1. **What happens to accepted ADRs and finished task files that name
   `frontend/`?** Their links break `check-links`, but an accepted ADR is
   amended, not rewritten — so either the old paths are rewritten as a
   mechanical exception, or links are rewritten and prose left as history.
2. **Does the compose service and image name change too** (`frontend` →
   `web`)? It changes the edge proxy's upstream and every `docker compose`
   command in the READMEs.
3. **One commit for the `git mv`**, separate from the edits, so `git log
   --follow` and review both see a pure rename?
4. **How is "no behaviour change" proven?** The web's unit and Playwright
   suites green against the moved tree, and the Docker image built from it
   serving the same pages.

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
