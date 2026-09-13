# Task 15: Prefer the `__Secure-` session cookie over the unprefixed one

- **Status:** done
- **Iteration:** [7](../iteration-7.md)
- **Covers:** none

## Why

`frontend/lib/auth/sessionCookie.ts` looks for the session cookie in the order
`["authjs.session-token", "__Secure-authjs.session-token"]` and takes the first
one that is defined — the **opposite** of Auth.js, which under HTTPS issues and
reads only the `__Secure-` name.

Harmless today, because nothing deploys with TLS and the `__Secure-` cookie is
never issued. The moment TLS lands it is a session-fixation hole with an
unusually bad payoff: an attacker who can write a cookie for the registrable
domain — a subdomain they control, a network position on a sibling host — but
who cannot read the victim's, sets the *unprefixed* name. The victim's browser
then sends both. `currentSessionToken` returns the attacker's, `auth()`
resolves the attacker's session, and every backend call the victim's page makes
carries the **attacker's** bearer token. The victim adds a bottle and it lands
in the attacker's cellar. Nothing looks wrong to either party.

The cookie prefix exists precisely to prevent this, and the fix is to read them
in the order the prefix's guarantee implies. `sessionCookie.test.ts` never
covers the both-present case, which is why the ordering has never been
questioned.

This is the most severe live finding in the quality backlog, its fix is one
line, and it is worth doing before rather than after the deployment work that
makes it exploitable.

(Quality backlog SHOULD-24.)

## Scope

Reading the session cookie in an order that cannot be subverted by an attacker
who can only *write* cookies, and a test for the case that makes it matter.

## Non-goals

- TLS, the deployment target, or `sslRequired` — [backlog](../backlog.md) and
  [quality backlog SHOULD-25](../quality-backlog.md). This task makes the code
  correct for the day TLS arrives; it does not bring that day forward.
- Chunked `.0`/`.1` cookie variants. They apply to the JWT strategy, not this
  app's database sessions
  ([ADR-0025](../../adr/0025-authjs-valkey-adapter.md)) — the existing comment
  says so and stays true.
- Anything else about how tokens are stored
  ([ADR-0030](../../adr/0030-per-session-token-storage.md)) or how Valkey is
  protected ([quality backlog SHOULD-26](../quality-backlog.md)).

## Constraints

- **The fix is an ordering, and an ordering is exactly the kind of thing a test
  that checks one cookie at a time cannot see.** The test that matters sets
  *both* names to different values and asserts which one wins; every existing
  test passes against the broken order.
- Auth.js's own behaviour is the reference: `__Secure-` under HTTPS, unprefixed
  otherwise (`@auth/core`'s `defaultCookies`). Kalia reads the cookie directly
  rather than through Auth.js ([ADR-0030](../../adr/0030-per-session-token-storage.md)),
  which is why this divergence was possible at all — the comment in the file
  already documents the upstream rule it then fails to follow.
- Local development is HTTP and must keep working. A fix that only reads
  `__Secure-` breaks every developer.

**Decided 2026-09-12.**

- **Prefer `__Secure-`, keep reading both** (question 1, product owner). The
  fix is the one-line reordering. It closes the attack completely: the
  prefixed cookie cannot be set over plain HTTP, so preferring it means an
  attacker's unprefixed cookie is never the one that wins, whatever else is
  present. Ignoring the unprefixed name entirely under HTTPS was rejected —
  it needs the app to know its own scheme reliably, which behind a proxy
  depends on forwarded headers being right, and getting *that* wrong signs
  every user out rather than erroring visibly.
- **Nothing else in the frontend reads a cookie by name from a list** (question
  2, answered during refinement by search, not by asking):
  `frontend/lib/auth/sessionCookie.ts` is the only `cookieStore.get` call
  outside `vitest.setup.ts`'s mock. The two Playwright specs that touch cookies
  read them from the browser context, not by this pattern. So there is no
  second instance of this bug to fix and none to leave for a later sweep.

## Open questions

**None.**

## Acceptance criteria

- [x] With both cookie names present and carrying different values, the
      `__Secure-` value is the one used — unit test, confirmed to fail against
      the current ordering
- [x] With only the unprefixed name present, it is still used, so local HTTP
      development is unaffected — unit test
- [x] With only the `__Secure-` name present, it is used — unit test
- [x] Sign-in, a cellar read and sign-out still work end to end against the
      HTTP dev stack — Playwright, since this sits under every authenticated
      request
- [x] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-24, confirmed
2026-08-30 and re-confirmed 2026-09-12 — `SESSION_COOKIE_NAMES` still lists the
unprefixed name first.
