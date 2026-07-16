# ADR-0005: Defer authentication; mock the payment provider

- **Status:** accepted
- **Date:** 2026-07-15

## Context

Keycloak-based auth and real payment-provider integration are both planned but
neither is needed to deliver the core catalog → basket → order flow, and both
add heavy moving parts (identity provider, PSP sandbox accounts, webhooks).

## Decision

- **Auth (Keycloak, Redis sessions) waits until iteration 5.** Until then all
  flows are anonymous, keyed by the `cartId` cookie, and the backend API is
  unauthenticated but only reachable from the Next.js server (not published).
- **Payments start with a `MockPaymentProvider`** implementing the same
  `PaymentProvider` port a real adapter will, with configurable success,
  failure, and delay. The order lifecycle, events, and UI flow are built for
  real against the mock.

## Consequences

- Iterations 1–4 ship a complete purchase experience without external
  dependencies; E2E tests are fast and deterministic.
- Swapping in a real PSP (Paytrail/Stripe sandbox) later is an adapter behind
  an existing port; webhook handling is the main new work.
- Auth arrives as one focused iteration; the anonymous-cart merge is designed
  in from the start (ADR-0004) so nothing is retrofitted.
- Risk accepted: the unauthenticated API must never be exposed publicly before
  iteration 5 — enforced by docker-compose networking and called out in the
  architecture doc.
