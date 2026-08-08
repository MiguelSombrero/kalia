# ADR-0005: Defer authentication; mock the payment provider

- **Status:** deprecated
- **Date:** 2026-07-15
- **Superseded-by:** [ADR-0006](0006-cellar-first.md) (partial) — authentication
  is no longer deferred and now precedes the cellar; the mocked-payment stance
  stands if the own-store flow is built
- **Amended:** 2026-07-26 — restated in terms of ordering rather than specific
  iteration numbers, which had drifted, per
  [ADR-0006](0006-cellar-first.md)'s own amendment
- **Amended:** 2026-08-08 — deprecated, see below

> **Deprecated 2026-08-08.** Both halves are now spent. Authentication was
> already un-deferred by [ADR-0006](0006-cellar-first.md) and shipped in
> iteration 4, so the Context below — an unauthenticated backend reachable only
> from the Next.js server — no longer describes the system. The payment half
> went with the vision change (see [README.md](../../README.md)): Kalia does
> not sell beer, so there is no provider to mock.
>
> Kept for the same reason as [ADR-0004](0004-backend-cart.md), whose
> deprecation note carries the lesson both of them taught.

## Context

Keycloak-based auth and real payment-provider integration are both planned but
neither is needed to deliver the core catalog → basket → order flow, and both
add heavy moving parts (identity provider, PSP sandbox accounts, webhooks).

## Decision

- **Auth (Keycloak, Redis sessions) waits until the catalog and purchase flow
  are built.** Until then all flows are anonymous, keyed by the `cartId`
  cookie, and the backend API is unauthenticated but only reachable from the
  Next.js server (not published).
- **Payments start with a `MockPaymentProvider`** implementing the same
  `PaymentProvider` port a real adapter will, with configurable success,
  failure, and delay. The order lifecycle, events, and UI flow are built for
  real against the mock.

## Consequences

- The iterations preceding auth ship a complete purchase experience without
  external dependencies; E2E tests are fast and deterministic.
- Swapping in a real PSP (Paytrail/Stripe sandbox) later is an adapter behind
  an existing port; webhook handling is the main new work.
- Auth arrives as one focused iteration; the anonymous-cart merge is designed
  in from the start (ADR-0004) so nothing is retrofitted.
- Risk accepted: the unauthenticated API must never be exposed publicly before
  auth lands — enforced by docker-compose networking and called out in the
  architecture doc.
