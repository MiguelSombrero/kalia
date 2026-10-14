# Task 11: The BFF forwards only what it has checked, and fails closed on tokens

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

## Why

The BFF holds the user's bearer token and attaches it to every backend call
([ADR-0003](../../adr/0003-bff-pattern.md)). Three findings are about the
BFF's side of that arrangement: what it sends, where it sends it, and what it
does when the token's state is unknown.

**A crafted path can steer the visitor's token to a different backend
route.** The generated client interpolates path parameters without encoding
them (`` `/api/v1/cellars/${username}` `` at
`lib/api/generated/public-cellar/public-cellar.ts:73`; likewise
`cellar/cellar.ts:202,305` and `catalog/catalog.ts:311`). `lib/api/mutator.ts:23-27`
then attaches the caller's token to whatever URL results. The public-cellar
page passes the raw route parameter, and the bottle actions pass
client-supplied ids unchecked (`features/cellar/actions.ts:60-72`); only
`features/catalog/api.ts:67` validates its id. No data crosses users today,
because the backend authorizes by token. But it is a confused-deputy primitive
that every future route inherits. (Verified in code, not against a live
stack.)

**The open-redirect guard has no test.** `beerReturnPath` and `UUID_PATTERN`
(`features/cellar/actions.ts:34-49`) keep a caller-supplied value out of
`signIn`'s `redirectTo`. The only tests that touch them mock `./actions` away
entirely (`AddToCellarButton.test.tsx:5`, `SignInPrompt.test.tsx`), so
deleting the guard fails nothing.

**A token with no recorded expiry counts as fresh forever.** `hasExpired`
(`lib/api/accessToken.ts:68-70`) returns `false` unless `expires_at` is a
number. A stored account missing that field never triggers `renew()`, so the
BFF sends a dead token indefinitely. Every backend call then 401s, the user
sees an empty cellar, and [ADR-0029](../../adr/0029-silent-token-refresh.md)'s
refresh path is silently dead for that session. The behaviour is deliberate;
what is wrong is that it fails open.

(Quality backlog COULD-28, SHOULD-39 and COULD-19.)

## Scope

No caller-supplied value can change which backend route the BFF calls, the
sign-in redirect guard is pinned by tests that exercise the real guard, and a
session whose token state is unknown gets a refresh or a sign-out rather than
a dead token.

## Non-goals

- A caller-supplied `Authorization` header overriding the session's token —
  quality backlog COULD-20, still `[needs decision]`.
- Rate limiting the back-channel logout route — quality backlog SHOULD-27.
- Bounding the username on the backend — [task 09](09-a-username-is-a-permanent-address.md).

## Constraints

- The generated client is read-only
  ([ADR-0012](../../adr/0012-orval-api-client.md), enforced by
  `.claude/settings.json`). A fix that belongs in the generated code is made
  through orval's configuration or the mutator, never by hand.
- A failure is a typed API failure
  ([ADR-0023](../../adr/0023-typed-api-failures.md)), not a thrown string.
- Token refresh follows [ADR-0029](../../adr/0029-silent-token-refresh.md) and
  per-session storage follows
  [ADR-0030](../../adr/0030-per-session-token-storage.md).
- A test that mocks `./actions` cannot test the guard inside it. The new tests
  call the real module.

## Open questions

1. **Where is the path fixed: encoding in the mutator for every route, or
   validating at each call site?** The mutator protects routes nobody has
   written yet. Call-site checks give a better error, but only where someone
   remembered to add one.
2. **What does a token with no expiry do: renew immediately, or end the
   session?** Renewing is the gentler option. Ending the session is the
   honest one if the stored account is corrupt.

## Acceptance criteria

- [ ] A path parameter containing `/`, `..`, `?` or `#` cannot make the BFF
      call any route other than the one its function names — vitest tests on
      the mutator or the call sites (question 1), confirmed to fail against
      today's interpolation
- [ ] `beerReturnPath` refuses an off-site URL, a protocol-relative URL and a
      non-UUID id, and accepts a valid beer id — vitest tests against the real
      module, confirmed to fail with the guard removed
- [ ] A stored account with no `expires_at` behaves as question 2 decides
      rather than sending its token unchanged — vitest test, confirmed to
      fail against today's `hasExpired`
- [ ] Signing in from a beer page still returns there, in a browser — the
      existing Playwright sign-in spec passes
- [ ] `npm test` and `npm run test:e2e` are green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-28, SHOULD-39 and
COULD-19, all confirmed 2026-10-14. Merged because all three are the BFF's
handling of the token it holds on the user's behalf, in two neighbouring files.
