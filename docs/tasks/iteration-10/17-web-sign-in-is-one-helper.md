# Task 17: Web sign-in is one helper, and a cross-site link cannot sign anyone out

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

The web's sign-in has three loose ends:

- **A link signs the visitor out.** Any cross-site link to
  `/api/auth/callback/keycloak` signs the visitor out:
  `app/api/auth/[...nextauth]/route.ts` ends the session on any matching
  `GET` before Auth.js validates state or PKCE, and the `SameSite=Lax` cookie
  rides a top-level navigation (COULD-73).
- **Sign-in is written four times.** `features/auth/actions.ts`,
  `catalog/actions.ts`, `profile/actions.ts` and `cellar/actions.ts` each parse
  the locale and build the post-sign-in redirect their own way; a helper in
  `lib/auth/` built on `lib/routes.ts` fits `web/README.md`'s own "second user
  moves it to `lib/`" rule (COULD-82).
- **One of them builds a route by hand.** `features/cellar/actions.ts` builds
  `` `/${locale}/cellar` `` though `ownCellarHref` exists in `lib/routes.ts`,
  against `docs/architecture.md` §5's route-helper rule (COULD-86).

The web is maintained without being held at feature parity with mobile; this
is the kind of upkeep that keeps it cheap to maintain.

## Scope

Every web action that starts a sign-in goes through one helper that returns the
viewer to the page they came from in their locale, and the callback route ends
a session only for a sign-in this browser started.

## Constraints

- This Next.js version postdates model training — check
  `node_modules/next/dist/docs/` at the repository root before relying on
  memory; Auth.js's callback behaviour likewise from its installed version.
- [ADR-0029](../../adr/0029-silent-token-refresh.md) and
  [iteration 8.5 task 13](../iteration-8.5/13-sessions-and-stack-credentials-hardened.md):
  why the callback ends the previous session at all — signing in while signed
  in must still drop the previous user's tokens (COULD-64).
- Routes come from `lib/routes.ts` (`docs/architecture.md` §5).

**Decided at refinement, 2026-11-01** (product owner):

- **The callback ends a previous session only after Auth.js has validated the
  callback** — state and PKCE — never on the request alone. If the installed
  Auth.js offers no point after validation to do it from, the task stops and
  returns to the product owner rather than falling back to the state cookie.

## Open questions

**None.**

## Acceptance criteria

- [ ] A test shows a callback `GET` without this browser's sign-in state
      leaving the session intact, and it failed before the fix
- [ ] The Playwright test of signing in while signed in as another user still
      passes
- [ ] The four actions call one helper in `lib/auth/`, which has unit tests
      for the locale and the return path
- [ ] No feature builds a locale-prefixed route by hand, checked by the
      existing lint or a test
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-73, COULD-82 and
COULD-86.
