# ADR-0009: Zustand for client UI state

- **Status:** accepted
- **Date:** 2026-07-21

## Context

[ADR-0008](0008-tanstack-query.md) fixed the server-data side of client
state: TanStack Query owns everything fetched from the API. The remaining
gap is client-side *UI state* — user selections, toggles, drafts, state
shared between client components — which otherwise ends up in ad-hoc
prop-drilling, context sprawl, or worse, inside the server-data cache.

## Decision

Kalia's client state has **three homes, by kind of state**:

| Kind | Home | Examples |
|---|---|---|
| Server data | TanStack Query (ADR-0008) | beers, cellar items — anything from the API |
| Shareable / navigational state | URL search params | catalog filters, pagination, sort |
| Ephemeral client UI state | **Zustand 5.0.14** | user selections, view toggles, multi-step drafts |

Rules:

- **Zustand never holds API data.** Copying server responses into a store is
  the drift this three-way split exists to prevent — the cache invalidation
  problem belongs to TanStack Query alone.
- **Zustand never duplicates URL state.** If state should survive a page
  share or reload, it belongs in the URL, not a store.
- **Stores are feature-scoped** (`features/<feature>/store.ts`), created
  with `create()` per feature — no global god-store. Components subscribe
  via selectors (`useStore(s => s.slice)`) to avoid needless re-renders.
- Plain `useState` remains correct for state local to a single component;
  Zustand enters when state crosses component boundaries.

## Consequences

- Install-only for now: no client component holds UI state today (catalog
  filters deliberately live in the URL), so the first store arrives with
  the first feature that needs one — a speculative example store would be
  dead code. Store tests arrive with that first store.
- The three-way table gives every future "where does this state live?"
  question a one-line answer, and code review a concrete rule to check.
