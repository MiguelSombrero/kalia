# ADR-0075: WCAG 2.1 AA could pass a redesign that hid focus under its sticky bars and was cramped to tap, so Kalia's bar becomes WCAG 2.2 AA

- **Status:** accepted
- **Date:** 2026-10-11

## Context

Kalia has held itself to WCAG 2.1 AA since iteration 2, enforced at three
layers: `eslint-plugin-jsx-a11y`, `jest-axe` in unit tests and
`@axe-core/playwright` against real pages
([architecture.md §5](../architecture.md#5-client-design)). WCAG 2.2 has
been the W3C recommendation since October 2023 and adds six success criteria
at levels A and AA that 2.1 does not have.

Iteration 7.5 redesigned every surface for a phone as much as a desktop, and
two of those six criteria describe exactly what such a redesign can get wrong
while 2.1 AA still passes. **2.5.8 Target Size (Minimum)** asks for 24×24 CSS
pixel targets, or enough space around a smaller one; the iteration already
designed to it as a deliberate raise
([iteration 7.5 index](../tasks/iteration-7.5.md)). **2.4.11 Focus Not
Obscured (Minimum)** asks that a focused control is never entirely hidden by
author content — and the redesign introduced a sticky header
([ADR-0067](0067-page-shell-sticky-bar-and-page-component.md)), a sticky
"N new" control over the feed
([ADR-0068](0068-front-page-one-column-cellar-or-pitch-above-a-ruled-feed.md))
and fixed toasts.

None of the three layers would notice either on its own. axe-core ships one
2.2 rule, `target-size`, disabled unless a scan asks for the `wcag22aa` tag,
and has no rule at all for 2.4.11. jsdom does no layout, so `jest-axe` can
check neither. The other four new criteria — 2.5.7 Dragging Movements,
3.2.6 Consistent Help, 3.3.7 Redundant Entry and 3.3.8 Accessible
Authentication (Minimum) — are judged by walking the app, not by a scanner.

## Decision

**Kalia's accessibility bar is WCAG 2.2 AA, replacing WCAG 2.1 AA everywhere
the bar is named and enforced.**

- **One tag scope for the E2E layer.** `frontend/e2e/support/a11y.ts` scans
  with `wcag22a` and `wcag22aa` added to the 2.0 and 2.1 tags, and fails if
  `target-size` did not run or reported a target it could not measure. Every
  page is scanned under it, Keycloak's included. `jest-axe` keeps its default
  scope: a 2.2 check needs layout that jsdom does not have.
- **What axe cannot check is a Playwright test.** 2.4.11 is asserted at every
  Tab stop along the three keyboard flows the product owner chose, at the
  phone width, in both locales (`frontend/e2e/keyboard-flows.spec.ts`).
  Heading structure — one `h1`, no skipped level — is asserted on every
  surface the tour visits, since axe's own rules for it are best practices
  outside the WCAG tags.
- **The four criteria no test can judge were walked**, in both locales, and
  the result of each is below under Evidence. A criterion that does not apply
  yet says why, so that the feature which makes it apply knows to look.
- **A 2.2 fix the eye can see goes back to the product owner** as a
  `design-task` round, the same route as a contrast failure; a fix the eye
  cannot see, such as scroll padding or a grown hit area, is made directly.
- **A 2.2 failure on a stock Keycloak control** is fixed in the theme through
  its documented hooks where possible; otherwise the scan excludes that one
  named selector, recorded here and in the quality backlog. None was needed.

AAA criteria — 2.4.12, 2.4.13, 3.3.9 — are not part of the bar.

## Alternatives considered

**Stay at WCAG 2.1 AA.** No work, and the app already passed it. Rejected
because the redesign is phone-first and its new sticky and fixed elements are
precisely what 2.1 does not cover: the app could pass every scan with a
focused control sitting under the header, which the keyboard flows below
showed it did.

**WCAG 2.1 AA plus 2.5.8 alone** — what iteration 7.5 had agreed on
2026-10-01. Smallest raise that covers the tap-target worry. Rejected on
2026-10-11 once an analysis showed the rest of 2.2 AA was a small step from
where Kalia stood: 2.4.11 was already failing, the other four criteria passed
or did not apply, and a bar named as "2.1 AA plus one criterion" is a bar
every later reader has to reconstruct rather than look up.

## Consequences

- Good, because the two criteria that describe a phone-first redesign's
  likeliest failures are now checked on every run, and the first run of the
  keyboard flows found and fixed real failures (see Evidence).
- Good, because "WCAG 2.2 AA" is a published bar a reader can look up, rather
  than a local blend of two versions.
- Bad, because the keyboard flows are slower and more brittle than a scan:
  they press Tab dozens of times through live pages, and the feed flow waits
  out a real poll, so a layout change that adds or removes a control can fail
  one without any accessibility regression.
- Bad, because 2.4.11 is held only along three flows and one long list, not
  on every page; a sticky element added elsewhere is not checked until a flow
  passes through it.
- Neutral, because the four walked criteria stay walked: nothing re-checks
  them, so a help link (3.2.6), a multi-step form (3.3.7) or a new sign-in
  step (3.3.8) has to be walked again when it is added.
- **Revisit trigger:** WCAG 3.0 becoming a recommendation, or a regulation
  Kalia is subject to naming a different version.

## Evidence

Run against the compose stack on 2026-10-11, axe-core 4.12, Chromium, at
375×812 and 1280×800.

**The scans.** With the 2.2 tags added, every surface in
`frontend/e2e/surface-tour.spec.ts` (now in both locales) and all four
Keycloak pages in `frontend/e2e/keycloak-branding.spec.ts` passed with no
violation and no `target-size` result left incomplete. No exclusion was
needed.

**2.4.11, found failing and fixed by scroll padding** (`app/globals.css`):

- Shift+Tab back up the catalog list at 375px left an "Add to cellar" button
  at y=0–32, entirely under the 3.5rem sticky header.
- With the header padding in place but not the feed's, Shift+Tab up the feed
  while the "N new" control showed left a feed link at y=64–91, entirely
  under the control.

**Found by walking the three flows, and fixed:**

- Removing the last bottle in the cellar lost its outcome toast — a status
  message (4.1.3) — because the toast lived inside the list the removal
  emptied. It now sits beside the list.
- After any removal, focus fell to `<body>`, because Radix returns it to a
  trigger the removal had just unmounted. It now moves to the beer's block,
  to the beer beside it once that beer is gone, and to the page's `<main>`
  once none is left.
- Activating "N new" dropped focus to `<body>` the same way: the control
  unmounts as the entries it held appear. The revealed list now takes it.
- At 375px the toast started 16px off the left edge of the viewport; it now
  keeps the page's gutters.
- Three animations ran regardless of `prefers-reduced-motion`; all three now
  run only under `motion-safe`, held by `frontend/e2e/reduced-motion.spec.ts`.

**The walked criteria**, in English and Finnish:

| Criterion | Result |
|---|---|
| 2.5.7 Dragging Movements | Passes. The only drag is the toast's swipe-to-dismiss, and every toast dismisses itself, so nothing needs a drag. No slider, reorder or drag-and-drop exists. |
| 3.2.6 Consistent Help | Does not apply yet. Neither the app nor the Keycloak pages offer a help link, contact detail or chat; the first one added must sit in the same place on every page. |
| 3.3.7 Redundant Entry | Passes. The app's sign-up step asks only for consent; Keycloak's registration keeps username, email and names after a validation error, and a failed sign-in keeps the username; editing a bottle starts from its saved values. |
| 3.3.8 Accessible Authentication (Minimum) | Passes on the Keycloak login and registration pages. Login fields carry `autocomplete="username"` and `"current-password"`, paste is not blocked, a show-password control is present, and there is no CAPTCHA. Registration asks for no password at all — it is set from the verification email. |
