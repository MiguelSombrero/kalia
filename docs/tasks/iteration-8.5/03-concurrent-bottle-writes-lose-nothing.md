# Task 03: Two writes to one cellar entry never silently lose a bottle

- **Status:** refined
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

Removing a beer's last bottle deletes its entry
(`backend/src/main/java/fi/kalia/cellar/application/CellarService.java:68-76`).
`Entry` has no `@Version` (`cellar/domain/Entry.java:29-53`), and
`bottle.entry_id` is `ON DELETE CASCADE` (`V005__cellar_schema.sql:23`). If a
concurrent `addBottles` for the same beer (`CellarService.java:50-58`) commits
first, the delete cascades over the bottle just added — a request that already
answered 201, and whose `BottleAdded` feed line stays.

Today only the owner can trigger it, from two tabs. [Iteration
12](../iteration-12.md) makes the cellar readable offline, and offline writes
with sync are the option it keeps open: a phone replaying queued writes beside
a browser makes concurrent writes to one entry the ordinary case, and a silent
loss the kind of bug nobody can reproduce.

## Scope

A write that loses a race to another write on the same entry is either
retried and applied, or refused with a response the client can act on. No
committed bottle disappears, and no feed line describes a bottle that does
not exist.

## Constraints

- [ADR-0052](../../adr/0052-cellar-aggregate-owns-its-writes.md): the entry
  aggregate owns its writes, and an entry with no bottles does not exist ([iteration-6 task 06](../iteration-6/06-entry-with-no-bottles.md)).
- [ADR-0057](../../adr/0057-retry-on-constraint-violation-for-get-or-create.md)'s
  retry on a constraint violation is the pattern already used for the
  concurrent-create race (retired MUST-8).

**Decided at refinement, 2026-10-24** (product owner):

- **Optimistic locking:** `@Version` on `Entry`, retried the way [ADR-0057](../../adr/0057-retry-on-constraint-violation-for-get-or-create.md) retries a constraint violation. A pessimistic row lock was rejected because it serialises writes, which iteration 12's replayed offline writes would make common.
- **An exhausted retry answers 409 `problem+json`**, documented on the affected handlers and in the generated client.

## Open questions

**None.**

## Acceptance criteria

- [ ] An integration test that races `removeBottle` of an entry's last bottle
      against `addBottles` for the same beer ends with the added bottle
      persisted (or the add refused), and was confirmed to lose the bottle
      against today's code
- [ ] No `BottleAdded` line survives for a bottle that was not committed —
      asserted in the same test
- [ ] Any new response code is documented on the affected handlers and in the
      generated client, and `make verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-30. Raised to this
iteration's mobile tier because iteration 12's offline sync changes how often
it happens, not what it costs.
