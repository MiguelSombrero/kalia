# Task 04: Imagery, iconography and the Kalia mark

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-2

## Why

Kalia contains no images. Not "few" — none. A catalog of craft beers where no
beer has a picture, a cellar that is rows of text, a profile with nothing on it
but a name and a toggle, and a front page that will soon be a column of
sentences. Colour and typography are what [task 03](03-visual-identity.md) can
change; in this product category they are not what carries the page. A beer
app that looks modern usually looks modern because of what is on it, and Kalia
has nothing to put there and no field to hold it.

The mark is a smaller problem with a stranger shape. Kalia *has* a logo — a
snifter mark and wordmark at
`keycloak/themes/kalia/login/resources/img/kalia-logo.svg`, drawn in iteration
6.5 for the branded auth pages. It appears on the sign-in page and nowhere
else. The app's own header is a row of text links with no mark at all, so a
visitor sees Kalia's identity exactly once, on the page they pass through
fastest, and never again afterwards. That is backwards.

Iconography is the third gap and the only one with a dependency in it: there is
no icon anywhere in the app, so every affordance is carried by a word. That is
not automatically wrong — it is unusually text-heavy for a modern interface,
and it is worth deciding on purpose rather than by omission.

## Scope

What carries visual weight on a Kalia page, decided by prototyping rather than
asserted: where imagery or illustration appears and where deliberate emptiness
does; whether Kalia uses icons and where they come from; and how the Kalia mark
is used inside the app, including whether it needs a form the header can hold.

Whatever is chosen is produced as real assets and wired into the primitives and
shell that follow, not left as a direction.

## Non-goals

- **User-uploaded images.** Avatars and beer photos from users bring storage,
  a CDN, responsive variants and moderation — the [backlog](../backlog.md)
  names all four under the mobile client's product gaps — plus a GDPR surface.
  This task designs for the app as it is, and question 1 is about whether it
  should design so that uploads can arrive later.
- **Adding an image field to a beer.** That is a backend model change and a
  catalog-data question, and [iteration 8](../iteration-8.md) is where the
  catalog's data source is decided.
- The Keycloak pages' own use of the mark —
  [task 11](11-keycloak-pages-carry-the-identity.md) — though whatever this
  task decides about the mark is what that task carries across.

## Constraints

- **No beer imagery exists and none is coming from the seed data.** Whatever
  fills a beer's place on a page has to be generated from what a beer already
  has — name, brewery, country, style, ABV — or be deliberate empty space.
- An icon library is a new dependency and therefore a product owner question
  under `CLAUDE.md`'s "ask, don't research" rule, answered in refinement with a
  version, not researched by an agent.
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s no-new-dependency
  rule for `components/ui/` has been breached twice, both times for behaviour
  rather than appearance; an icon set is appearance, so it does not fit the
  exception those two amendments carved out.
- **The CSP is `img-src 'self'` territory**
  ([ADR-0016](../../adr/0016-security-response-headers.md),
  `frontend/lib/config/cspHeader.ts`): anything loaded from a third-party host
  needs a CSP change, which is a security decision rather than a design one.
  Verify the current directive rather than trusting this bullet — a CSP mistake
  fails in a browser and not in a test.
- Any icon or illustration a user can perceive is subject to WCAG 2.1 AA the
  same way everything else is: decorative images hidden from assistive tech,
  meaningful ones labelled, and an icon that replaces a word needs an
  accessible name.
- This Next.js version postdates model training — what `next/image` does here,
  and what it costs, is something to read in
  `frontend/node_modules/next/dist/docs/` rather than recall.

## Open questions

1. **Are user-uploaded images ever coming?** The answer changes this task
   completely. If avatars and beer photos arrive in a year, this task designs
   the shapes they will fill and picks placeholders that become real images. If
   they never arrive, Kalia is a text product and should be designed as one
   confidently rather than apologetically.
2. **Does a beer get a visual stand-in?** A generated mark from style or
   country, a colour derived from ABV, a letterform from the brewery — or an
   empty card that says nothing and is the better answer. This is the single
   biggest decision in the task, because the catalog list and the cellar are
   both grids of beers.
3. **Icons: none, hand-drawn, or a library?** Kalia's three
   `components/ui` primitives are hand-written on principle. A handful of SVGs
   drawn to match the mark keeps that principle; an icon set is a dependency
   with hundreds of glyphs, of which Kalia would use eight.
4. **Does the mark need a second form?** The existing SVG is a wide
   snifter-plus-wordmark lockup at 260×72. A header — especially at phone width
   — usually wants a compact mark, and a favicon and an `apple-touch-icon` want
   a square one. Kalia has no favicon today.
5. **Who draws what does not exist?** Illustration and a redrawn mark are
   production work, and the honest question is whether an agent drawing SVG by
   hand is acceptable output or whether this stays deliberately minimal.
6. **Does a profile get an avatar?** There is no avatar today and no image to
   put in one. Initials on a coloured ground is the usual answer and needs no
   uploads, no storage and no moderation — but it is a design decision and it
   shows up in the feed as well as the profile.
7. **Is there a Kalia favicon and social card?** The public cellar is the app's
   only externally-shared URL
   ([ADR-0050](../../adr/0050-public-cellar-addressing.md)), and it is served
   `noindex, nofollow` but still gets pasted into chat clients that unfurl it.
   What that unfurl looks like is a design question nobody has asked.

## Acceptance criteria

- [ ] The product owner chose from built alternatives for each of the three —
      imagery, icons, and the mark in-app — rather than from descriptions
- [ ] Every asset that ships exists as a real file in the repository, and the
      Kalia mark is reachable by the app rather than living only under
      `keycloak/themes/`
- [ ] Decorative assets are hidden from assistive technology and meaningful
      ones carry an accessible name, asserted by a `jest-axe` test on the
      component that renders them
- [ ] If an icon dependency is taken on, its version is pinned in
      `frontend/package.json` and recorded nowhere else, the technology is
      added to the README tech-stack inventory without its number, and
      [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) is amended to
      say why appearance earned an exception its own amendments limited to
      behaviour
- [ ] Nothing loads from a third-party origin, or the CSP change that permits
      it is made deliberately and verified in a browser rather than with `curl`
- [ ] `make verify` is green

## Notes

The mark's current home is worth seeing before deciding anything:
`keycloak/themes/kalia/login/resources/img/kalia-logo.svg`, a hand-drawn
snifter in `#2f6f5e` on `#eaf5f1` — which is to say it is drawn in the palette
[task 03](03-visual-identity.md) may be about to replace. The two tasks are
adjacent for that reason and the mark's colours should not be settled before
the palette is.
