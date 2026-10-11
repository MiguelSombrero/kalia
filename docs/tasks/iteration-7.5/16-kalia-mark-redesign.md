# Task 16: A Kalia mark that is unmistakably Kalia's

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-2
- **Kind:** design

## Why

Kalia's mark is a square of nine smaller squares, eight ink and one cobalt
([ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md)). It was chosen
in [task 04](04-imagery-iconography-and-the-mark.md) as one part of a direction
whose real subject was imagery and icons, so it was never explored on its own:
the three directions offered three marks, and the one that came with the
winning direction came with it.

The product owner finds that it does not look unique or fresh, and it is easy
to see why. A three-by-three grid of squares is the shape of the common
app-launcher icon, and of a great many other marks besides; nothing in it is
Kalia's. It is also the one piece of the identity a visitor sees on every
page, in every browser tab and on a phone's home screen, so it is the cheapest
place in the product to look generic and the most expensive to leave that way.

Now is the moment because the mark has not yet travelled.
[Task 11](11-keycloak-pages-carry-the-identity.md) is about to carry it onto
the Keycloak pages, and every surface it reaches afterwards is one more place
to change it again.

## Scope

A new Kalia mark, arrived at by deliberately broad exploration rather than
by refining the rack: several genuinely different ideas built and looked at
first, then the chosen one worked into variations, then a final form.

The outcome covers the mark itself; how it sits beside the wordmark, as the
header and footer hold them; and its compact square form, for the favicon and
the `apple-touch-icon`. Whatever is chosen replaces the rack everywhere the app
shows it — the header, the footer, the favicon and the touch icon — and is
what [task 11](11-keycloak-pages-carry-the-identity.md) carries onto the
Keycloak pages.

## Non-goals

- **The palette and the typefaces.**
  [ADR-0064](../../adr/0064-visual-identity-can-art-square.md) chose them and
  this task works inside them; whether the mark may bend the identity's own
  rules is an open question below, not a licence to reopen them.
- **Imagery and the seven icons.** [ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md)'s
  beer and person slots and its icon set stay as they are. If the new mark's
  drawing language visibly clashes with the icons, that is a finding for the
  product owner, not a redraw folded into this task.
- **The Keycloak pages.** Carrying the mark there is
  [task 11](11-keycloak-pages-carry-the-identity.md)'s.
- **A social card** for a pasted link, which stays a [backlog](../backlog.md)
  entry as task 04 left it.

## Constraints

- **Run under the `design-task` skill**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)):
  built alternatives, the product owner's choice, an ADR recording it.
  ADR-0065 is accepted, so its mark bullet is amended to point at the new
  decision rather than rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- **Hand-drawn SVG by an agent is acceptable output**, as task 04's refinement
  settled, and no dependency is taken on for appearance
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)). A wordmark that
  needs a font Kalia does not already load is a new dependency, and asks first.
- **No raster image is tracked.** The favicon PNGs are generated at build from
  the same drawing, so `scripts/check-no-raster-images.mjs`'s allowlist stays
  empty ([ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md)).
- **The mark's raw colour values are token exceptions.** The generator that
  draws the PNGs cannot read CSS variables, so the mark's colours are written
  as literals and a test pins them to `globals.css`
  ([ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)). A new
  colour in the mark is a new literal and a new pin, not a hardcoded value
  slipped past the check.
- **Changing an icon route fails silently.** `frontend/proxy.ts`'s matcher
  names the generated `icon`, `icon<n>` and `apple-icon` routes; a renamed or
  added one is redirected to a locale path that does not exist, and the page
  still builds. ADR-0065's Evidence has the failure; `e2e/app-icons.spec.ts`
  is what catches it.
- **The mark must survive 16 px.** It is a browser-tab favicon before it is
  anything else; a direction that only works large is not a candidate.
- **Accessibility is WCAG 2.2 AA**, the iteration's bar
  ([task 13](13-accessibility-and-contrast-reverified.md)): where the mark is
  the home link it carries the link's accessible name, elsewhere it is hidden
  from assistive technology, and any colour pairing it adds is declared in
  [`docs/design.md`](../../design.md) and passes `scripts/check-contrast.mjs`.

## Open questions

- **What should the mark say?** The rack said "cellar". Is that still the idea
  to express, drawn freshly, or is the brief open — beer, a bottle or cap,
  time and ageing, a letterform from the name, something Finnish, the social
  side? Is there a story behind the name Kalia the mark should draw on?
- **How far may it bend the identity?** ADR-0064's world is square corners,
  hairlines, ink and one cobalt. May the mark use a curve, a second colour, or
  the style colours — or does a mark that obeys every rule of the page it sits
  on risk looking as generic as the rack?
- **Is the wordmark in scope?** Only how the mark sits beside it, or also
  custom-lettering the name rather than setting it in Archivo?
- **How broad is "broad"?** A proposal to accept or change: a first round of
  at least six distinct concepts, each shown at 16 px, in the header and footer
  at both agreed widths and large; then two or three variations of the chosen
  one; then the final form.
- **How is "unique" checked?** A proposal: the shortlisted concepts are set
  beside the marks of the beer platforms a Kalia user already knows — Untappd,
  Vivino, RateBeer, BeerAdvocate — and the app-launcher grid, and any that
  reads as a cousin of one is dropped. Is that enough, and are there marks the
  product owner wants on that wall?
- **Where does this run in the iteration?** Before
  [task 11](11-keycloak-pages-carry-the-identity.md) is the obvious place, so
  the Keycloak pages take on the mark once; the index places it there. Should
  it also go ahead of [task 10](10-profile-and-sign-up-layout.md)?
- **Does the mark ever move?** An animated form — on load, or as a loading
  indicator — or strictly static, as now?
- **A new ADR, or an amendment of ADR-0065?** The constraint above assumes a
  new ADR, since the decision now has rejected alternatives of its own
  ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)).

## Acceptance criteria

- [ ] The product owner chose the mark from built alternatives, in at least
      two rounds: distinct concepts first, then variations of the chosen one —
      each shown at 16 px, in the header and footer, and large
- [ ] The chosen mark replaces the rack in the header and the footer, seen in
      a browser at both agreed widths, and the `KaliaMark` vitest test
      describes the new drawing
- [ ] The favicon and `apple-touch-icon` are the new mark, verified in a
      browser rather than by reading the markup, and `e2e/app-icons.spec.ts`
      passes against the links the page emits
- [ ] The mark is named where it is the home link and hidden elsewhere,
      asserted by a `jest-axe` test on the components that render it
- [ ] Any colour the mark uses is pinned to `globals.css` by
      `kaliaMark.test.ts`, and any pairing it adds is declared in
      [`docs/design.md`](../../design.md) and passes
      `scripts/check-contrast.mjs`
- [ ] No raster file is tracked and no dependency is added to
      `frontend/package.json`
- [ ] The choice and the rejected concepts are recorded in an ADR, and
      ADR-0065's mark bullet points at it
- [ ] [`docs/design.md`](../../design.md)'s *Imagery and the mark* section says
      what the new mark means, as intent, with no file paths or values
- [ ] `make verify` is green

## Notes

Requested by the product owner on 2026-10-11: the rack is to be replaced, with
real effort spent on making the mark unique and fresh.

What exists today: the drawing's cells in `frontend/lib/kaliaMark.ts`, the
component in `frontend/components/ui/kalia-mark.tsx`, the header's use in
`frontend/features/navigation/SiteBrand.tsx` and the footer's in
`frontend/app/[locale]/SiteFooter.tsx`, the favicon in `frontend/app/icon.svg`,
and the generated PNGs in `frontend/app/icon1.tsx` and `apple-icon.tsx`. The
Keycloak theme still shows the iteration-6.5 snifter at
`keycloak/themes/kalia/login/resources/img/kalia-logo.svg`.
