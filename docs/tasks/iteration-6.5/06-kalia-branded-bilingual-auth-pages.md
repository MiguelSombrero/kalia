# Task 06: Kalia-branded, bilingual Keycloak pages

- **Status:** needs-refinement
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** DW-5

## Why

Signing in is the one place a Kalia user leaves Kalia. The browser goes to
Keycloak on a different origin, sees Keycloak's stock page, and comes back.
That was survivable while the only person signing in was the author and the
only credential was a fixture.

[Task 05](05-self-registration-with-email-verification.md) makes those pages
the front door: the first thing a new user ever sees of Kalia is a page that
does not look like Kalia, does not use its type or colour, and — the sharper
half — **is only in English.**

Kalia is bilingual. `frontend/i18n/locales/` carries `fi` and `en`, the locale
is in the URL, and [ADR-0011](../../adr/0011-i18next-localization.md) governs
every string the app renders. None of that reaches Keycloak: it has its own
message bundles, and `keycloak/realm-export.json` does not enable
internationalisation at all. So a Finnish user follows a Finnish page to an
English login form, registers in English, receives an English verification
email, and returns to a Finnish app. That is not a theming nicety; it is a
localisation hole the app's own tooling cannot see.

## Scope

The pages Keycloak renders on Kalia's behalf — login, registration, email
verification, password reset, and the mail those flows send — are recognisably
Kalia and appear in the language the user was already reading.

## Non-goals

- Reproducing Kalia's design system inside Keycloak. Recognisably Kalia is the
  bar; pixel parity with [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s
  primitives is not, and chasing it is how this task becomes an iteration.
- Moving these pages into Next.js. That is
  [task 05](05-self-registration-with-email-verification.md)'s rejected
  admin-API approach arriving through the back door.
- Any language beyond `fi` and `en`.
- Kalia's own pages, which already follow ADR-0011.

## Constraints

- **A Keycloak theme is a new artifact class in this repository.** FreeMarker
  templates and CSS, on a different origin, outside the design-token system,
  unreachable by Vitest and `jest-axe`, and re-verified on every Keycloak
  upgrade. That cost is the reason to keep the theme minimal.
- **Two translation systems, permanently.** Keycloak's message properties are
  not i18next resources and cannot be made into them. Whatever is chosen,
  [ADR-0020](../../adr/0020-documentation-roles.md)'s one-home rule means
  someone has to say where an auth-page string lives and how the two are kept
  from drifting.
- Accessibility is not optional because the page is Keycloak's. The rest of the
  app is held to WCAG 2.1 AA and enforces it in tests
  (`docs/architecture.md` §7); a login page outside that enforcement is the
  weakest page in the product.
- Kalia's CSP does not apply on Keycloak's origin, and Keycloak's own
  `sslRequired`/hostname settings do —
  [ADR-0016](../../adr/0016-security-response-headers.md) governs Kalia's
  responses only.
- Theme configuration is realm configuration
  ([task 03](03-prevent-realm-configuration-drift.md)).

## Open questions

1. **How much theme?** Stock `keycloak.v2` with a logo and a small stylesheet
   override is a few files. A full custom theme is a subproject. Where between
   them is a product-owner judgement about how much the seam matters.
2. **How does Keycloak learn the user's language?** Enabling
   `internationalizationEnabled` with `fi` and `en` gets Keycloak's own
   translated strings; passing `ui_locales` from the sign-in Server Action
   makes it follow the locale the user was actually reading rather than their
   browser's guess. The second needs a change in `frontend/auth.ts`.
3. **Are Keycloak's stock Finnish translations good enough,** or does Kalia
   override them? Overriding means owning them; not overriding means the login
   page speaks in a voice the rest of the app does not.
4. **Are the verification and reset emails localised too?** They are Keycloak
   templates as well, and an English email after a Finnish registration is the
   same hole one step later.
5. **How is any of this tested?** Playwright can drive the pages on the other
   origin and `@axe-core/playwright` is already a dependency, so an
   accessibility assertion on the login page is reachable — but nothing checks
   a Keycloak message bundle for a missing key, and a missing key renders as a
   raw identifier rather than failing.
6. **Does the locale survive the round trip?** A user reading `/fi` who signs
   in should come back to `/fi`. Worth checking that it does today, before
   changing anything.

## Acceptance criteria

- [ ] Signing in from a Finnish page shows a Finnish Keycloak login form, and
      from an English page an English one — verified in a browser, both ways
- [ ] Registration and password-reset pages, and the emails they send, follow
      the same language
- [ ] A Playwright spec asserts the language of the Keycloak page reached from
      each locale, and was confirmed to fail before the change
- [ ] An `@axe-core/playwright` check runs against the login and registration
      pages with no violations at WCAG 2.1 AA
- [ ] A user landing on `/fi` and signing in returns to `/fi`, covered by a
      test
- [ ] Where auth-page strings live, and how they stay in step with
      `frontend/i18n/locales/`, is documented in the home
      [ADR-0020](../../adr/0020-documentation-roles.md) prescribes

## Notes

Found while sketching this iteration on 2026-08-29. The theming half was
already visible from the options analysis; the localisation half was not, and
is the more serious of the two — a design seam is cosmetic, an untranslated
front door is a feature the app claims to have and does not.
