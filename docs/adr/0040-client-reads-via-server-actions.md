# ADR-0040: A client component's read of authenticated data goes through a Server Action, not the generated client directly

- **Status:** accepted
- **Date:** 2026-08-16

## Context

[ADR-0008](0008-tanstack-query.md) mandates TanStack Query for every
client-component read, with the `queryFn` calling the feature's own `api.ts`
wrapper over the generated client — but no client component existed yet to
prove that shape out; every consumer so far was a server component.
[Task 11](../tasks/iteration-5/11-cellar-page.md) (the cellar page) is the
first: `BeerRow`, a client component, fetches a beer's bottles once its row
expands.

Wiring `BeerRow`'s `queryFn` straight to `features/cellar/api.ts`'s
`listCellarBottles` failed `npm run build` (Next.js 16.3.0, Turbopack):

```
./node_modules/ioredis/built/connectors/SentinelConnector/index.js:6:15
Error: Module not found: Can't resolve 'tls'
```

with an import trace of `BeerRow.tsx [Client Component SSR]` →
`features/cellar/api.ts` → `lib/api/generated/cellar/cellar.ts` →
`lib/api/mutator.ts` → `lib/api/accessToken.ts` → `lib/auth/valkeyAdapter.ts`
→ `ioredis`, which needs Node's `tls` module — absent in a browser bundle.
That chain exists on purpose: `kaliaFetch` attaches the caller's access token
by reading the session server-side from a Valkey-backed store keyed by an
httpOnly cookie
([ADR-0025](0025-authjs-valkey-adapter.md),
[ADR-0028](0028-resource-server-and-current-user.md),
[ADR-0029](0029-silent-token-refresh.md),
[ADR-0030](0030-per-session-token-storage.md)) — the token is deliberately
never handed to the browser. Any authenticated backend call therefore has to
run inside the Next.js server process, even when a client interaction is what
triggers it.

## Decision

**A client component's read of authenticated data calls a Server Action, not
its feature's `api.ts` function directly; a Server Component keeps calling
`api.ts` directly, unchanged.**

`features/cellar/actions.ts` (already the file for `startCellarSignIn`) gained
`listCellarBottlesAction`, a thin `"use server"` wrapper around
`listCellarBottles`. `BeerRow`'s `useQuery` calls
`listCellarBottlesAction(entryId)` as its `queryFn`. Next.js's compiler
replaces a `"use server"` export referenced from a Client Component with a
lightweight RPC stub rather than bundling its body, so the generated client,
`kaliaFetch` and the Valkey session lookup stay entirely server-side. `api.ts`
itself is unchanged — `listCellarEntries` is still called directly from
`page.tsx`, a Server Component, with no action wrapper, since only the
client-triggered read needed one.

This is the pattern for every future client-component read that goes through
`kaliaFetch`'s authenticated path, not only cellar's bottles.

## Alternatives considered

**A Route Handler under `app/api/`, called from the client with a plain
`fetch`.** Also keeps the token server-side, but adds a URL, an HTTP method
and JSON (de)serialization to hand-maintain per read, where a Server Action
gets the same security with Next.js generating the wire format. Rejected as
more boilerplate for no benefit here; the Next.js docs bundled with this
version note it as the fallback once a client library outgrows what a Server
Action call comfortably expresses (`node_modules/next/dist/docs/01-app/02-guides/single-page-applications.md`,
"Mutating data with Server Actions" section) — this read has not.

**Prefetch bottles server-side and hydrate the TanStack Query cache**
(`dehydrate`/`HydrationBoundary`), so the client never issues its own
request. Rejected for this task: bottles are fetched lazily per row on
expand, and prefetching every row's bottles up front defeats the lazy-load
point the task file itself makes for the same reason it doesn't fetch all
bottles eagerly. Revisit if a page ever needs to render fully hydrated with
no client-side fetch waterfall.

**Mark `lib/api/generated/**`/`lib/api/mutator.ts` `server-only`** (the
`server-only` package), so a client-bundled import fails the build with a
message naming the actual cause instead of `ioredis`/`tls`. Not a substitute
for this decision — a caller still needs a way to trigger the server-only
read from a client interaction, which is what the Server Action provides —
but a credible complement; see Revisit trigger.

## Consequences

- Good, because client-side reads keep exactly the TanStack Query shape
  ADR-0008 intended — `useQuery`, `isPending`/`isError`, cache keys — only
  where the `queryFn`'s data comes from changed.
- Good, because the access token still never reaches the browser;
  ADR-0028/0029/0030's design needed no change, since a Server Action
  executes entirely server-side.
- Bad, because a future client-component read that forgets the action
  wrapper fails only at `npm run build`, several layers down in an unrelated
  dependency (`ioredis`'s `tls` resolution) rather than with a message
  pointing at the actual cause — easy to lose time re-diagnosing from
  scratch.
- Bad, because a Server Action's thrown value crosses the client/server RPC
  boundary through React's own serialization, and Next's docs for the
  parallel case — a Server Component render error reaching `error.tsx` —
  state that only a generic message plus a `digest` survive, to avoid leaking
  server detail. Whether a Server Action's error keeps `ApiError`'s custom
  `kind`/`status` properties (added via `Object.assign`, ADR-0023) across the
  same kind of boundary is not confirmed either way. This PR's own
  `BottleList.tsx` only branches on `query.isError`, never `.kind`, so
  nothing here depends on the answer — but the first future consumer that
  does needs to verify it first, not assume ADR-0023's "branch on `e.kind`"
  convention survives this specific path unchanged.
- **Revisit trigger:** the next time this failure mode recurs, add
  `server-only` to `lib/api/mutator.ts` so the mistake fails at compile time
  with an actionable message instead of the opaque `ioredis` trace. Separately,
  the first client-side consumer that needs `ApiError.kind`-based branching
  through a Server Action should confirm whether it survives serialization
  before relying on it.

## Evidence

Reproduced against Next.js 16.3.0 (Turbopack) with `npm run build`: the trace
above, in full, named `BeerRow.tsx [Client Component SSR]` as the entry point
and `ioredis/built/connectors/{SentinelConnector,StandaloneConnector}`'s
`require("tls")` as the failure. After routing the call through
`listCellarBottlesAction`, the same build completed and listed
`ƒ /[locale]/cellar` among the generated routes with no error.
