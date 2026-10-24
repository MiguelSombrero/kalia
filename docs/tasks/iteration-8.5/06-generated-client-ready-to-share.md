# Task 06: The generated client is what a shared package should hold

- **Status:** refined
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

[Iteration 9](../iteration-9.md) moves the generated API types and client into
a shared package "with a mutator per platform". Three things about today's
client would travel with it:

**It generates hooks nothing may use.** [ADR-0012](../../adr/0012-orval-api-client.md)
chose orval for its TanStack hooks (`:39-43`), but since
[ADR-0040](../../adr/0040-client-reads-via-server-actions.md) no component may
use them, and `frontend/orval.config.ts:12` (`client: "react-query"`) still
generates them. ADR-0040's complementary `server-only` marker (`:107-112`) was
never added; `server-only` is imported nowhere and is not in `package.json`.

**A caller's `Authorization` header overrides the session's.**
`withAccessToken` returns the options untouched when one is already set
(`frontend/lib/api/mutator.ts:96-103`). No call site sets one today; the first
one whose header value derives from request input makes the BFF forward a
caller-chosen bearer token verbatim.

**A feature may import any tag's types.** The boundary rule lets every
feature's `api.ts`/`types.ts` import the whole shared `models` folder
(`frontend/eslint.config.mjs:119`, `:157-160`), so `features/feed/types.ts`
could re-export `EntryDto` and lint would pass, though
[ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)
and §5 say a feature reaches only its own tag. No violation today.

## Scope

Server-only code says so to the build, the session's token is the only one
the BFF ever sends, and the models boundary is documented as covering
operations only. What orval generates is unchanged.

## Non-goals

- The workspaces refactor and the shared package — iteration 9.

## Constraints

- [ADR-0040](../../adr/0040-client-reads-via-server-actions.md): client
  components read through Server Actions; and `frontend/README.md`'s trap —
  `kaliaFetch` reaching a client bundle fails the build several layers down.
- [ADR-0012](../../adr/0012-orval-api-client.md): regenerate and commit;
  `api-client-drift` stays green.
- A new dependency (`server-only`) is a version question for the product
  owner (CLAUDE.md "New dependencies").
- A changed boundary rule gets a violating fixture in
  `frontend/eslint-fixtures/boundaries/` (`frontend/README.md`).

**Decided at refinement, 2026-10-24** (product owner):

- **orval keeps generating `react-query` hooks.** Switching to `client: "fetch"` was considered and declined; COULD-41's client half is closed as decided, not done.
- **The mutator still gets ADR-0040's `server-only` marker**, `server-only@0.0.1`, so a client-component import fails the build at the import itself.
- **A caller-set `Authorization` header throws.** Only the session's token is ever sent, and a caller's mistake fails loudly rather than being overwritten.
- **The models boundary is documented as covering operations only**, in ADR-0083's consequences and §5, with why: orval's models are shared because one DTO can belong to several tags. Splitting models per tag was rejected.

## Open questions

**None.**

## Acceptance criteria

- [ ] Importing the mutator from a client component fails `npm run build`
      with an error naming `server-only` — confirmed on a scratch component
- [ ] A request built with a caller-set `Authorization` header throws, and
      sends nothing — `npm test` covers it in `mutator.test.ts`
- [ ] ADR-0083 and §5 state that the models boundary covers operations only,
      and why
- [ ] `make verify` is green, including `api-client-drift`

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-41, COULD-20 and
COULD-58. Merged because each is about what the generated client and its
mutator let through, and iteration 9 moves both.
