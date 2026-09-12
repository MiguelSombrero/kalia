# Task 10: Profile and sign-up layout

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3, DW-4, DW-5

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
page's error and pending states.

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
- Sign-up is a `react-hook-form` + Zod form
  ([ADR-0010](../../adr/0010-react-hook-form-zod.md)) — a mutation, not a
  navigation — and its failures surface as a tagged `ApiError`
  ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- **A sign-up page must not become a second front door with different rules.**
  Whatever it says about passwords or email has to be what Keycloak actually
  enforces ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)), or
  it is a lie that fails only when a real person hits it.
- The shell from [task 06](06-page-shell.md) and the identity from
  [task 03](03-visual-identity.md) are inherited, not re-decided.

## Open questions

1. **What is a profile page for?** Somewhere to change settings, somewhere to
   see yourself as others see you, or the private twin of your public cellar.
   Three different pages, and today's is an accidental version of the first.
2. **Does a profile show the person their own public cellar?** A link, a
   preview, or nothing. This is the only thing that would make the visibility
   toggle's consequence concrete.
3. **How is a consequential toggle presented?** Making a cellar public
   publishes a page. Whether that deserves a confirmation, a clear
   before/after, or simply better wording and placement, is worth prototyping
   rather than assuming.
4. **Is the profile the right home for sign-out?** Sign-out lives in the header
   today. Most products put it on the account page too, and the header is about
   to be redesigned in [task 06](06-page-shell.md).
5. **What does the profile look like when there is nothing to put on it?**
   Which is today, and — unless non-goal one changes — after this task too. A
   design that is honest about a two-field profile is better than one that pads
   it.
6. **Does sign-up share a layout with anything?** It is a single form on an
   otherwise empty page, and so is the sign-in page Keycloak renders
   ([task 11](11-keycloak-pages-carry-the-identity.md)). Whether Kalia has a
   "one form, nothing else" layout that both use is a question the two tasks
   should answer together.
7. **What does a person see immediately after signing up?** The flow ends at
   their own empty cellar ([iteration 6.5](../iteration-6.5.md) DW-3), which is
   the emptiest page in the product and the one moment a new user is most
   likely to leave. Whether that is this task's problem or
   [task 09](09-cellar-layout.md)'s is worth settling in refinement.

## Acceptance criteria

- [ ] The product owner chose from built alternatives for the profile page and
      for how cellar visibility is presented
- [ ] The visibility control's consequence is visible from the profile — or the
      decision that it should not be is recorded
- [ ] Toggling visibility still publishes and unpublishes the public cellar,
      and a non-public cellar is still indistinguishable from a missing one,
      covered by the existing tests updated rather than deleted
- [ ] The sign-up page renders in the new identity, and anything it states
      about credentials matches what Keycloak enforces — verified against the
      running realm in a browser, not against the copy
- [ ] `ProfileViewSkeleton` matches the layout that ships, with its test
      asserting the new shape
- [ ] The signed-out profile prompt, a sign-up validation failure and a
      sign-up server failure each render deliberately, covered by tests
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
