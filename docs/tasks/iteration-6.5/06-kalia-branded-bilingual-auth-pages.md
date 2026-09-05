# Task 06: Kalia-branded, bilingual Keycloak pages

- **Status:** refined
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

**None.**

Resolved during refinement (2026-09-05):

1. **How much theme?** Decided: stock `keycloak.v2` plus a logo and a small
   stylesheet override — not a full custom theme.
2. **How does Keycloak learn the user's language?** Decided: both — enable
   `internationalizationEnabled` with `fi`/`en`, **and** pass `ui_locales`
   from the sign-in Server Action (a change in `frontend/auth.ts`), so
   Keycloak follows the locale the user was actually reading rather than
   guessing from the browser. This follows the existing precedent of the app
   itself trusting its own resolved locale over a fresh browser inference.
3. **Are Keycloak's stock Finnish translations good enough?** Decided: yes,
   use them as-is — no override, no second Finnish translation surface to
   maintain in step with `frontend/i18n/locales/fi/`.
4. **Are the verification and reset emails localised too?** Decided: yes.
5. **How is any of this tested?** Playwright plus `@axe-core/playwright`,
   consistent with the rest of the app's E2E accessibility coverage — no new
   testing mechanism needed.
6. **Does the locale survive the round trip?** Verify as part of the same
   Playwright coverage; already required by this task's own acceptance
   criteria.

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
