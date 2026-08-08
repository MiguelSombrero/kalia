# Task 01: `feed` module and cellar events

- **Status:** needs-refinement
- **Iteration:** [7](../iteration-7.md)

## Why

Kalia is meant to be social, and right now nothing one user does is visible to
another except by being sent a link. The [vision](../../../README.md) names the
feed as what makes the cellar social: adding a beer is news to people who care
about beer.

Nothing records that anything happened. A cellar knows its current contents and
not one thing about when or in what order they arrived, so there is nothing for
a feed to read even if a feed existed.

This is also the first cross-module write in the codebase, and
[architecture.md §3](../../architecture.md) has said since the start that those
go through application events. The rule has never been exercised.

## Scope

A `feed` module owning a record of things that happened, and the recording of
the first kind: someone added a bottle to their cellar. Its own schema and
migrations, and the event flow from `cellar` to `feed`.

## Non-goals

- Reading the feed over HTTP — [task 02](02-feed-api.md).
- Any UI — [task 03](03-front-page-feed.md).
- Event kinds other than a cellar addition. More will come; they are cheap to
  add once the shape exists and expensive to guess at now.
- Likes and comments — [backlog](../backlog.md).

## Constraints

- `cellar` must not depend on `feed`. The write is a Spring Modulith
  application event ([architecture.md §3](../../architecture.md)); an event that
  `feed` consumes, published by `cellar` without knowing who listens.
- Module layout and dependency direction follow
  [ADR-0007](../../adr/0007-backend-package-structure.md); `ModularityTest`
  is the guard.
- One schema per module, migrations under the module's own Flyway location.
- Spring Modulith's event publication registry already exists in the `public`
  schema ([architecture.md §3](../../architecture.md)) — this is the first
  consumer, so its at-least-once semantics stop being theoretical.
- **A feed event must never carry a cellar's privacy decision at the wrong
  moment.** Whatever this task stores, visibility can change after the event is
  recorded; the reader must see the current answer, not the one that was true
  when the bottle was added. Getting this wrong leaks a cellar that was later
  made private, and it fails silently.

## Open questions

1. **Is an event recorded for a private cellar at all?** Three answers, and
   they differ in what leaks: record everything and filter on read; record
   nothing private, so making a cellar public later reveals no history; or
   record everything and show private additions without a link. The middle one
   is safest and loses history permanently. This is the iteration's central
   question and the product owner's to answer.
2. **How much does an event copy, and how much does it reference?** Copying
   the beer and user names makes the feed a single cheap read and freezes text
   that can later change; referencing keeps it true and makes every feed read
   fan out.
3. **Is one bottle one event?** Adding six bottles of the same beer would be
   six lines in a feed. Grouping them is friendlier and more to build.
4. **Does deleting a bottle, or a cellar going private, remove past events?**
   Related to question 1, but distinct: a user may reasonably expect deleting
   something to remove the announcement of it.
5. **Does the event record a bottle's dates?** "Miguel added a 2019 AleSmith
   IPA" is a better line than "Miguel added an AleSmith IPA", and it is more
   about that person's cellar than the bare fact is.
6. **Does the stored shape preclude a per-user feed later?** This iteration
   builds one global feed and says so, and that is not being reopened. But
   following other users is in the [backlog](../backlog.md), and a feed
   delivered as a notification rather than a page is per-user by definition
   ([backlog](../backlog.md) — mobile client). Nothing here needs to build
   fan-out or a follow model; the question is only whether what gets stored
   makes adding one an addition or a rewrite — which is mostly about whether an
   event knows whose cellar it came from in a queryable way, rather than only
   enough to render a line.

## Acceptance criteria

- [ ] Adding a bottle to a cellar records a feed event, and `cellar` has no
      compile-time dependency on `feed` — `ModularityTest` is the verification
      for the second half
- [ ] The event is recorded through the application-event mechanism, and a
      failure in `feed` does not fail the cellar addition that triggered it —
      integration test with a failing consumer, confirmed to fail against a
      direct synchronous call
- [ ] Whatever question 1 settles is enforced and tested for both a public and
      a private cellar, including a cellar whose visibility changes *after* the
      event was recorded — this last case is the one a fixture-based test
      misses
- [ ] Flyway migration creates the `feed` schema and applies cleanly against an
      empty database — verified by the integration test suite migrating from
      scratch
- [ ] An ADR records the event-recording model and what was rejected, passing
      `node scripts/check-adrs.mjs`
- [ ] `mvn clean verify` is green

## Notes

**None.**
