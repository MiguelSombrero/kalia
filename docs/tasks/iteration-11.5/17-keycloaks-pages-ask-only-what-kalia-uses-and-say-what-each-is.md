# Task 17: Keycloak's pages ask only for what Kalia uses, and each says what it is

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

Everyone who signs up, from the web or from the app, goes through Keycloak's
pages. On a phone they open in the system's sign-in sheet, where every extra
field is more typing on a small keyboard. Three things are wrong with them:

- **Registration requires a first and last name that Kalia never shows.**
  Every Kalia surface names a person by username
  ([ADR-0071](../../adr/0071-profile-a-name-tag-over-two-visibility-choices-and-one-error-style.md)).
  Keycloak's default user profile still requires both names (AUD-39 in
  [the iteration 7.5 audit](../iteration-7.5/audit.md)). It is also personal
  data that Kalia collects and does not use.
- **Every page is titled "Sign in to Kalia"**, registration and password reset
  included, and the Finnish title reads "Kirjaudu Kalia" (AUD-42). Keycloak
  sets one title for all pages from its `loginTitle` message. A screen reader
  user hears the wrong page name on every page except sign-in.
- **The password-reset page marks its username field `autocomplete="off"`**,
  so a password manager does not offer the username it holds. It is stock
  `keycloak.v2` markup that the theme does not touch
  ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md)).

[Iteration 7.5 task 11](../iteration-7.5/11-keycloak-pages-carry-the-identity.md)
left all three out because it was a visual task
([ADR-0074](../../adr/0074-keycloak-pages-one-open-column-under-the-lockup-with-a-palette-drift-check.md)).

## Scope

- Registration asks for what Kalia uses: a username, an email and a password.
- Each Keycloak page is titled for what it does, in both languages, and the
  Finnish titles read correctly.
- The password-reset page's username field offers the browser's stored
  username, if refinement takes that in.
- The realm's seed, the sign-up restart check and every spec or flow that
  fills the form follow the change.

## Non-goals

- Changing the pages' look ([ADR-0074](../../adr/0074-keycloak-pages-one-open-column-under-the-lockup-with-a-palette-drift-check.md)).
- Keycloak's missing "Back to application" link for the app, which waits on
  universal links or a bounce page ([backlog](../backlog.md#product-gaps-mobile-makes-urgent)).
- Social sign-in or any new identity provider.

## Constraints

- **Self-registration is through Keycloak**
  ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)). Removing the
  name fields changes what registration asks for, so it is an amendment to
  ADR-0055.
- **ADR-0056 declined Kalia's own FreeMarker.** A title per page needs a copy
  of keycloak.v2's `template.ftl`, so it reopens that decision.
- **The realm is reconciled from the repository.** A user-profile change made
  in the console is lost at the next reconcile.
- **Keycloak's version is pinned in `keycloak/Dockerfile`.** The user-profile
  configuration and the theme's message keys are checked against that
  version's documentation, never from memory.
- Existing users already have both names stored. They must still be able to
  sign in, and their stored names are left alone or removed as refinement
  decides.

## Open questions

- **Functional scope.** Should the first and last name be dropped, or kept as
  optional fields? Are the names already stored for existing users deleted,
  given that Kalia never reads them?
- **Constraints and trade-offs.** Is a per-page title worth owning a copy of
  `template.ftl`, which has to be re-read on every Keycloak upgrade? Or is
  there a narrower override at the pinned version, such as a message key per
  page?
- **Interaction and UX.** What should each page's title say, in English and
  Finnish? The candidate pages are sign-in, registration, password reset,
  update password, verify email and error.
- **Functional scope.** Is COULD-26's `autocomplete` change in scope, given
  that it needs the same template override?
- **Module boundaries.** Should one amendment cover ADR-0055 and ADR-0056, or
  should each get its own?

## Acceptance criteria

- [ ] The Playwright sign-up spec registers with only a username, an email and
      a password, and a test checks that the form has no name field
- [ ] A test reads the page title of each Keycloak page refinement lists, in
      both languages, and each matches its agreed copy
- [ ] The app's `sign-in.yaml` Maestro flow on Android passes, and a user
      registered through the shorter form signs in to the app
- [ ] A user created before the change still signs in, verified against the
      running stack
- [ ] The theme's palette drift check and `make verify-fast` are green

## Notes

Provenance: two [backlog](../backlog.md) items, "Registration asks for a first
and last name Kalia never shows" (AUD-39) and "Every Keycloak page is titled
'Sign in to Kalia'" (AUD-42), and [quality backlog](../quality-backlog.md)
COULD-26.
