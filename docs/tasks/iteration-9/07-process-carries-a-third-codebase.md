# Task 07: The process carries a third codebase

- **Status:** needs-refinement
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-4

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
Next.js does, and guessing fails just as silently — and the constraint that the
mobile plan adds no cost.

## Scope

`mobile/` is a first-class part of the process: its own `CLAUDE.md` and
`README.md`, its own section in the architecture document, its lint, type check
and unit tests in `make verify-fast`, `make verify` and CI, and `CLAUDE.md`
carrying the two new rules.

## Non-goals

- The onboarding content of `mobile/README.md` —
  [task 10](10-developer-environment.md); this task creates the file and its
  conventions sections.
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
- Depends on [task 01](01-claude-md-regains-its-headroom.md) and on the
  decisions in tasks [02](02-decision-the-mobile-stack.md) and
  [06](06-decision-mobile-testing-strategy.md).

## Open questions

1. **Before or after the app exists?** The planned order puts this ahead of
   the [skeleton](11-app-skeleton.md), but lint, type check and unit tests in
   CI need an app to run against. Split it — documents and `CLAUDE.md` now,
   checks once the skeleton lands — or move it after task 11?
2. **How is §5 split?** Two sections ("Web design", "Mobile design") with the
   shared conventions in a third, or mobile as a subsection pointing back at
   the web's where it follows them?
3. **Which check scripts must learn about `mobile/`?** Candidates: the
   token-only styling check ([ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)),
   the raster-image check (app icons are images), the links check, and
   `.claude/settings.json`'s read-only generated-client path.
4. **Does `/quality-sweep` cover mobile from now on**, and does any of its five
   dimensions need a mobile-specific prompt?
5. **The no-new-costs constraint's wording** — it is a product owner's
   direction, so its exact scope in `CLAUDE.md` is theirs to state.

## Acceptance criteria

- [ ] `mobile/CLAUDE.md` imports `mobile/README.md`, and the root `CLAUDE.md`
      carries the Expo warning and the no-new-costs constraint within its
      budget — `wc -l CLAUDE.md` at most 200
- [ ] `docs/architecture.md` §5 covers mobile, and the doc-sync gate in
      `implement-task` names `mobile/README.md`
- [ ] `make verify-fast` runs the mobile lint, type check and unit tests, and
      fails when a mobile unit test fails — confirmed by breaking one
- [ ] CI runs the same checks as a required job, and `make verify-fast` is
      green

## Notes

Provenance: [backlog](../backlog.md#mobile-client), "Does the project's own
process scale to a third codebase?".
