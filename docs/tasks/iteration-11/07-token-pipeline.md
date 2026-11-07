# Task 07: One token source generates the web's CSS and the app's theme

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-2

## Why

[Task 06](06-decision-the-design-token-format.md) decides the format; until it
is built the decision protects nothing. The web's tokens are values in
`web/app/globals.css` and the app's are literals in each screen, and styling
outside the semantic layer fails the build only on the web
([ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)). A rule
that holds on one platform is, on the other, an unwritten convention — which is
what ADR-0066 says rules of this kind decay into.

## Scope

The token source of task 06's decision exists as a package; the web's CSS custom
properties and the app's theme are generated from it, with the web rendering
exactly as before. The app's screens read the generated theme, and the token
check of ADR-0066 covers `mobile/` too: a colour, a typeface or a primitive
value written into a screen fails `make check`, `make verify-fast` and CI, with
the same reasoned, visible exception marker.

## Non-goals

- New values: the web is not re-themed, and the app's final values are those
  of tasks [03](03-design-kalias-identity-on-a-phone.md) and
  [04](04-decision-and-design-dark-mode.md).
- The primitives built on the theme — [task 08](08-mobile-ui-primitives.md).

## Constraints

- Whatever [task 06](06-decision-the-design-token-format.md)'s ADR decides binds
  this task, including its answer on Keycloak's stylesheet and on ADR-0073.
- A generated file is read-only to agents (`.claude/settings.json`) and checked
  for drift in `make check`.
- The check stays dependency-free and has a fixture self-test, as its siblings
  do ([ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)); it
  runs where checks run — `make check`, the `pre-push` hook, a CI job and the
  edit-time hook
  ([ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md)).
- Tests, Maestro flows and the generated API client are exempt from the check,
  as on the web.
- [`docs/architecture.md`](../../architecture.md) and the
  [mobile README](../../../mobile/README.md) both say "plain `StyleSheet` until
  iteration 11"; they are rewritten here, not left to a later sweep.

**Settled at the 2026-11-07 refinement** (product owner); the task is refined
once [task 06](06-decision-the-design-token-format.md)'s ADR lands, with the
tests that ADR lists:

- **This task lands before the design tasks 02–05,** with the web's values as
  they are and the app's provisional ones, which tasks
  [03](03-design-kalias-identity-on-a-phone.md) and
  [04](04-decision-and-design-dark-mode.md) replace; the token and contrast
  checks therefore cover the app from this task on.
- **The source has a light and a dark mode;** the app follows the system
  ([task 04](04-decision-and-design-dark-mode.md)), and the web uses the
  light one.
- **Keycloak's `login.css` custom properties are generated** from the same
  source, and ADR-0073 stands
  ([task 06](06-decision-the-design-token-format.md)).

## Open questions

- **Domain.** The app's provisional values before task 03: the web's semantic
  values, or today's literals given token names.
- **Module boundaries.** Where the generated theme lives in `mobile/` and which
  directories the check reads; whether the one script checks both apps or each
  has its own.
- **Edge cases.** Values the app genuinely needs that are not tokens — a
  hairline width, a safe-area inset — and how the exception marker or the
  vocabulary covers them.
- **Completion signals.** What proves the web is unchanged: the generated CSS
  compared with today's, or the contrast checker and the Playwright suite
  alone.

## Acceptance criteria

- [ ] The web's generated custom properties equal `web/app/globals.css`'s
      before this task, value for value — a test compares them, and fails when
      a token in the source changes without regenerating
- [ ] A fixture test for the check shows each banned form in a `mobile/` file
      failing it and an excusing marker passing, and the check fails against
      a screen that writes `#ffffff`
- [ ] No colour or typeface literal remains in `mobile/src` outside the
      exemptions, and `make verify-fast` runs the check
- [ ] `docs/architecture.md`, the mobile README and `docs/design.md` describe
      the pipeline, and no document still says styling is plain `StyleSheet`
- [ ] `make verify-fast` is green, and the web's Playwright suite is unchanged

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Token pipeline").
