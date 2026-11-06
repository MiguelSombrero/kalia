# Task 09: A failing end-to-end test names its trace, and CI keeps the telemetry

- **Status:** needs-refinement
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

- Maestro's mobile flows, unless refinement adds them; the app's requests carry
  a trace id already ([ADR-0098](../../adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)).
- Making a green run slower to keep telemetry nobody reads.

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

## Open questions

- **Functional scope.** Whether CI runs the profile on every end-to-end run or
  only re-runs a failure with it; the first costs every run its startup time.
- **Integrations.** How the stored data is exported and loaded back — the
  store's own files, or an export through its API — and how long GitHub keeps
  the artifact.
- **Interaction.** Where the trace id appears: the test's error message, an
  attachment in the HTML report, or both.

## Acceptance criteria

- [ ] A deliberately failing Playwright test's report names the trace id of
      the page's backend request, and task 08's command prints that request —
      verified by running both
- [ ] A CI run on this branch with a deliberately failing test uploads the
      telemetry, and loading it into a local profile shows that test's trace
- [ ] A test fails if the uploaded telemetry holds an `Authorization` header or
      a session cookie, and was seen to fail on a capture that included one
- [ ] The CI playbook says how to load a red run's telemetry, and
      `make verify-fast` is green
