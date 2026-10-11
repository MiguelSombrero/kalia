# Task 16: A Kalia mark that is unmistakably Kalia's

- **Status:** done
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
by refining the rack: genuinely different ideas built and looked at first,
then the chosen one worked into variations until the product owner settles on
a final form.

The outcome covers the mark itself; how it sits beside the wordmark, as the
header and footer hold them; and its compact square form, for the favicon and
the `apple-touch-icon`. Whatever is chosen replaces the rack everywhere the app
shows it — the header, the footer, the favicon and the touch icon — and is
what [task 11](11-keycloak-pages-carry-the-identity.md) carries onto the
Keycloak pages.

## Non-goals

- **The page's palette and typefaces.**
  [ADR-0064](../../adr/0064-visual-identity-can-art-square.md) chose them. The
  mark may step outside them (Constraints); the rest of the app does not
  follow it there.
- **Lettering the wordmark.** The name stays set in the identity's own face;
  only how the mark sits beside it is decided here.
- **Motion.** The mark is static: no animated form, on load or as a loading
  indicator.
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
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)).
- **No raster image is tracked.** The favicon PNGs are generated at build from
  the same drawing, so `scripts/check-no-raster-images.mjs`'s allowlist stays
  empty ([ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md)).
- **The mark's raw colour values are token exceptions.** The generator that
  draws the PNGs cannot read CSS variables, so the mark's colours are written
  as literals and a test pins them to `globals.css`
  ([ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)). A new
  colour in the mark joins `globals.css` as a primitive with its own pin, not
  a hardcoded value slipped past the check.
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

Decided with the product owner in refinement, 2026-10-11:

- **The brief is open.** The mark is not bound to the cellar idea the rack
  expressed. The first round spans genuinely different subjects — the cellar,
  a bottle or cap, time and ageing, a letterform from the name, something
  Finnish — and the subject is chosen from what was built.
- **The mark may break the identity's rules, in shape and in colour.** Curves,
  any geometry, the style colours or a colour of its own are all allowed in the
  mark.
- **A colour the mark brings belongs to the mark alone.** It is not used
  anywhere else in the app, so the page keeps its one action colour and
  ADR-0064 is not reopened through the mark.
- **The wordmark stays as it is set today.** Only the lockup — how mark and
  name sit together in size, spacing and alignment — is in scope.
- **The first round is six distinct concepts, and rounds are not capped.**
  Each concept is shown at 16 px, in the header and footer at both agreed
  widths, and large. Variations of the chosen one follow for as many rounds as
  the product owner asks for; the task's exploration ends when they choose a
  final form, not after a set number of rounds.
- **Uniqueness is the product owner's judgement.** No comparison wall or
  logo search is part of the task.
- **The mark is static.**
- **It runs before [task 11](11-keycloak-pages-carry-the-identity.md)**, after
  [task 10](10-profile-and-sign-up-layout.md), so the Keycloak pages take on
  the mark once.
- **The choice gets its own ADR**, and ADR-0065's mark bullet is amended to
  point at it, since decisions on one subject stay separate documents
  ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)).

## Open questions

**None.**

## Acceptance criteria

- [x] The product owner chose the mark from built alternatives: a first
      round of six distinct concepts, then variations of the chosen one until
      a final form — each shown at 16 px, in the header and footer at both
      agreed widths, and large
- [x] The chosen mark replaces the rack in the header and the footer, seen in
      a browser at both agreed widths, and the `KaliaMark` vitest test
      describes the new drawing
- [x] The favicon and `apple-touch-icon` are the new mark, verified in a
      browser rather than by reading the markup, and `e2e/app-icons.spec.ts`
      passes against the links the page emits
- [x] The mark is named where it is the home link and hidden elsewhere,
      asserted by a `jest-axe` test on the components that render it
- [x] Any colour the mark uses is pinned to `globals.css` by
      `kaliaMark.test.ts`, and any pairing it adds is declared in
      [`docs/design.md`](../../design.md) and passes
      `scripts/check-contrast.mjs`
- [x] No raster file is tracked and no dependency is added to
      `frontend/package.json`
- [x] The choice and the rejected concepts are recorded in an ADR, and
      ADR-0065's mark bullet points at it
- [x] [`docs/design.md`](../../design.md)'s *Imagery and the mark* section says
      what the new mark means, as intent, with no file paths or values
- [x] `make verify` is green

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
