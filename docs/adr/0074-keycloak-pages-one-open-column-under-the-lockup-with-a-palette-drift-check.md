# ADR-0074: Keycloak's pages were the last surface in the old identity, so they drop the card for one open column under Kalia's lockup, and a check holds their palette to the app's

- **Status:** accepted
- **Date:** 2026-10-11
- **Amended:** 2026-10-14 — the checker runs in CI's single static-checks job
- **Amended:** 2026-10-23 — Keycloak's field errors and error alerts carry
  Kalia's error sign, and a theme script ties each field to its error line

## Context

Kalia's sign-in, registration, email-verification and password-reset pages
are Keycloak's, on Keycloak's origin, styled by the minimal `keycloak.v2`
child theme [ADR-0056](0056-branded-bilingual-keycloak-pages.md) chose. That
theme was drawn for iteration 2's identity: a cream ground, a mint primary, a
serif wordmark beside a snifter. Since then
[ADR-0064](0064-visual-identity-can-art-square.md) replaced the identity and
[ADR-0072](0072-the-mark-is-a-bottle-pouring-into-foam-on-a-teal-tile.md) the
mark, so a stranger's first look at Kalia was the old Kalia.

The theme's colours were hex literals copied by hand from
`frontend/app/globals.css` under a comment claiming they were the app's values.
ADR-0056 accepted that copy as a cost. Nothing failed when it went stale, and
the theme cannot import the app's tokens: it is served from another origin and
built into another image.

[The iteration 7.5 audit](../tasks/iteration-7.5/audit.md) recorded the pages'
problems. The sign-in card is centred in the window while the taller
registration card starts at the top (AUD-40). A language menu sits inside the
form although the visitor arrived with the language chosen (AUD-41). Every
page is titled "Sign in to Kalia" (AUD-42). Nothing links back to Kalia
(AUD-43). The links are under 24px tall (AUD-44). The pages run in Red Hat
fonts with a serif wordmark (AUD-08).

[ADR-0071](0071-profile-a-name-tag-over-two-visibility-choices-and-one-error-style.md)
made Kalia's own sign-up page a narrow, flush-left single form and said these
pages follow it "as closely as their theme allows". Refinement bounded the
answer: stay a `keycloak.v2` child; carry the palette and the mark; load no
typeface on Keycloak's origin; and keep the two copies of the palette in step
with a dependency-free `scripts/` checker. This was run under the
`design-task` skill ([ADR-0062](0062-a-design-task-is-a-skill-and-a-marker.md)).

## Decision

**Keycloak's pages drop the card: the form sits on the white page in one
narrow column, centred in the window and starting at the same height on every
page, under Kalia's header lockup, which links home. The theme's colours are
named copies of the app's tokens, and `scripts/check-keycloak-theme.mjs` fails
the build when one drifts or the mark differs.** This is direction B, "Open
column", the product owner's choice from three directions built in one round.

- **The layout.** Mark at 32 px beside KALIA in tracked capitals, a hairline
  ink rule under it, then a heavy flush-left title, the fields, and the one
  primary button filling the column. The column is Kalia's narrow width
  (28rem), centred in the window. Keycloak's pages have no header or frame for
  it to sit flush against. Every page starts at the same height rather than
  being centred vertically.
- **How far past ADR-0056's hooks it goes.** Colour, type, corners, edges and
  alerts go through custom properties keycloak.v2 and PatternFly document.
  Keycloak's own `kc-` element ids carry the lockup, the title, the 24px link
  floor and the button labels. Beyond those, two PatternFly layout properties
  are overridden: the vertical centring and the column's width. The theme
  reaches them through one Kalia class added to each of keycloak.v2's
  documented `kcLogin` and `kcLoginContainer` theme.properties keys, never by
  restyling a PatternFly class itself. ADR-0056 is amended to say so.
- **The lockup is a link home.** The realm's `displayNameHtml` is
  `<a href="$(env:FRONTEND_URL)">Kalia</a>`. It is a realm setting under
  [ADR-0054](0054-keycloak-config-cli-realm-management.md)'s drift check, and
  the mark is a CSS background on that link, so the link's name is the word
  "Kalia".
- **The mark is `app/icon.svg`, copied.** Its file in the theme must equal the
  app's byte for byte.
- **The wordmark and every other word use the system font stack.** Archivo is
  not loaded on Keycloak's origin, as refinement decided, so the lockup has the
  header's shape and spacing but not its face.
- **Keycloak's language menu is hidden.** The locale arrives through
  `ui_locales` (ADR-0056), and
  [docs/design.md](../design.md) gives a control one home.
- **The palette is named, not copied silently.** `login.css` declares each
  colour once as `--kalia-color-<name>` with a hex value, and everything else
  in the stylesheet refers to those. The checker resolves `--color-<name>`
  through `globals.css` and fails on a mismatch, on a name the app does not
  have, on any colour literal outside those declarations, and on a mark that
  is not the app's. It runs in `make check`, hence `make verify`, and in CI's
  `keycloak-theme-check` job, with a fixture self-test.

  > **Amended 2026-10-14.** CI's dependency-free checkers now run as one
  > `static-checks` job calling `make check`, so this one runs there.
- **Errors carry Kalia's error sign.** A field error and an error alert look
  as [docs/design.md](../design.md#feedback-and-errors) draws them in the app.

  > **Amended 2026-10-23.** This replaces the Neutral consequence below that
  > kept PatternFly's shape for errors. A field with an error has a
  > `--color-destructive` edge, set through PatternFly's form-control custom
  > properties, and its line starts with the red square and white cross. An
  > error alert is the ink-edged box with the red cell. PatternFly's own error
  > icon is hidden wherever the sign is drawn. The sign hangs off Kalia classes
  > added to keycloak.v2's `kcInputErrorMessageClass` and `kcAlertClass` keys,
  > the same route as `kcLogin`. The cross is an SVG used as a mask, so its
  > colour stays a `--kalia-color-*` name in `login.css`. Info, success and
  > warning notices keep PatternFly's shape, since design.md gives them no
  > look.
  >
  > keycloak.v2 never points a field at its error line, so the line was only
  > announced as it appeared. `resources/js/field-errors.js`, loaded through
  > `theme.properties`' `scripts` key, sets the field's `aria-describedby` to
  > it. This is the theme's first script. The other ways to tie them were a
  > copy of keycloak.v2's `field.ftl`, which ADR-0056 declines, and leaving
  > the line untied, which design.md's rule for field errors forbids.
  > `e2e/keycloak-errors.spec.ts` checks every part of this from the rendered
  > page.
- **The rendered pages are checked.** `e2e/keycloak-branding.spec.ts` visits
  all four pages in both locales at 375×812 and 1280×800. On each it checks
  the lockup, its link and its mark, the column's width, its centring and the
  height it starts at, and runs the axe scan. It also computes the contrast of
  the title, links, button label, field edges and focus ring from the
  rendered colours, because the drift check compares colours and not
  pairings.
- **Audit findings on these surfaces.**
  - AUD-05: the pages carry the new mark in the header's lockup.
  - AUD-06 and AUD-44: every text link is at least 24px tall.
  - AUD-08: one face on these pages, the system's, rather than Red Hat's two
    and a serif. A visit now crosses two typefaces, Archivo in the app and
    the system face here. Loading Archivo here was declined in refinement.
  - AUD-40: every page starts in the same place, in Kalia's form column.
  - AUD-41: the language menu is hidden.
  - AUD-42: not fixed. Keycloak sets one title for every page, so a title per
    page needs a copy of keycloak.v2's `template.ftl`, the FreeMarker ADR-0056
    declined. It is a [backlog](../tasks/backlog.md) entry.
  - AUD-43: the lockup links to Kalia.
  - AUD-39, Keycloak's share: the registration form still asks for a first and
    last name that Kalia shows nowhere. Removing them changes what
    registration asks for, which is
    [ADR-0055](0055-self-registration-via-keycloak.md)'s ground rather than a
    visual change, so the product owner made it a
    [backlog](../tasks/backlog.md) entry.
  - AUD-49 is kept: no page scrolls sideways at 375, now checked by the spec.
  - AUD-56 is kept: the sign-in page fits one screen at 375 with its fields,
    one primary action and the link to register, under the lockup and a rule.

## Alternatives considered

Each direction was built as Keycloak's real pages, captured from the running
stack in both locales, with a candidate `login.css` applied. Each showed six
states (sign in, sign in after a wrong password, register, forgot password,
verify email, set password) at 375 and 1280, and Keycloak's language menu shown
and hidden. Each listed the contrast of every pairing it used, and all passed
AA.

**A, "Card".** Keycloak's centred card kept and redrawn: white page, a hairline
ink edge with an ink band across its top instead of a drop shadow, square
corners, a cobalt button. The mark stood large, at 56 px, centred above the
card, with KALIA under it. It stayed entirely inside ADR-0056's hooks and
needed no amendment, but left AUD-40 open. Not chosen; the product owner chose
B and gave no reason.

**C, "Kalia's frame".** Kalia's own page geometry: a bar across the top holding
the lockup where Kalia's header has it, with a full-width rule under it, and
the form flush left in the sign-up page's column beneath, at x=160 on a desktop
and 16 on a phone. It was the closest to design.md's rule that a single-form
page is flush left. It needed the same amendment as B, plus a copy of Kalia's
frame width and gutters that a change to the shell would have to repeat. Not
chosen; the product owner chose B and gave no reason.

**Keeping Keycloak's language menu, restyled.** It would leave a way to switch
language for someone who opens a Keycloak address directly. Not chosen: every
route Kalia sends a visitor down already carries the locale, and the menu is a
second language control unlike Kalia's own.

**A title per page, through a copy of `template.ftl`.** It would fix AUD-42.
Not chosen: the copy would have to be merged against keycloak.v2's on every
upgrade, the cost ADR-0056 declined. Overriding the `loginTitle` message
instead changes every page's title at once, so it cannot tell sign-in from
registration.

**Generating `login.css`'s colours from `globals.css`.** The Keycloak image is
built from `keycloak/` alone, so a generator would run before the build and its
output would be committed. That output is a copy, and a copy needs this check
anyway. Refinement chose the checker.

## Consequences

- Good, because the first page a stranger sees is Kalia's identity, and a
  re-theme of `globals.css` that forgets the theme now fails `make verify`
  instead of shipping two products.
- Good, because the auth pages lay out the same way every time: one column,
  title in the same place, nothing scrolling, links tall enough to tap.
- Good, because the way out of Keycloak is the lockup, as it is in Kalia's own
  header.
- Bad, because two PatternFly layout properties are now overridden, so a
  Keycloak upgrade that changes PatternFly's login layout or drops
  keycloak.v2's class keys breaks the layout. The e2e spec catches a column
  that moves; a look on every upgrade, which `keycloak/README.md` asks for,
  is still the only check that the page looks like Kalia.
- Bad, because nobody can switch language on Keycloak's own pages. A visitor
  who arrives there other than through Kalia gets the browser's language,
  which Keycloak already infers.
- Neutral, because the wordmark here is the system face and in the app is
  Archivo: the same lockup, not the same letters.
- Neutral, because Keycloak's info, success and warning notices keep
  PatternFly's shape, an alert with an icon, recoloured in Kalia's tokens.
  Its errors carry Kalia's red square (amended 2026-10-23; before that,
  errors kept PatternFly's shape too).
- Bad, because the theme now runs a script, so a keycloak.v2 upgrade that
  renames the `input-error-<field>` ids leaves fields untied from their
  error lines without breaking anything visible. `e2e/keycloak-errors.spec.ts`
  catches it through each field's accessible description.
- Neutral, because named colours (`white`, `red`) in `login.css` escape the
  checker; only hex and colour functions are detected.
- **Revisit trigger:** a Keycloak major upgrade that replaces keycloak.v2 or
  PatternFly 5; a third locale (ADR-0056's own trigger, which would also
  reopen hiding the menu); or a decision to own these pages' markup, which
  would make AUD-42 cheap to fix.

## Evidence

**Amended 2026-10-23**, measured against the compose stack (Keycloak 26.7.0):

- keycloak.v2's `login.ftl` renders a wrong password as the username field's
  error ("Invalid username or password." in `#input-error-username`), with
  no alert on the page. An error alert (`pf-v5-c-alert pf-m-danger`) does
  appear when signing in to a disabled account ("Account is disabled,
  contact your administrator."). The spec checks the sign-in error as a
  field error and the box on that page.
- No keycloak.v2 template sets `aria-describedby`: `field.ftl` and
  `user-profile-commons.ftl` render `aria-invalid="true"` and an
  `aria-live="polite"` line, and the field's accessible description was
  empty. With the script it is the message, in both locales.
- Before the change, all eight tests in `e2e/keycloak-errors.spec.ts` failed
  against the theme. Field edges were ink (`rgb(18, 18, 18)`) and the alert
  had PatternFly's red top border. All pass with it, axe scans included.
- The square on the white page and the white cross on the square are both
  5.61:1, the `--color-destructive` pairings docs/design.md lists.

The product owner compared the built pages in the browser pane with direction B's mockup at both widths on 2026-10-11 and signed them off as matching.

Measured against the compose stack (Keycloak 26.7.0) on 2026-10-11, from the
built theme's pages captured in Chromium in both locales:

- **Placement.** On every page (sign in, register, forgot password, verify
  email, set password) the title starts at x=16, y=124 at 375×812 and at
  x=416, y=172 at 1280×800. The column is 448px wide, and no page's document
  is wider or taller than the window.
- **Targets.** The shortest text link on any page is 24px tall: "Forgot
  Password?" 115×24 and "Register" 60×24 on the sign-in page, where the audit
  measured 111×19 and 59×22. "« Back to Login" on the reset page is a
  PatternFly button 36px tall. The lockup link is 104×32.
- **The link home.** Keycloak sanitises `displayNameHtml` and renders
  `<a href="http://localhost:3000" rel="nofollow">Kalia</a>`.
  `check-keycloak-realm-config.mjs` matched the live realm after import
  (82 values across 3 clients).
- **Contrast** of the pairings the spec computes from the rendered colours,
  by `contrastRatio` in `scripts/check-contrast.mjs`: ink text and ink field
  edges on white 18.73:1, cobalt links, the white label on the cobalt button
  and the cobalt focus ring 8.42:1, grey helper text on white 7.46:1, the red
  required-field asterisk on white 5.61:1, and ink notice text on the sunken
  paper 16.56:1. The axe scans pass on all sixteen combinations of page,
  locale and width.
