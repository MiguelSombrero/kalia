# Task 17: CI blocks a merge that fails it, and the Docker gate runs

- **Status:** in-progress
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

**No CI check blocks a merge.** The repository's one ruleset (19027809) has
no `required_status_checks`, and `dev` has no branch protection. In the ten
days before 2026-10-24 alone, #371 and #373 merged with the CVE scan red on a
CRITICAL Next.js RCE (GHSA-673q-mjm6-r5xr), #388 with it red on the zod CVE,
#382 with E2E cancelled, and #386, #390 and #392 with E2E red; `dev` went red
after #377 and #386. Earlier, #233, #234, #240 and #248 did the same. #343
asked for "Heading check" to be required and nothing changed.
[ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md) treats CI as
the backstop, but GitHub enforces none of it.

**The Docker half of `make verify` is routinely not run.** Fixed host ports
(`docker-compose.yml:39, 78, 98, 145, 234, 252`) plus one worktree per
session mean a second stack cannot come up. #211, #224, #226, #245, #250, #256,
#268, #295, #362, #381, #382, #384 and #385 skipped or split it, and in #315
the product owner had to stop another stack. `implement-task` already lets
`verify-fast` stand in, contradicting CLAUDE.md's "`make verify` green before a
PR".

**Known CI failures have no mechanism.** A quay.io `503` pulling
`keycloak/keycloak:26.7.0` turned E2E red in #386, #390 and #392 (one outage),
reported as `Process from config.webServer was not able to start`. The backend
job already retries its image pull (`.github/workflows/ci.yml:143-150`); the E2E
and Keycloak jobs do not, and `docs/ci-playbook.md` has no entry.
`profile-visibility.spec.ts` failed or flaked in six PRs and took five weeks to
diagnose (#328: the optimistic update confirms before the save returns), with
no playbook entry either. Once, axe reported `document-title` on the profile
page after a save, not reproduced since.

## Scope

A PR whose required checks fail cannot merge into `dev`, and checks the
`changes` filter skips still count as passing. The Docker-backed checks run
before every PR, by whichever route the product owner chooses, and CLAUDE.md
and `implement-task` agree on it. The known recurring failures are retried or
recognisable.

## Non-goals

- Fixing the profile-visibility race itself, unless it still flakes — the
  playbook entry is the gap recorded.

## Constraints

- **The ruleset is the product owner's.** An agent proposes the required
  checks; the product owner makes the change on GitHub.
- [ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md): `make
  verify` is the gate; changing what stands in for it is an amendment.
- Each worktree's compose project is already isolated; only host ports
  collide (CLAUDE.md "Environment notes").
- `docs/ci-playbook.md` entries name the run they came from.

**Decided at refinement, 2026-10-24** (product owner):

- **One summary job is required.** A final `ci-passed` job needs every job and counts a path-filtered skip as success; the ruleset requires it and the vulnerability scan, so new jobs are covered without a ruleset change. The product owner makes the ruleset change on GitHub.
- **CI is the Docker gate.** Locally, `make verify-fast` is the gate before a PR; CI runs the Docker-backed checks and, being required, blocks the merge. CLAUDE.md, `implement-task` and ADR-0046 are amended to say so. Per-worktree ports and a stack lock were rejected.
- **The E2E and Keycloak jobs pre-pull compose images** with the backend job's existing retry loop, and `docs/ci-playbook.md` records the quay.io signature.

## Open questions

**None.**

## Acceptance criteria

- [ ] A PR with a failing required check shows "Merging is blocked" — confirmed
      on a scratch PR whose test is made to fail, after the product owner's
      ruleset change
- [ ] A PR whose changes skip a job can still merge — confirmed on a docs-only
      scratch PR
- [x] CLAUDE.md, `implement-task` and ADR-0046 all name `make verify-fast` as
      the local gate and the required CI checks as the Docker gate
- [x] The E2E and Keycloak jobs pre-pull their images with a retry, and the
      playbook has entries for the pull failure and
      the profile-visibility flake
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-56, SHOULD-57,
COULD-67, COULD-54 and COULD-27. Merged because each is a way a red result
reaches `dev` or a check is not run.
