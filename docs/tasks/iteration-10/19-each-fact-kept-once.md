# Task 19: The architecture diagram, feature list and limits are each kept once

- **Status:** needs-refinement
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

[ADR-0020](../../adr/0020-documentation-roles.md) gives each documented fact
one home and makes every other mention a pointer. Three facts are kept in
several places, and each copy drifts on its own:

- **The architecture diagram.** The root README's diagram draws
  `Browser --> Next` directly, while `docs/architecture.md` §2 routes every
  request through `edge`; it restates a shape §2 owns, and since iteration 9 it
  also omits the mobile app (SHOULD-84).
- **The feature list.** What each iteration built is kept four times: twice in
  `README.md`, once in `docs/architecture.md` and once in `docs/roadmap.md`;
  every iteration close edits all four (SHOULD-87). Iteration 10's close will
  be the next.
- **Limits.** The edge's 10 r/s is restated in `backend/README.md`, though
  [ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)
  and `edge/nginx.conf` own it; the twenty-pending cap is restated twice in
  `docs/architecture.md` and once in `docs/adr/README.md`, though
  [ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)
  and `ContributionService.MAX_PENDING_ENTRIES` own it (COULD-89).

## Scope

Each of the three has one home, and every other mention is a pointer to it —
or the product owner accepts a copy, and the reason is recorded.

## Constraints

- ADR-0020: ADRs record *why*, `docs/architecture.md` *shape*, READMEs *how*.
- `scripts/check-links.mjs` checks every pointer added.
- `docs/architecture.md`'s module diagram is generated-and-asserted
  ([iteration 5.5 task 10](../iteration-5.5/10-detect-module-diagram-drift.md));
  the README's diagram is a different, hand-drawn one.

## Open questions

1. **The README's diagram (SHOULD-84):** replace it with a pointer to §2, or
   add the edge and the app and keep both in step by hand.
2. **The feature list (SHOULD-87):** shrink the README's status blurb to a
   pointer at the roadmap, or accept the four-place edit — and which of the
   four is the home.

## Acceptance criteria

- [ ] The README's diagram is a pointer to §2, or matches it including the
      edge and the mobile app
- [ ] The feature list has one home, or the accepted copies are named in the
      PR with the reason
- [ ] The edge rate and the pending cap appear only in their homes, with
      pointers elsewhere
- [ ] `node scripts/check-links.mjs` passes, and its test still covers a
      broken pointer
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-84 and SHOULD-87,
both `[needs decision]` (open questions 1 and 2), and COULD-89.
