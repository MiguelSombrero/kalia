# Task 09: A failing end-to-end test names its trace, and CI keeps the telemetry

- **Status:** done
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-5

## Why

A red Playwright test says what the browser saw: a heading that never appeared,
a toast with the wrong text. Why it happened is in the server's telemetry, and
today the link between the two is a person reading timestamps. In CI it is
worse: the stack is gone when the job ends, and what it logged is whatever the
job printed. The [CI playbook](../../ci-playbook.md)'s Playwright section
diagnoses a red run from Playwright's own message and the `[WebServer]` lines
of the stack's startup, because nothing else survives the job.

## Scope

A failing Playwright test's report names the trace ids of the requests the page
made, so the failure leads to its trace locally through tasks 07 and 08. A red
end-to-end job in CI runs with the profile on and uploads what it stored as an
artifact that an agent can load into a local profile and query the same way.

## Non-goals

- Maestro's mobile flows; the app's requests carry a trace id already
  ([ADR-0098](../../adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)).
- Uploading telemetry from a green run.

## Constraints

- Playwright's browser contexts stay isolated, so two worktrees' suites still
  run at once.
- **An uploaded artifact holds no secret**: the CI stack's values are dev-only,
  but a captured header or cookie is still a token
  ([ADR-0013](../../adr/0013-logging-conventions.md)); the guard is a test.
- Every action is SHA-pinned with its tag in a trailing comment
  (`make action-pins`).
- A CI change is listed in [the CI playbook](../../ci-playbook.md) where it
  changes what a red run leaves behind.
- **Decided at refinement (2026-11-15):**
  - CI runs the profile on every Playwright end-to-end run, and uploads the
    store only when the job is red
    ([task 01](01-decision-the-local-observability-stack.md)). A green run
    pays the profile's startup, which the pull request measures and the CI
    playbook states, and keeps nothing.
  - The store's volume is uploaded as a tarball and kept for seven days. It
    loads back into the same `otel-lgtm` version, and the playbook names that
    version.
  - A failing test's trace ids appear both as an attachment in the HTML
    report and as one line in its failure output.
  - Playwright only. The Maestro flows stay out.

## Open questions

**None.**

## Acceptance criteria

- [x] A deliberately failing Playwright test's report names the trace id of
      the page's backend request, and task 08's command prints that request —
      verified by running both
- [x] A CI run on this branch with a deliberately failing test uploads the
      telemetry, and loading it into a local profile shows that test's trace;
      a green run on this branch uploads nothing, and the pull request states
      the profile's startup cost from those runs
- [x] A test fails if the uploaded telemetry holds an `Authorization` header or
      a session cookie, and was seen to fail on a capture that included one
- [x] The CI playbook says how to load a red run's telemetry, and
      `make verify-fast` is green
