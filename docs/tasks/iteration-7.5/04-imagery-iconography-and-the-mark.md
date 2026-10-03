# Task 04: Imagery, iconography and the Kalia mark

- **Status:** done
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-2
- **Kind:** design

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
  This task designs the shapes uploads will fill (Constraints), not the
  uploads.
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
- **A raster asset needs its directory allowed.** `make verify` fails on any
  tracked raster image
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), and
  its allowlist is empty. Shipping one means adding its directory to
  `ALLOWED_DIRS` in `scripts/check-no-raster-images.mjs`, in this task's diff,
  and choosing a directory that will never hold a capture. An SVG is not
  affected.
- [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s
  no-new-dependency rule for `components/ui/` has been breached twice, both
  times for behaviour rather than appearance; an icon set is appearance, so it
  does not fit the exception those two amendments carved out — which is why
  the icons are drawn rather than installed (below).
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

Decided with the product owner in refinement, 2026-10-01 (the iteration-wide
part, that layouts reserve image shapes, is in
[the iteration index](../iteration-7.5.md)):

- **User-uploaded images are likely later, so this task designs the shapes
  they will fill.** A beer and a person each get an image slot, filled for now
  by a generated placeholder made from what the record already has. What fills
  the beer's slot — a mark from style or country, a colour from ABV, a
  letterform from the brewery — is prototyped as alternatives. So is the
  person's, with initials on a coloured ground among them, and it applies in
  the feed as well as on the profile. Uploads themselves are a
  [backlog](../backlog.md) entry.
- **Icons are hand-drawn SVG, with no icon library.** A handful are drawn to
  match the mark and live in `components/ui/`, which keeps
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s rule against
  taking on a dependency for appearance.
- **An agent drawing SVG by hand is acceptable output** for the mark's new
  forms, the icons and any illustration. They are shown as built alternatives
  like everything else, and the product owner rejects what falls short.
- **The mark gets a compact square form**, used for a favicon and an
  `apple-touch-icon` that replace the Next.js default `app/favicon.ico` still
  in the tree. The form the header holds is chosen with
  [task 06](06-page-shell.md), which follows this one. A `.ico` is not caught
  by the raster check but a `.png` is, and the constraint above applies to it.
- **No social card in this iteration.** What a pasted public-cellar link
  unfurls to is a [backlog](../backlog.md) entry.

## Open questions

**None.**

## Acceptance criteria

- [x] The product owner chose from built alternatives for each of the three —
      imagery, icons, and the mark in-app — rather than from descriptions
- [x] Every asset that ships exists as a real file in the repository, and the
      Kalia mark is reachable by the app rather than living only under
      `keycloak/themes/`
- [x] The favicon and `apple-touch-icon` are Kalia's square mark, verified in
      a browser, not by reading the markup
- [x] The beer and person image slots render their generated placeholder,
      covered by a vitest test per placeholder component
- [x] Decorative assets are hidden from assistive technology and meaningful
      ones carry an accessible name, asserted by a `jest-axe` test on the
      component that renders them
- [x] No icon dependency is added to `frontend/package.json`
- [x] [`docs/design.md`](../../design.md)'s *Imagery and the mark* section
      says what imagery is for, what each placeholder stands in for, and what
      the mark is meant to say — as intent, with no file paths or values
- [x] Nothing loads from a third-party origin, or the CSP change that permits
      it is made deliberately and verified in a browser rather than with `curl`
- [x] `make verify` is green

## Notes

The mark's current home is worth seeing before deciding anything:
`keycloak/themes/kalia/login/resources/img/kalia-logo.svg`, a hand-drawn
snifter in `#2f6f5e` on `#eaf5f1` — which is to say it is drawn in the palette
[task 03](03-visual-identity.md) may be about to replace. The two tasks are
adjacent for that reason and the mark's colours should not be settled before
the palette is.
