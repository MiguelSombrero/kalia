# ADR-0056: Kalia's Keycloak pages — a minimal theme, realm-level i18n, and Keycloak's own translations

- **Status:** accepted
- **Date:** 2026-09-08

## Context

[ADR-0055](0055-self-registration-via-keycloak.md) makes Keycloak's own pages
Kalia's front door: a visitor with no account first meets Kalia on Keycloak's
login and registration screens, on a different origin. Those screens are stock
Keycloak — not Kalia's type, colour or logo — and, the sharper problem, they
are English only.

Kalia is bilingual by construction. Every route lives under `app/[locale]/`,
the locale is in the URL, and [ADR-0011](0011-i18next-localization.md) governs
every string the app itself renders, Finnish as a full peer of English. None
of that reaches Keycloak: it has its own message bundles, its own theming
system, and `keycloak/realm-export.json` did not enable internationalisation
at all. So a Finnish visitor followed a Finnish page to an English login form,
registered in English, and got an English verification email before returning
to a Finnish app.

The forces on the answer:

- A Keycloak theme is a **new artifact class** in this repository — FreeMarker
  and CSS, on a different origin, outside the design-token system
  ([ADR-0021](0021-design-tokens-ui-primitives.md)), unreachable by Vitest and
  `jest-axe`, and re-verified on every Keycloak upgrade. Every line of it is a
  standing cost.
- There are now **two translation systems, permanently.** Keycloak's message
  `.properties` are not i18next resources and cannot be made into them.
  [ADR-0020](0020-documentation-roles.md)'s one-home rule still demands a
  single answer to where an auth-page string lives.
- Keycloak's pages are outside the app's WCAG 2.1 AA enforcement
  (`docs/architecture.md` §7), which makes an unchecked login page the weakest
  page in the product.

## Decision

**Kalia ships a deliberately minimal Keycloak login theme and enables the
realm's own internationalisation; it writes no auth-page translations of its
own and overrides none of Keycloak's.**

- **The theme is stock `keycloak.v2` plus a logo and a small stylesheet.**
  `keycloak/themes/kalia/login/` sets `parent=keycloak.v2`, keeps that
  theme's entire `styles.css` on the list, and layers one `login.css` after
  it that touches only the brand colour (driven through PatternFly's own
  `--pf-v5-global--primary-color--100` and keycloak.v2's own
  `--keycloak-card-top-color`), the cream page background, and the Kalia
  wordmark in the header. keycloak.v2's dark-mode swap is disabled to match
  the app's light-only palette. Every form control, and PatternFly's
  WCAG-checked focus behaviour, stays stock. Reproducing Kalia's design
  system inside Keycloak is explicitly not the bar — "recognisably Kalia" is.
- **`loginTheme`, `internationalizationEnabled`, `supportedLocales`
  (`en`, `fi`) and `defaultLocale` (`en`) are realm settings** in
  `keycloak/realm-export.json`, so they inherit
  [ADR-0054](0054-keycloak-config-cli-realm-management.md)'s drift check with
  no change to `scripts/check-keycloak-realm-config.mjs` — each is a plain
  `RealmRepresentation` field it already compares. The realm also gains
  `displayName: "Kalia"`, which is what Keycloak's stock email templates
  interpolate as the service name, and `resetPasswordAllowed: true`, without
  which the "forgot password?" link — one of the pages this task's scope
  names — never renders.
- **Keycloak learns the locale two ways, both.** The realm's own
  internationalisation (browser `Accept-Language`, a language selector on the
  page, a persisted per-user `locale` attribute) is the baseline; on top of
  it, the sign-in Server Actions (`features/auth`, `features/cellar`,
  `features/profile`) pass `ui_locales` to `signIn()` — the locale the
  visitor was actually reading in the URL, carried on a hidden form field —
  so Keycloak follows that rather than guessing from a fresh browser
  inference. This mirrors the app already trusting its own resolved locale
  over `Accept-Language`. The same actions pass a locale-prefixed
  `redirectTo`, so a visitor who started on `/fi` returns to `/fi`.
- **Auth-page strings live in Keycloak's own message bundles, and Kalia keeps
  none of its own.** Keycloak ships `en` and `fi` translations for every
  login, registration, verification and password-reset string; Kalia's theme
  adds no `messages/` directory and overrides no key. There is therefore
  nothing to keep in step with `frontend/i18n/locales/` — the two bundles
  cover disjoint surfaces (Keycloak owns the auth pages, i18next owns the
  app), and the way they are kept from drifting is that neither ever
  translates the other's strings. The one Kalia-authored piece of the auth
  pages, the wordmark, is an image with no text to translate.
- **The verification and password-reset emails are localised by the same
  mechanism** — Keycloak sends them against the recipient's stored `locale`,
  set when they registered through a language-specific page — and are not
  themed further. "From: Kalia" (the realm's SMTP `fromDisplayName`, already
  set) plus `displayName` in the body is the branding bar for mail.

## Alternatives considered

**A full custom Keycloak theme matching ADR-0021's primitives.** Rejected as
the way this task becomes an iteration: pixel parity with the app's buttons,
inputs and spacing means re-implementing PatternFly components in FreeMarker
and re-checking them for accessibility on every Keycloak upgrade, for a set of
pages a signed-in user sees once. The logo, colour and ground carry the
recognition; the rest is cost without a matching benefit.

**Moving these pages into Next.js** so they inherit i18next and the design
system directly. This is [ADR-0055](0055-self-registration-via-keycloak.md)'s
already-rejected Admin-API approach arriving through the back door — it needs
the `manage-users` service-account credential that ADR spent its length
arguing out of the system. Not reconsidered here.

**Overriding Keycloak's Finnish translations** with Kalia-authored strings, so
the auth-page wording matches `frontend/i18n/locales/fi/` in tone. Rejected
because it creates exactly the second translation surface the constraints warn
against: a `messages_fi.properties` in the theme that must be reviewed against
Keycloak's own bundle on every upgrade (new keys, changed defaults) and
against the app's Finnish on every copy change, for a wording difference no
user comparing the two pages side by side would notice. Keycloak's stock
Finnish is correct and complete; using it as-is is the choice that stays cheap.

**Relying only on `internationalizationEnabled` without `ui_locales`.**
Keycloak would then fall back to the browser's `Accept-Language`, which is
exactly the fresh-inference guess [ADR-0011](0011-i18next-localization.md)
already rejected for the app itself — a visitor who switched Kalia to Finnish
on an English-default browser would get an English login page. Passing
`ui_locales` is a few lines in Server Actions that already exist.

## Consequences

- Good, because a Finnish visitor now stays in Finnish across the whole
  journey — app to login to registration to verification email and back —
  with no Kalia-maintained Finnish auth-page translation to keep current.
- Good, because the theme is small enough to re-verify by eye on a Keycloak
  upgrade: a parent theme, one stylesheet touching a handful of documented
  custom properties, and one SVG.
- Bad, because "recognisably Kalia" is a judgement, not a check. Nothing fails
  if a future Keycloak changes keycloak.v2's markup enough that `login.css`
  no longer bites; the Playwright accessibility scan would still pass on an
  unstyled page. The e2e language assertions catch a broken locale, not a
  broken look.
- Bad, because the theme's CSS lives outside the design-token system it
  visually imitates. A change to `--primary` in `frontend/app/globals.css`
  does not reach `keycloak/themes/kalia/login/resources/css/login.css`; the
  mint hex is duplicated there by hand, and a re-theme has two places to
  touch. Accepted as the cost of the pages being Keycloak's, not the app's.
- Neutral, because the emails are localised but not visually themed beyond the
  sender name. If branded HTML mail is ever wanted, it is a Keycloak email
  theme — more FreeMarker — and a separate decision.
- Neutral, because `ui_locales` is passed from four Server Actions that cannot
  share code (features cannot import each other, and a re-exported Server
  Action breaks Next's action-ID resolution — see the comments in
  `features/*/actions.ts`), so the three-line locale-from-form helper is
  duplicated per feature, as the sign-in redirect logic already was.
- **Revisit trigger:** a third supported locale, or a decision to brand the
  emails, reopens this — the first because Keycloak's coverage of a smaller
  language may not be complete enough to use unedited, the second because it
  needs the email-theme FreeMarker this ADR declines.

## Evidence

**keycloak.v2 in Keycloak 26.7.0 exposes the hooks this theme uses.** Verified
by extracting `org.keycloak.keycloak-themes-26.7.0.jar` from the
`quay.io/keycloak/keycloak:26.7.0` image: `login/resources/css/styles.css`
defines `--keycloak-card-top-color`, `--keycloak-bg-logo-url` and
`--keycloak-logo-url` on `:root`, and `login/template.ftl` renders the header
as `<div id="kc-header-wrapper">` containing `msg("loginTitleHtml", ...)` —
empty when the realm sets no `displayNameHtml`, which is why `login.css` can
repurpose that element as the wordmark. The theme declares no `logo`
`theme.properties` key in this version, so the CSS-background approach is the
available one.

**Keycloak ships complete `en` and `fi` login bundles.** The same jar carries
`theme/base/login/messages/messages_fi.properties` with translations for
`doLogIn`, `usernameOrEmail`, `doRegister`, `emailForgotTitle`, `password` and
the rest — the full set the login, registration and reset flows render.

**`signIn()`'s third argument reaches Keycloak.** `next-auth@5.0.0-beta.32`'s
`signIn(provider, options, authorizationParams)` builds
`/api/auth/signin/<provider>?<authorizationParams>`, and `@auth/core`'s
`authorization-url.js` merges that query into the provider's authorization
request (`Object.assign(params, ..., query)`), for both the `keycloak`
provider and the custom-`authorization.url` `keycloak-register` provider.
