# Task 16: The backend's request limit holds for the calls the web makes on a visitor's behalf

- **Status:** refined
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** none

## Why

[ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)
puts an nginx edge in front of the stack so that anonymous load has "a bound a
script cannot step around". The backend's zone allows 10 requests a second per
address (`edge/nginx.conf`), but the web calls `backend:8080` directly over the
compose network, so the web's own zone — 150 a second per address — is what a
visitor's server-rendered pages and public Server Actions are really held to.
Each of those requests can make several backend calls, which puts the backend
load one address can drive at about fifteen times the limit the ADR states
(COULD-75).

This iteration adds Server Actions that change data — deciding a suggestion,
acknowledging a notification — and they reach the backend the same way.

## Scope

The load one address can drive at the backend is bounded at the figure an ADR
states, whichever way it arrives, or ADR-0090 is corrected to state the bound
the stack actually has.

## Constraints

- The edge overwrites `X-Forwarded-For` with the address it saw, and Spring
  trusts that header only from the stack's private ranges (ADR-0090); a limit
  inside the backend keyed on the client address depends on the web forwarding
  it.
- Signed-in users are not to be throttled below what an ordinary page needs;
  the feed polls (ADR-0060), and the front page makes several backend calls.
- The edge configuration's checks (`scripts/check-compose.mjs` and the edge
  tests) fail a zone that is not pinned.

**Decided at refinement, 2026-11-04** (product owner):

- **COULD-75: Server Actions get an edge zone of their own,** tighter than the
  web zone, keyed on the request Next.js marks as a Server Action — checked in
  `node_modules/next/dist/docs/`, never memory. **ADR-0090 is amended to state
  the backend bound page renders actually have:** the web zone times the
  backend calls one render makes. A limit inside the backend on the forwarded
  address (a new dependency) and correcting the ADR alone were rejected.
- *Derived:* **one request is what the edge sees** — a page render, or one
  Server Action call — and the ADR states the backend load each can drive.

## Open questions

**None.**

## Acceptance criteria

- [ ] The edge tests show a Server Action held to its own zone and an ordinary
      page request held to the web zone, and the configuration checks pin both
- [ ] ADR-0090 states the backend load one address can drive through page
      renders, and the figure it is computed from is pinned by a test
- [ ] ADR-0090 is amended to what the stack enforces, and §6 matches
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-75, `[needs
decision]` (open question 1).
