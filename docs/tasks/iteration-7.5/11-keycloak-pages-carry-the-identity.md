# Task 11: Carry the identity into the Keycloak pages

- **Status:** needs-refinement
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
Keycloak pages are outside every guard Kalia has. They are not in the Next
build, not in `npm test`, not touched by
[task 05](05-token-only-styling-enforced.md)'s checker, and not scanned by
`@axe-core/playwright`. They are also the pages a person meets *before* they
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
  theme, unless the new identity genuinely cannot be expressed inside it —
  which is question 2.
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
  different build, no shared pipeline. Whatever solves question 1 has to work
  across that gap.
- Keycloak ships its form controls and their WCAG-checked focus behaviour;
  [ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md) deliberately
  left them stock. A re-theme that restyles controls takes on their
  accessibility, which Kalia's own test pipeline cannot see.
- Fonts are `next/font/google` in the app and are not available here. A
  typeface on the auth pages is a separate load with its own cost, and its own
  CSP implications on Keycloak's origin.

## Open questions

1. **How do the two copies of the palette stay in step?** A generated file
   written from `globals.css` at build time; a check that parses both and fails
   on divergence — `scripts/` already holds
   `check-keycloak-realm-config.mjs`, which is the same shape of problem
   solved the same way; a documented manual step in
   [task 05](05-token-only-styling-enforced.md)'s rule; or accepting the drift
   in writing. Doing nothing is the status quo and is what produced this task.
2. **Can the new identity be expressed inside `keycloak.v2` at all?** Today's
   is a colour swap, which the parent theme's hooks handle. A direction with a
   distinctive type scale, a mark placement or a layout of its own may not fit,
   and finding that out is part of the task rather than a surprise at the end.
3. **How much should the auth pages match the app?** Identical, recognisably
   related, or deliberately plainer. A sign-in page that looks exactly like the
   app but behaves like Keycloak sets an expectation it cannot meet.
4. **Does the mark appear, and in which form?** The current theme repurposes
   `#kc-header-wrapper` as a 220×60 CSS background wordmark. Whatever
   [task 04](04-imagery-iconography-and-the-mark.md) decides has to fit a fixed
   box that is not a Kalia component.
5. **Do these pages get verified at a phone width too?** They are not in the
   Playwright suite, so whatever verification they get is whatever this task
   builds.
6. **Is a typeface worth loading here?** Four pages a person sees a handful of
   times, against an extra font load on a separate origin.

## Acceptance criteria

- [ ] All four Keycloak-rendered pages — login, registration, email
      verification, password reset — render in the new identity, verified in a
      browser at both agreed widths against the running stack, not by reading
      CSS
- [ ] The palette exists in one place, or a check fails when the two copies
      diverge — demonstrated by a test that changes one and asserts the
      failure, following `check-keycloak-realm-config.mjs`'s precedent
- [ ] If divergence is accepted instead,
      [ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md) is amended
      to say so and to name what a future re-theme must remember
- [ ] The theme still layers over stock `keycloak.v2` and still touches only
      documented hooks, or the decision to go further is recorded as an
      amendment with its upgrade cost stated
- [ ] Contrast on the re-themed pages is checked against WCAG 2.1 AA — by
      computation, since these pages are outside `@axe-core/playwright`'s reach
- [ ] Both locales still render correctly on all four pages
      ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md))
- [ ] `make verify` is green
