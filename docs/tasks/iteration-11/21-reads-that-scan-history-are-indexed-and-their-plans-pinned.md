# Task 21: Reads that scan history are indexed, and their plans are pinned

- **Status:** done
- **Iteration:** [11](../iteration-11.md)
- **Covers:** none

## Why

Two reads filter on a window or a status and pay for the whole table.

- **The feed** (SHOULD-105). Its 30-day window bounds what is served, not what is
  scanned. Both reads in `FeedLineRepository` filter `occurred_at >= :cutoff` and
  order by `sequence_number DESC`, and `feed.line` has no index on `occurred_at`
  (`V007__feed_schema.sql`), so when fewer than `size + 1` lines match, Postgres
  reads every older row before it stops. The table keeps every row
  ([ADR-0058](../../adr/0058-feed-event-recording-model.md)) and the endpoint is
  anonymous: a quiet instance scans all history on each front-page render, and a
  `?before=` cursor near the window's edge does the same on any instance.
  [Iteration 13](../iteration-13.md) puts this feed on the phone.
- **The review queue's contributor counts** (COULD-131).
  `BeerRepository.countPendingAndRejectedByContributor` can use
  `beer_pending_contributor_idx` only for `PENDING`; the `REJECTED` half scans
  `catalog.beer`, imported rows included, on every admin page.

## Scope

Each read's plan is the one intended, shown by a test the way `BeerSearchIndexIT`
shows the catalog search's, and the schema carries whatever index makes it so.

## Non-goals

- Changing what the feed or the queue serves.
- Archiving or deleting old feed lines, which ADR-0058 rules out.

## Constraints

- A schema change is a new Flyway migration owned by the schema-owning role
  ([ADR-0100](../../adr/0100-postgres-has-three-roles-one-that-owns-the-schema-for-flyway-one-that-reads-and-writes-rows-and-one-for-keycloak.md)).
- A plan test needs rows enough for the planner to choose, and it must not
  depend on timing; it follows `BeerSearchIndexIT`'s way of forcing the choice.
- Every catalog row is kept
  ([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)),
  so rejected rows accumulate.

**Decided at refinement, 2026-11-07** (product owner):

- **The feed's reads are bounded by an index on `feed.line(occurred_at)`;**
  the queries stay as written.
- **The contributor counts get a partial index on `contributor_id` for
  `REJECTED` rows now,** since no catalog row is deleted and rejections only
  accumulate. Each index is a migration of its own module's schema.

## Open questions

**None.**

## Acceptance criteria

- [x] A plan test shows the feed's front-page read and its `?before=` read near
      the window's edge touching a bounded number of rows on a table holding
      many older lines; it failed before the migration
- [x] A plan test shows the contributor counts' `REJECTED` half using an index;
      it failed before the migration
- [x] The migration passes the schema checks and the existing feed and review
      queue tests are green
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-105 and COULD-131.
