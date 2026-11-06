# Task 10: The process tells an agent when to read the telemetry

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-4

## Why

A tool an agent is not told about is a tool it does not use: a session starts
from `CLAUDE.md` and the skill it invokes, and neither says today that a
request can be followed by its trace. Without that, the profile and the tools
built in tasks 02–09 are used by whoever remembers them, and the failure log
keeps rows whose cause a trace would have shown.

## Scope

The documents an agent works from say when to start the profile and read the
telemetry — diagnosing a red end-to-end test, a `5xx`, a slow request, an
unexpected failure on the way to a `common-failures.md` row — and point at
tasks 07 and 08's tools rather than restating them.

## Non-goals

- Making the profile part of `make verify` or the pre-push hook.
- A new skill, unless refinement finds the guidance does not fit the existing
  ones.

## Constraints

- `CLAUDE.md` stays under 200 lines, and a bullet there holds only what
  [ADR-0048](../../adr/0048-what-survives-a-claude-md-bullet.md) allows.
- Each fact has one home; every other mention is a one-line pointer
  ([ADR-0020](../../adr/0020-documentation-roles.md)).
- The profile is heavy work under the two-session cap, and the guidance says
  so where it says to start it ([`CLAUDE.md`](../../../CLAUDE.md)).

## Open questions

- **Functional scope.** Which documents: `CLAUDE.md`, the `implement-task` and
  `worktree` skills' "A red check" sections, the CI playbook, the failure log's
  header.
- **Completion signals.** Whether the `/quality-sweep`'s `process-quality`
  dimension counts failure-log rows a trace would have explained.

## Acceptance criteria

- [ ] `CLAUDE.md` and the skills that diagnose a failure point at the profile
      and its tools, and `node --test scripts/` and `make check` are green
- [ ] A fresh session given only a red end-to-end test's output finds its trace
      by following the documents — verified by doing it
- [ ] `make verify-fast` is green
