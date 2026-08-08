# ADR-0004: Cart is a backend domain module

- **Status:** deprecated
- **Date:** 2026-07-15
- **Amended:** 2026-07-17 by [ADR-0006](0006-cellar-first.md) — implementation
  deferred with the store flow; the decision itself stands
- **Amended:** 2026-08-08 — deprecated, see below

> **Deprecated 2026-08-08.** The vision changed (see
> [README.md](../../README.md)): Kalia does not sell beer, and at most may some
> day link out to shops that do. There is no cart to decide the home of, so
> this decision binds nothing.
>
> It is left in place rather than deleted because *why it was deprecated*
> matters more than what it decided. This ADR designed a module for work that
> was never built and now never will be, and that design leaked into the
> system: three empty Postgres schemas and a node in the architecture diagram
> shaped how Kalia looked for three weeks. The lesson — an ADR records a
> decision that binds work now; a possibility being carried is a backlog item —
> is recorded as an amendment to
> [ADR-0032](0032-when-a-decision-earns-an-adr.md). No ADR replaces this one:
> the shop is a backlog line, not a decision anyone is making.

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
