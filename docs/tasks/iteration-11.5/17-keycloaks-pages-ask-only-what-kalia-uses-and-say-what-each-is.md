# Task 17: Keycloak's pages ask only for what Kalia uses, and each says what it is

- **Status:** done
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
  username.
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
- **Decided at refinement (2026-11-15):**
  - The first and last name are dropped from registration, not kept as
    optional. Names already stored for existing users are left alone: only
    local and test users exist, and Kalia never reads them.
  - A title per page uses the narrowest override the pinned Keycloak offers,
    such as a message key per page, if one exists. Otherwise the theme owns a
    copy of `keycloak.v2`'s `template.ftl`, and a test fails when the copy no
    longer matches the upstream template it was taken from, so an upgrade
    cannot leave it stale.
  - COULD-26's `autocomplete` fix is in, through the same override.
  - ADR-0055 and ADR-0056 each get an amendment.
  - The agreed titles (English / Finnish):

    | Page | English | Finnish |
    |---|---|---|
    | Sign-in | Sign in to Kalia | Kirjaudu Kaliaan |
    | Registration | Create a Kalia account | Luo Kalia-tili |
    | Password reset | Forgot your password? | Unohtuiko salasana? |
    | Update password | Choose a new password | Valitse uusi salasana |
    | Verify email | Confirm your email address | Vahvista sähköpostiosoitteesi |
    | Error | Something went wrong | Jotain meni vikaan |

## Open questions

**None.**

## Acceptance criteria

- [x] The Playwright sign-up spec registers with only a username, an email and
      a password, and a test checks that the form has no name field
- [x] A test reads the page title of each of the six Keycloak pages in Constraints, in
      both languages, and each matches its agreed copy
- [x] A test finds the password-reset page's username field without
      `autocomplete="off"`
- [x] If the theme owns a copy of `template.ftl`, a test fails when the copy
      differs from the pinned Keycloak's upstream template it was taken from,
      and was seen to fail on an edited copy
- [x] The app's `sign-in.yaml` Maestro flow on Android passes, and a user
      registered through the shorter form signs in to the app
- [x] A user created before the change, with both names stored, still signs
      in, verified against the running stack
- [x] The theme's palette drift check and `make verify-fast` are green

## Notes

Provenance: two [backlog](../backlog.md) items, "Registration asks for a first
and last name Kalia never shows" (AUD-39) and "Every Keycloak page is titled
'Sign in to Kalia'" (AUD-42), and [quality backlog](../quality-backlog.md)
COULD-26.
