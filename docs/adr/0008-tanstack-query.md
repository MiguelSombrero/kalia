# ADR-0008: TanStack Query for client-component API calls

- **Status:** accepted
- **Date:** 2026-07-21
- **Amended:** 2026-08-16 by [ADR-0040](0040-client-reads-via-server-actions.md)
  — this ADR's `queryFn` was never proven against a real client component
  until the cellar page; ADR-0040 records what that first consumer forced:
  the `queryFn` calls a Server Action, not the feature's `api.ts` directly
- **Amended:** 2026-08-16 by [ADR-0041](0041-tanstack-query-feature-owned-hooks.md)
  — a component calls a feature-owned hook wrapping `useQuery`/`useMutation`,
  never the TanStack Query hooks directly

## Context

The frontend-standards iteration sets the data-fetching standard before more
interactive features arrive. The catalog pages are server components
fetching via the BFF (architecture §5) — that path is server-rendered and
needs no client cache. What lacks a standard is data access from *client
components*: mutations and interactive reads arriving with the cellar
(add/edit/remove) and later features. Without a standard, each feature would
hand-roll fetch + loading/error/cache state.

## Decision

- **TanStack Query 5.101.3 is the mandatory data layer for client
  components**: every client-component read uses `useQuery`, every mutation
  `useMutation`. No hand-rolled `fetch` + `useState`/`useEffect` data
  plumbing in client components.
- **Server components are out of scope** and keep fetching directly on the
  server. Pages stay server-first; TanStack Query enters only where
  interactivity forces a client component.
- One `QueryClient` provided app-wide via `app/providers.tsx` (mounted in
  the root layout), default `staleTime` 60 s — override per query where
  freshness matters.
- `@tanstack/eslint-plugin-query` (flat/recommended) enforces correct usage
  at lint time; devtools ship dev-only.
- Client-side *UI state* is explicitly not TanStack Query's job — that
  boundary belongs to the Zustand decision (iteration 2, task 2).

## Consequences

- No migration needed: no existing client component fetches data — the
  standard is rails for what comes next (first consumer: cellar mutations).
- The provider is inert for current server-rendered pages (verified: unit
  suite, production build and Playwright E2E green with the provider
  mounted).
- Server state stays in TanStack Query's cache, keyed and invalidated
  explicitly; UI state stays elsewhere — preventing the common
  everything-in-one-store drift.
