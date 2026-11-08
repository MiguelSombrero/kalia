# Task 07: One token source generates the web's CSS and the app's theme

- **Status:** refined
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

**Settled at refinement, 2026-11-07 and 2026-11-08** (product owner):

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
- **The app's provisional values reuse the web's existing semantic values and
  dimensions,** with platform-specific font values as the ADR allows; tasks
  [03](03-design-kalias-identity-on-a-phone.md) and
  [04](04-decision-and-design-dark-mode.md) replace the app's values.
- **The generated app theme lives under `mobile/src/lib/design/`.** The
  existing styling checker covers `mobile/src/` as well as the web; tests and
  generated files are exempt.
- **Static design values represented by semantic token families** — colour,
  typography, spacing, radius and motion — are read from the generated theme,
  not written into screens. Runtime values supplied by the platform, such as
  safe-area insets and `StyleSheet.hairlineWidth`, remain allowed; a static
  value the token vocabulary cannot express uses the existing reasoned
  `token-exception` marker.

## Open questions

**None.**

## Acceptance criteria

- [ ] The web's generated custom properties equal `web/app/globals.css`'s
      before this task, token for token after resolving aliases; a test
      compares them, and the web build and Playwright suite are unchanged
- [ ] Generator tests prove drift is detected for source and generated-file
      edits and fresh output passes; invalid aliases, duplicate names,
      missing dark values and wrong-kind values fail with the token named,
      with the package type-check covering missing aliases and modes
- [ ] Generator tests prove platform-only tokens reach only their intended
      outputs, font values reach each platform, units convert as ADR-0107
      specifies, the app theme contains both modes while CSS outputs are light
      only, repeated runs are byte-identical, and Tailwind emits the semantic
      color and type utilities it uses, including opacity
- [ ] Checker fixtures prove each banned styling form fails in both apps and
      a valid `token-exception` passes; adding a semantic token requires no
      checker edit, primitive references still fail, both directions of the
      meaning-row check fail when mismatched, and a failing dark pairing fails
      contrast validation
- [ ] The beer-style variant group generates one web block and one keyed app
      map, with every style passing contrast
- [ ] Keycloak loads the generated stylesheet before `login.css`, rejects a
      color literal in `login.css`, and renders its sign-in page in the same
      colors as before
- [ ] The token package's import-boundary test rejects imports from either app
      and from `react-dom`, `next` or `react-native`, and
      `.claude/settings.json` denies edits to every generated output
- [ ] No static design value in `mobile/src` is written outside the generated
      semantic theme and documented exemptions; platform runtime values remain
      allowed, and `make verify-fast` runs the checks
- [ ] `docs/architecture.md`, the mobile README and `docs/design.md` describe
      the pipeline, and no document still says styling is plain `StyleSheet`
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Token pipeline").
