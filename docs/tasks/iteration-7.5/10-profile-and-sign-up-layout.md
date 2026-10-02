# Task 10: Profile and sign-up layout

- **Status:** refined
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3, DW-4, DW-5
- **Kind:** design

## Why

The profile page is two elements. `ProfileView` renders the username as muted
small text and a visibility toggle beneath it, inside the same copy-pasted
`max-w-3xl` container every other page uses. It is not a page; it is a setting
that was given a route because [iteration 6](../iteration-6.md) needed
somewhere to put the public-cellar switch.

That was proportionate then and is not now. A profile is the one place a person
sees themselves in Kalia, and after [iteration 7](../iteration-7.md) their
username appears in a public feed, on a public cellar, and in a URL that
strangers open. The page that owns that identity shows it in grey 14-pixel
text.

The visibility control is the other half of the problem. Making a cellar public
is the most consequential thing a Kalia user can do — it publishes a page to
anyone with the link — and it is a toggle with no surrounding design: nothing
shows what becomes visible, nothing links to the page it creates, and nothing
distinguishes the state before from the state after.

Sign-up rides along here. It is Kalia-rendered
(`app/[locale]/sign-up/page.tsx`) rather than Keycloak's, it is the first
Kalia page a new person ever sees, and it would otherwise be the one surface
this iteration leaves in the old identity — which is why it is in this task
rather than a task of its own.

## Scope

Three account-shaped surfaces, prototyped and chosen: the profile page — what a
person sees about themselves and what they can change — the cellar-visibility
control and the consequences it needs to make visible, and the sign-up page
Kalia renders.

Includes `ProfileViewSkeleton`, the signed-out profile prompt, and the sign-up
page's two error states — the acknowledgement left unticked, and the
rate-limited hand-off.

**Audit findings on these surfaces** ([the audit](audit.md), [DW-5](../iteration-7.5.md)): [AUD-13](audit.md), [AUD-33](audit.md), [AUD-36](audit.md), [AUD-37](audit.md), [AUD-38](audit.md), [AUD-39](audit.md), the profile's and sign-up's share of [AUD-06](audit.md), [AUD-47](audit.md); keep [AUD-49](audit.md). [AUD-33](audit.md), [AUD-39](audit.md) are product findings: the task records for each whether it is fixed or becomes a [backlog](../backlog.md) entry.

## Non-goals

- Adding profile *data*. A display name, a bio, an avatar or a join date are
  backend and model changes; whether the design wants them is a finding this
  task can record, not build.
  [Iteration 7 task 10](../iteration-7/10-person-display-name.md) is the
  dropped task that holds the reasoning about display names, and it is worth
  reading before wishing for one.
- The Keycloak-hosted pages — login, email verification, password reset. They
  are a different origin and are [task 11](11-keycloak-pages-carry-the-identity.md).
  Sign-up is here only because this one page is Kalia's.
- Changing what sign-up asks for, or the verification flow behind it. That is
  [ADR-0055](../../adr/0055-self-registration-via-keycloak.md) and
  [iteration 6.5 task 05](../iteration-6.5/05-self-registration-with-email-verification.md).
- Account deletion, data export and consent. The [backlog](../backlog.md)'s
  GDPR entry owns them and they will change this page when they land.

## Constraints

- **A profile may show only what is already public.** What the `profile` module
  exposes and why is
  [ADR-0049](../../adr/0049-profile-module-and-public-identity.md); a person is
  named by username, decided in [iteration 7](../iteration-7.md) on the grounds
  that it publishes strictly less than a real name.
- The visibility toggle writes through the same rules the public cellar reads
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)). A design that
  previews the public cellar from inside the profile must not become a way to
  see a cellar that is not public.
- **Kalia's sign-up page collects no credentials.** It is one acknowledgement
  checkbox and a button, posted to the `startSignUp` Server Action, which
  rate-limits the attempt and hands the visitor to Keycloak's registration
  page, where the email and password are actually entered
  ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)). Its two
  failures come back as an `?error=` parameter (`agree-required`,
  `rate-limited`). The registration form itself is
  [task 11](11-keycloak-pages-carry-the-identity.md)'s.
- **A sign-up page must not become a second front door with different rules.**
  If a redesign has it say anything about passwords or email, that has to be
  what Keycloak actually enforces ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)), or
  it is a lie that fails only when a real person hits it.
- The shell from [task 06](06-page-shell.md) and the identity from
  [task 03](03-visual-identity.md) are inherited, not re-decided.

- The agreed widths, reserved image shapes and the 24×24 minimum target size
  are iteration-wide decisions recorded in
  [the iteration index](../iteration-7.5.md).

Decided with the product owner in refinement, 2026-10-01:

- **Sign-up and the Keycloak pages share one "single form, centred" layout**,
  so the hand-off from Kalia's page to Keycloak's feels continuous. The two
  are recognisably related rather than identical, because Keycloak's pages
  stay inside `keycloak.v2`'s documented hooks
  ([task 11](11-keycloak-pages-carry-the-identity.md)). Whichever of the two
  tasks runs first proposes the layout; the second inherits it.
- **The profile carries the person's image slot** from
  [task 04](04-imagery-iconography-and-the-mark.md), filled by its generated
  placeholder.
- **What a profile is for, whether it shows the person their own public
  cellar, and how the visibility control is presented**, including whether
  making a cellar public asks for confirmation, are prototyped as directions.
  Any preview of the public cellar shows only what is public, per the
  Constraints above.
- **Sign-out stays in the header** ([task 06](06-page-shell.md)). The profile
  may also offer it if the chosen direction shows it there.
- **What a new person sees right after signing up is not this task's.**
  Where the registration hand-off lands them is unchanged, and their first
  look at their own cellar is its empty state, which
  [task 09](09-cellar-layout.md) owns.

## Open questions

**None.**

## Acceptance criteria

- [ ] The product owner chose from built alternatives for the profile page and
      for how cellar visibility is presented
- [ ] The visibility control's consequence is visible from the profile — or the
      decision that it should not be is recorded
- [ ] Toggling visibility still publishes and unpublishes the public cellar,
      and a non-public cellar is still indistinguishable from a missing one,
      covered by the existing tests updated rather than deleted
- [ ] The sign-up page renders in the new identity and the shared single-form
      layout, and anything it states about credentials matches what Keycloak
      enforces — verified against the running realm in a browser, not against
      the copy
- [ ] `ProfileViewSkeleton` matches the layout that ships, with its test
      asserting the new shape
- [ ] The signed-out profile prompt, the `agree-required` error and the
      `rate-limited` error each render deliberately, covered by tests
- [ ] All three surfaces work at both agreed widths and the
      `@axe-core/playwright` scans pass at each
- [ ] The findings [task 02](02-design-audit-baseline.md) recorded on the
      profile and sign-up pages are each fixed or carry a written decision not
      to fix them
- [ ] `make verify` is green

## Notes

Sign-up is folded in here rather than given its own task, decided with the
product owner on 2026-09-12: a separate task for one form was rejected as too
granular, but leaving the page out entirely would have left
[DW-3](../iteration-7.5.md) unachievable — it is one of the surfaces that must
not be left in the old identity.
