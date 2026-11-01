# Task 17: An operator moderates one entry at a time, and can look before acting

- **Status:** needs-refinement
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

Moderation of contributed entries
([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md))
is `scripts/moderate-contributor.sql`, run through `docker compose exec` by
`make moderate`, and it is the blunt end of the contribution flow:

- It acts on all of a contributor's rows at once, so removing one bad beer
  also removes their approved ones. It writes `catalog` tables around the
  domain and reads `profile.profile` across schemas, and it has no deployment
  story. Rejected rows leave the pending count, so a rejected contributor can
  resubmit twenty more at once, indefinitely (SHOULD-80).
- It cannot look before it acts: the script runs in one transaction and
  commits, so a mistyped `WHO` or `ACTION` is undone only by a second run
  (COULD-99).

Open registration with a mobile client grows the queue before ADR-0091's own
trigger to revisit moderation fires.

## Scope

An operator can approve, reject or remove a single contributed entry, can see
what an action would change before committing it, and a rejection counts
toward stopping the same contributor from flooding the queue again.

## Non-goals

- A moderation UI in either client.

## Constraints

- ADR-0091: no catalog row is ever deleted; an entry waits for an operator.
- Spring Modulith boundaries: a write to `catalog` goes through the catalog
  module, and a read of a username through `profile`'s API
  ([ADR-0002](../../adr/0002-spring-modulith.md)), if the answer moves
  moderation into the backend.
- An operator endpoint is a new authenticated edge
  ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md))
  and a new operation in the committed spec.

## Open questions

1. **Where moderation lives (SHOULD-80):** per-row actions in the SQL script,
   or an operator-role backend endpoint called by `make moderate`.
2. **The cooldown:** how rejections count — a cap on rejected-plus-pending, a
   time-based cooldown, or a contributor flag an operator sets.
3. **Dry run (COULD-99):** `DRY_RUN=1` rolling back and printing the same
   counts, or a separate preview action.

## Acceptance criteria

- [ ] An integration test removes one of a contributor's beers and leaves
      their other approved beer approved
- [ ] An integration test shows a contributor with rejected entries refused
      by the rule refinement chose
- [ ] A dry run against the running stack prints the counts and leaves the
      rows unchanged — verified by running it, and described in the PR
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-80 (`[needs
decision]`, open questions 1 and 2) and COULD-99, deferred in PR #452.
