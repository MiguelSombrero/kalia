# Task 20: Keycloak's field errors carry Kalia's error sign

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

## Why

A visitor who registers with a username that is already taken is told
"Username already exists." That is the right answer, but it reads as a line of
plain black text under the field, with nothing marking it as an error. On
Kalia's own pages the same situation looks different: the field's edge turns
red and the line under it starts with the small red square and white cross
that mean "error" everywhere in the app
([docs/design.md](../../design.md#feedback-and-errors)).

Registration is often a stranger's first form in Kalia, so the one place where
Kalia's error sign is missing is a place almost every new user passes through.
A person scanning the form may not notice the line at all and resubmit the
same name.

[ADR-0074](../../adr/0074-keycloak-pages-one-open-column-under-the-lockup-with-a-palette-drift-check.md)
knowingly left this gap. Its Neutral consequence keeps Keycloak's errors in
PatternFly's shape, "recoloured in Kalia's tokens rather than redrawn as
Kalia's red square". This task asks to close that gap.

## Scope

- An error about one field on Keycloak's pages follows design.md's rule for
  field errors: the field's edge is `--color-destructive`, the line under it
  starts with the small red square and white cross, and its words stay
  `--color-foreground`. The taken-username error on the registration page is
  the case that prompted this. Keycloak's other field errors (a taken email,
  passwords that do not match, a missing required field) render with the
  same markup and get the same treatment.
- The line stays tied to its field, so assistive technology still reads it
  with the field.
- Both locales, at the two widths ADR-0074's branding spec already checks.

## Non-goals

- Changing what any error message says. The words are Keycloak's own
  messages and their translations. [ADR-0061](../../adr/0061-brute-force-lockout-is-temporary-and-disclosed.md)'s
  lockout message is the only override.
- Kalia's own sign-up page (`features/auth/SignUpForm.tsx`), which already
  follows design.md.
- A title per Keycloak page (AUD-42), which stays a
  [backlog](../backlog.md) entry.
- Removing the first- and last-name fields from registration (AUD-39), also a
  backlog entry.

## Constraints

- [ADR-0074](../../adr/0074-keycloak-pages-one-open-column-under-the-lockup-with-a-palette-drift-check.md)'s
  Neutral consequence decided the opposite of this task's Scope. The task
  therefore amends ADR-0074 rather than quietly contradicting it
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md): an accepted ADR
  is amended, not rewritten).
- The theme stays a `keycloak.v2` child with no copied FreeMarker templates
  ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md), as amended
  by ADR-0074). Whatever draws the sign has to be reachable from
  `login.css` and the theme's resources alone.
- **Every colour in `login.css` is a named copy of an app token.**
  `scripts/check-keycloak-theme.mjs` fails on any other hex or colour
  function, but a named colour such as `red` or `white` escapes it silently
  (ADR-0074's own Neutral consequence). So the sign uses only the existing
  `--kalia-color-*` names, adding `--kalia-color-destructive-foreground` if
  it is needed, and no named colours.
- The words of an error are never red (design.md). The theme maps
  `--pf-v5-global--danger-color--200`, which colours them today, to the
  foreground on purpose. Making the text red would trade one departure from
  the app's style for another.
- No raster image may be committed (`CLAUDE.md`). If the cross is an image
  rather than CSS, it is an SVG.
- WCAG 2.2 AA. The red square against the page and the cross against the
  square meet the non-text contrast pairings
  [docs/design.md](../../design.md) already lists for `--color-destructive`.

## Open questions

- **Page-level alerts.** Should Keycloak's whole-action errors follow design.md
  too? An example is "Invalid username or password." above the sign-in
  button, which design.md draws as a box with an ink edge and the red cell.
  Or does this task stay with field errors, the case that was reported?
- **Built alternatives or a direct fix.** design.md already fixes the look,
  so this is written as an ordinary task. Should it instead be a `Kind:
  design` task, with the product owner choosing between built treatments?
  One reason it might be: PatternFly's alert and helper-text markup may not
  take the sign exactly as Kalia's own components draw it.
- **The PatternFly icon.** Keycloak's field line may carry PatternFly's own
  error icon. Is that icon replaced by the red square, or hidden next to it?
  Two error signs on one line would contradict design.md's "one sign".
- **How ADR-0074 records the change.** It needs either an amendment to its
  Neutral consequence, or a new ADR that supersedes that one point. Which
  does the product owner prefer?

## Acceptance criteria

- [ ] Registering with a taken username shows the username field with a
      `--color-destructive` edge, and a line under it that starts with the
      red square and white cross, with its words in the foreground colour.
      Checked in both locales at 375×812 and 1280×800 — Playwright, from the
      rendered colours, confirmed to fail against today's theme
- [ ] Another field error, passwords that do not match, renders the same way
      — Playwright
- [ ] The error line is still announced with its field: the field's
      accessible description contains the message — Playwright
- [ ] The rendered error state passes the axe scan with no violations, in
      both locales and at both widths — Playwright
- [ ] `scripts/check-keycloak-theme.mjs` passes, and `login.css` uses no
      colour other than the `--kalia-color-*` declarations — `make check`
- [ ] ADR-0074 records that Keycloak's field errors carry Kalia's error sign,
      and `node scripts/check-adrs.mjs` passes
- [ ] The product owner has seen the registration page's error state in the
      browser pane at both widths
- [ ] `make verify` is green

## Notes

Reported by the product owner on 2026-10-23 while trying the registration
flow. `e2e/sign-up.spec.ts` already reaches the taken-username state, so it
is a ready-made place to assert the new styling.

The black text itself follows from the theme's mapping of
`--pf-v5-global--danger-color--200` to `--kalia-color-foreground` in
`keycloak/themes/kalia/login/resources/css/login.css`. What is missing is the
sign and the field edge, not a red colour on the words.
