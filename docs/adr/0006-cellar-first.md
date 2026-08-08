# ADR-0006: Cellar first — store flow deferred to backlog

- **Status:** accepted
- **Date:** 2026-07-17
- **Supersedes:** [ADR-0005](0005-defer-auth-mock-payments.md) (partial) —
  authentication is no longer deferred; the mocked-payment stance stands
- **Amended:** 2026-07-24 — restated in terms of ordering rather than specific
  iteration numbers, the roadmap having been reshuffled twice since (a
  frontend-standards iteration inserted before authentication on 2026-07-19; a
  production-readiness iteration inserted before authentication again on
  2026-07-24). See [docs/roadmap.md](../roadmap.md) for current numbering.
- **Amended:** 2026-08-08 — the own-store vs. aggregator decision this ADR
  defers no longer exists; see the amendments below. The sequencing decision
  (authentication before the cellar) shipped and stands.

## Context

The project vision was clarified (README, 2026-07-17): Kalia serves beer
enthusiasts first — browse/search, a personal beer cellar, and reviews —
while "order beers online" may end up as an integration or price-comparison
search over other beer stores ("Trivago for beers") rather than Kalia's own
checkout. Both the ordering model and the reviews model are explicitly
*decided later*. The original roadmap built Kalia's own store flow (basket →
ordering → mocked payment) as iterations 2–4, with authentication last.

## Decision

- **Authentication comes before the cellar** (Keycloak, Redis-backed BFF
  sessions, backend as OAuth2 resource server) — pulled forward because the
  cellar is per-user data.
- **The personal beer cellar** (`cellar` module) follows authentication:
  a signed-in user's owned beers with quantity, vintage, purchase info and
  notes.
- **The store flow moves to the backlog** until the own-store vs. aggregator
  decision is made; that decision gets its own ADR. Reviews likewise
  (own vs. external integration).

> **Amended 2026-08-08.** The third bullet's pending decisions are closed, and
> neither got the ADR promised here. The vision changed (see
> [README.md](../../README.md)): Kalia does not sell beer and never collects
> reviews. What is left of the shop — possibly linking out to shops that stock a
> beer — is a [backlog](../tasks/backlog.md) line, and writing an ADR to reject
> the own store would formally decide something nobody is deciding.
>
> The cellar's shape in the second bullet ("quantity, vintage, purchase info
> and notes") is also superseded: a cellar holds individual bottles, each with
> its own brewed and best-before dates, grouped by beer.

## Consequences

- [ADR-0004](0004-backend-cart.md) (backend-owned cart) remains accepted but
  its implementation is deferred with the store flow; the anonymous-cart
  cookie and cart-merge-at-sign-in design only applies if the own-store
  variant is chosen.
- [ADR-0005](0005-defer-auth-mock-payments.md) is partially superseded: auth
  is no longer deferred behind the store. The mocked-`PaymentProvider`
  stance stands if the own-store variant is built.
- The module schemas `cart`, `ordering`, `payment` created by migration V001
  remain in place — empty schemas are harmless and keep the seams visible.
- Catalog browsing stays anonymous; only personal features require sign-in.

> **Amended 2026-08-08.** The first three bullets no longer hold.
> [ADR-0004](0004-backend-cart.md) and
> [ADR-0005](0005-defer-auth-mock-payments.md) are both `deprecated`. The empty
> `cart`, `ordering` and `payment` schemas are being dropped — "harmless and
> keep the seams visible" was wrong in exactly the way worth recording: those
> schemas were the store's only physical trace, and they kept a rejected shape
> looking like a planned one. The last bullet stands.
