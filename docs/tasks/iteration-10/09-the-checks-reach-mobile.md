# Task 09: The repository's own checks reach `mobile/` as they reach `web/`

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

Two of the repository's guards stop at the edge of the app:

- The code-comment policy
  ([ADR-0017](../../adr/0017-code-comment-policy.md)) does not reach
  `mobile/`. `scripts/check-comments.mjs` scans `backend/src`, `web/` and
  `packages/`, and the `paths` of
  [`.claude/rules/code-comments.md`](../../../.claude/rules/code-comments.md)
  name the same, so a comment written in the app is held to neither the hard
  tier nor the rule an agent reads on opening a file (SHOULD-94). Iteration 9
  task 07 named only the links and raster-image checks.
- Dependabot's one npm entry bumps `mobile/`'s Expo-managed packages
  (`react-native`, `expo-router`, the `expo-*` set) one at a time, while an
  SDK's packages only work as the set `npx expo install --check` names. A lone
  bump passes lint and Jest and breaks the native build (COULD-101).

This iteration writes more app code than iteration 9 did, and the first
Dependabot PR against an Expo package is due any week.

## Scope

A comment in `mobile/src` is checked as one in `web/` is, and loads the same
rule for an agent; Dependabot never proposes an Expo-managed package on its
own.

## Constraints

- ADR-0017 and its checker; the rule file's `paths` are what load it
  ([ADR-0035](../../adr/0035-agent-context-layout.md)).
- `npx expo install --check` also reports `react` and `typescript` off the
  SDK's versions, both deliberately the web's (COULD-101); the grouping must
  not drag them to the SDK's.
- The native build is checked by the required Android end-to-end job
  ([ADR-0096](../../adr/0096-mobile-unit-tests-run-on-jest-and-end-to-end-flows-on-maestro-with-android-the-only-ci-platform.md)),
  which is what would catch a broken grouped bump.

**Decided at refinement, 2026-11-01** (product owner):

- **Dependabot ignores the Expo-managed packages.** They move only with a
  deliberate SDK upgrade done by `npx expo install --fix`, because a grouped
  bump still may not match the SDK's set. A CVE in one still fails the
  vulnerability gate ([ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md)),
  which is what forces a fix between upgrades. `mobile/README.md` says how an
  SDK upgrade is done.
- **Every comment the widened check flags is fixed in this task;** one that is
  not a one-line fix is filed in the quality backlog and named in the PR.

## Open questions

**None.**

## Acceptance criteria

- [ ] `scripts/check-comments.mjs` scans `mobile/src`, and its test covers a
      mobile file
- [ ] `.claude/rules/code-comments.md`'s `paths` include `mobile/src`
- [ ] `.github/dependabot.yml` ignores the Expo-managed packages, and
      `react` and `typescript` are not among those ignored
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-94 and COULD-101.
