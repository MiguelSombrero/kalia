# Task 07: The process carries a third codebase

- **Status:** refined
- **Iteration:** [9](../iteration-9.md)
- **Covers:** none

## Why

This project's first goal is its process, and the process assumes two apps.
`CLAUDE.md` names `backend/` and `frontend/`; each carries a nested
`CLAUDE.md` importing its README ([ADR-0035](../../adr/0035-agent-context-layout.md));
[architecture.md §5](../../architecture.md) is "Frontend design", singular; the
check scripts, `make verify` and CI cover two suites; the doc-sync gate in
`implement-task` lists two READMEs. A third codebase added without changing any
of that is one the gates do not see, and the [backlog](../backlog.md#mobile-client)
ranks this above the feature for that reason.

`CLAUDE.md` also has to gain two rules only it can hold: the Expo "check the
docs, not memory" warning — Expo and React Native postdate model training as
Next.js does, and guessing fails just as silently — and the constraint that
Kalia adds no cost.

## Scope

`mobile/` is a first-class part of the process: its own `CLAUDE.md` and
`README.md`, its own place in the architecture document, the doc-sync gate and
the check scripts that apply to it, `/quality-sweep`, and `CLAUDE.md` carrying
the two new rules.

## Non-goals

- The onboarding content of `mobile/README.md` —
  [task 10](10-developer-environment.md); this task creates the file and its
  conventions sections.
- Mobile lint, type check and unit tests in `make verify-fast`, `make verify`
  and CI — [task 11](11-app-skeleton.md), which creates the app they check.
- The native end-to-end flow in CI — [task 15](15-walking-skeleton-slice.md).
- Making room in `CLAUDE.md` — [task 01](01-claude-md-regains-its-headroom.md).

## Constraints

- [ADR-0035](../../adr/0035-agent-context-layout.md): a nested `CLAUDE.md`
  imports its README and is not re-injected after `/compact`, so the Expo
  warning lives in the root file too.
- [ADR-0020](../../adr/0020-documentation-roles.md): ADRs say why,
  `architecture.md` shape, READMEs how.
- [ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md): one gate;
  `make verify-fast` stays free of Docker and builds.
- Depends on [task 01](01-claude-md-regains-its-headroom.md), on the
  decisions in tasks [02](02-decision-the-mobile-stack.md) and
  [06](06-decision-mobile-testing-strategy.md), and on
  [task 11](11-app-skeleton.md) — the Expo warning is worded against the
  `mobile/` that exists.

**Decided at refinement, 2026-10-30** (product owner):

- **This task runs right after [task 11](11-app-skeleton.md)**, and the
  mobile checks in `make verify-fast`, `make verify` and CI moved to task 11,
  which creates the app they check — test-first, in the task that creates
  the behaviour. Splitting this task was rejected as two PRs for one
  process change.
- **§5 becomes "Client design", with web and mobile subsections;** mobile
  points back at the web's where it follows it. No section is renumbered,
  because §6 onwards is linked from across the repository.
- **The links and raster-image checks cover `mobile/` from this task on.**
  The token-only styling check
  ([ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)) waits
  for [iteration 11](../iteration-11.md)'s token pipeline, since plain
  `StyleSheet` is allowed until then; the generated client's read-only path
  in `.claude/settings.json` follows the client into its package in
  [task 09](09-shared-packages.md).
- **`/quality-sweep` covers mobile from now on,** with no mobile-specific
  prompt until a sweep shows one is needed.
- **The no-cost rule applies to the whole project, not only mobile, in the
  product owner's words:** "Kalia adds no cost and puts no payment card on
  file anywhere: no paid account, cloud build, hosting or billed CI minute.
  Anything that needs one is parked in the backlog until the product owner
  decides to spend." The roadmap's and the backlog's mobile-only statements
  of it become pointers to `CLAUDE.md`.

## Open questions

**None.**

## Acceptance criteria

- [ ] `mobile/CLAUDE.md` imports `mobile/README.md`, and the root `CLAUDE.md`
      carries the Expo warning and the no-cost rule within its budget —
      `wc -l CLAUDE.md` at most 200
- [ ] `docs/architecture.md` §5 covers mobile, and the doc-sync gate in
      `implement-task` names `mobile/README.md`
- [ ] The links and raster-image checks scan `mobile/`, each with a test
      proving it catches a violation there
- [ ] `make verify-fast` is green

## Notes

Provenance: [backlog](../backlog.md#mobile-client), "Does the project's own
process scale to a third codebase?".
