# Task 11: Carry the identity into the Keycloak pages

- **Status:** refined
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3

## Why

Kalia's sign-in, registration, email-verification and password-reset pages are
Keycloak's, on Keycloak's origin, styled by a fifty-line stylesheet at
`keycloak/themes/kalia/login/resources/css/login.css`
([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md)). That
stylesheet **hardcodes the palette as hex literals** — `#2f6f5e`, `#24564a`,
`#faf3e9` and `#2b2725` across eight declarations — under a comment that says
they are "the semantic values from `frontend/app/globals.css`".

They are a copy. There is no import, no build step and no check. The moment
[task 03](03-visual-identity.md) changes `globals.css`, that comment becomes
false and those six values become the old Kalia, and **nothing anywhere will
say so**. The app will be one product and its front door will be another, and
the first person to notice will be a stranger signing up.

That is the exact failure class `CLAUDE.md` singles out — a rule whose
violation fails silently — and it is worse here than in the app, because the
Keycloak pages are outside most of the guards Kalia has. They are not in the
Next build, not in `npm test`, and not touched by
[task 05](05-token-only-styling-enforced.md)'s checker. Playwright does reach
them — `frontend/e2e/keycloak-branding.spec.ts` checks their language and
axe-scans the login and registration pages — but only at its one desktop
viewport, and nothing there compares their colours with the app's. They are
also the pages a person meets *before* they
have ever seen Kalia, which makes them the first impression rather than a
footnote.

## Scope

The Keycloak login theme, brought to whatever
[task 03](03-visual-identity.md) and
[task 04](04-imagery-iconography-and-the-mark.md) decide: the four
Keycloak-rendered pages carrying the new palette, typography and mark as far as
the theme mechanism allows — and a decision about how the two copies of the
palette are kept from drifting again.

## Non-goals

- Reopening [ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md)'s
  decision to stay a minimal `keycloak.v2` child rather than a full custom
  theme. If the new identity genuinely cannot be expressed inside it, that is
  a finding for the product owner, not a licence to leave the hooks.
- The Kalia-rendered sign-up page. It is in the Next app and belongs to
  [task 10](10-profile-and-sign-up-layout.md).
- Keycloak's translations. The `en`/`fi` message bundles are a separate
  surface ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md)) and
  wording is out of scope for this iteration.
- The admin console. It is an operator tool, not a Kalia surface.

## Constraints

- **The theme is a child of stock `keycloak.v2`**, layering `login.css` after
  Keycloak's own `styles.css` and touching only documented custom properties
  ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md)). Overriding
  undocumented PatternFly internals is how a theme breaks on a Keycloak
  upgrade, silently and in production only.
- `theme.properties` sets `darkMode=false` **because**
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) says Kalia is
  light-mode only. That decision is not being reopened in this iteration, so
  this line stays — but it is a dependency worth knowing about, because it is
  the second place that decision is written down.
- The theme cannot import `frontend/app/globals.css`. Different origin,
  different build, no shared pipeline. The drift check below works across
  that gap by reading both files.
- Keycloak ships its form controls and their WCAG-checked focus behaviour;
  [ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md) deliberately
  left them stock. A re-theme that restyles controls takes on their
  accessibility, which Kalia's own test pipeline cannot see.
- Fonts are `next/font/google` in the app and are not available here. A
  typeface on the auth pages is a separate load with its own cost, and its own
  CSP implications on Keycloak's origin.

- The agreed widths are an iteration-wide decision recorded in
  [the iteration index](../iteration-7.5.md).

Decided with the product owner in refinement, 2026-10-01:

- **Recognisably related, not identical.** The pages carry the new palette and
  [task 04](04-imagery-iconography-and-the-mark.md)'s mark inside
  `keycloak.v2`'s documented hooks, and
  [ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md) stands. They
  share one "single form, centred" layout with Kalia's own sign-up page
  ([task 10](10-profile-and-sign-up-layout.md)); whichever of the two tasks
  runs first proposes it, and the second inherits it. Which form of the mark
  fits the fixed `#kc-header-wrapper` box is chosen between built
  alternatives.
- **A drift check keeps the two copies of the palette in step.** A
  dependency-free `scripts/` checker parses `login.css` and
  `frontend/app/globals.css` and fails when a colour `login.css` claims to
  share has diverged. It ships a fixture test and follows
  `check-keycloak-realm-config.mjs`'s precedent.
- **No typeface is loaded on Keycloak's origin.** The pages fall back to a
  system font stack, so there is no extra font load and no CSP change there.
- **Verification extends the existing spec.** `keycloak-branding.spec.ts`
  already reaches these pages, so it is extended to both agreed widths and to
  axe scans of all four pages, rather than replaced by something new.

## Open questions

**None.**

## Acceptance criteria

- [ ] All four Keycloak-rendered pages — login, registration, email
      verification, password reset — render in the new identity, verified in a
      browser at both agreed widths against the running stack, not by reading
      CSS
- [ ] A check fails when the two copies of the palette diverge — demonstrated
      by a fixture test that changes one and asserts the failure, following
      `check-keycloak-realm-config.mjs`'s precedent — and it runs in
      `make verify` and in CI
- [ ] The theme still layers over stock `keycloak.v2` and still touches only
      documented hooks, or the decision to go further is recorded as an
      amendment with its upgrade cost stated
- [ ] `keycloak-branding.spec.ts` axe-scans all four pages at both agreed
      widths and passes, and contrast on the re-themed pages is also computed
      against WCAG 2.1 AA, since the drift check compares colours, not
      pairings
- [ ] Both locales still render correctly on all four pages
      ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md))
- [ ] `make verify` is green
