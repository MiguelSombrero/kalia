# ADR-0004: Cart is a backend domain module

- **Status:** accepted
- **Date:** 2026-07-15
- **Amended:** 2026-07-17 by [ADR-0006](0006-cellar-first.md) — implementation
  deferred with the store flow; the decision itself stands

## Context

The shopping basket could live in the frontend session (Redis/cookie) and be
sent to the backend only at checkout, or be a first-class backend concept.

## Decision

Cart is a Spring Modulith module (`cart`) persisted in PostgreSQL. Anonymous
visitors are linked to their cart via a `cartId` (UUID) in an httpOnly cookie
issued by the BFF. When authentication arrives, the anonymous cart merges into
the user's cart at sign-in.

## Consequences

- Pricing, quantity rules, and (later) stock checks stay in the domain layer
  next to catalog and ordering — no business logic drifting into the frontend.
- Carts survive browser restarts and, once auth exists, devices.
- The ordering module consumes carts directly; checkout needs no cart upload
  step.
- Cost: cart schema + API in iteration 2 instead of a quick session object;
  abandoned-cart rows need eventual cleanup (a scheduled purge is enough).
