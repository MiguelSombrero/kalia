# ADR-0006: Cellar first — store flow deferred to backlog

- **Status:** accepted
- **Date:** 2026-07-17

*Note (2026-07-19): the iteration numbers below reflect the roadmap as it
stood at decision time. A frontend-standards iteration was later inserted
before authentication; [docs/roadmap.md](../roadmap.md) is the source of
truth for current numbering. The ordering decided here (auth before cellar,
store flow in backlog) is unchanged.*

## Context

The project vision was clarified (README, 2026-07-17): Kalia serves beer
enthusiasts first — browse/search, a personal beer cellar, and reviews —
while "order beers online" may end up as an integration or price-comparison
search over other beer stores ("Trivago for beers") rather than Kalia's own
checkout. Both the ordering model and the reviews model are explicitly
*decided later*. The original roadmap built Kalia's own store flow (basket →
ordering → mocked payment) as iterations 2–4, with authentication last.

## Decision

- **Iteration 2 becomes authentication** (Keycloak, Redis-backed BFF
  sessions, backend as OAuth2 resource server) — pulled forward because the
  cellar is per-user data.
- **Iteration 3 becomes the personal beer cellar** (`cellar` module):
  a signed-in user's owned beers with quantity, vintage, purchase info and
  notes.
- **The store flow moves to the backlog** until the own-store vs. aggregator
  decision is made; that decision gets its own ADR. Reviews likewise
  (own vs. external integration).

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
