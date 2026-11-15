# Task 19: A known transient CI failure is retried or prevented, not re-run by hand

- **Status:** done
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

Three kinds of failure have turned required checks red when nothing in the
change caused them. Each is fixed today by a manual re-run:

- **Maven Central has failed `dependency:go-offline`** in four runs over
  about two days (`dev` run 41076206163 on 2026-10-30; runs 41281600049,
  41281630568 and 41283077204 on 2026-11-01, all `Non-resolvable parent
  POM`). Only `mobile-e2e` retries the backend image's build
  (`ci.yml`, around line 395). `vulnerability-scan.yml`'s "Build the image"
  step is part of a required check and runs `docker compose … build` once,
  and the playbook's vulnerability-scan section has no entry for it. The
  playbook's E2E entry says to fix something once the same artifact fails
  again, and that has now happened.
- **Trivy's Java DB mirror** (`mirror.gcr.io/aquasec/trivy-java-db:1`)
  returned a 404 twice on 2026-10-25, on `dev` and on PR 421, and failed the
  image scan without scanning anything
  ([ci-playbook](../../ci-playbook.md#vulnerability-scan)).
- **`docker compose up --wait` fails when it names a one-shot service**, or
  names no service and so includes every one-shot. On the runner it failed
  every time (`container kalia-keycloak-seed-1 exited (0)`, the 2026-10-31
  `mobile-e2e` row in [common-failures](../../common-failures.md)). Locally,
  Compose races and exits `1` on a container that exited `0`
  ([ci-playbook](../../ci-playbook.md#not-ci-but-the-same-recognition-problem)).
  Every `--wait` in the repository names its services today, but nothing stops
  the next one from leaving them out.

Iteration 12 adds cellar flows to `mobile-e2e`, which builds the backend image
on every run. A required check that goes red without cause trains everyone to
re-run instead of reading the failure.

## Scope

- Every step that builds the backend image retries a registry failure the same
  way, in the workflows and wherever a local gate builds it.
- Trivy can fall back to a second Java DB repository.
- `make check` fails a `docker compose up --wait` that does not name only
  long-running services, in the `Makefile`, a workflow or a script.
- `docs/ci-playbook.md` has an entry for each case, and a case that no longer
  needs a manual step loses that step.

## Non-goals

- Retrying a failed test or Maestro flow. A retry there would hide a flaky
  test ([ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)).
- A dependency cache or mirror of Kalia's own.

## Constraints

- **The vulnerability scan is a required check**
  ([ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md)). A retry
  may repeat a fetch, but it must never turn a finding into a pass.
- **A GitHub Action is pinned by commit SHA.** Whether the pinned
  `trivy-action` (v0.36.0) and the Trivy it runs accept more than one Java DB
  repository is confirmed from its own documentation or output, never from
  memory. If it needs a newer action, that is the batched dependency
  question ([CLAUDE.md](../../../CLAUDE.md)).
- **One retry shape.** Today's inline `for attempt in 1 2 3` loops in
  `ci.yml` are replaced by the shared script decided below, never kept
  beside it. A second shape is a second thing to keep in step.
- `scripts/check-compose.mjs` already parses Compose files and has a test
  file. The new rule goes there, with fixtures.
- **Decided at refinement (2026-11-15):**
  - The retry is one shared script with a `node --test` test beside it,
    called by the workflows and the `Makefile`. It replaces the inline
    `for attempt in 1 2 3` loops, so there is still one retry shape.
  - It retries only when the build's output carries a registry signature:
    `Non-resolvable parent POM`, `Could not transfer artifact`, a `5xx` from
    the registry, or a reset connection. Any other failure, a compile error
    among them, fails at once.
  - `ghcr.io/aquasecurity/trivy-java-db:1` is the second Java DB repository,
    tried after the mirror, if the pinned Trivy accepts it.

## Open questions

**None.**

## Acceptance criteria

- [x] A `check-compose.test.mjs` case fails a `--wait` with no service names
      and one that names `keycloak-seed`, and the repository's own `Makefile`,
      workflows and scripts pass
- [x] The retry script's test shows it retrying output that carries each
      registry signature and failing at once on a compile error
- [x] Every step that builds the backend image calls the script, and no
      inline retry loop is left in the workflows
- [x] The image scan names a second Java DB repository, confirmed accepted by
      the pinned Trivy from a run's output on this branch
- [x] `docs/ci-playbook.md`'s vulnerability-scan and E2E entries describe what
      now happens on its own, and `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-112, COULD-113 and
COULD-127.
