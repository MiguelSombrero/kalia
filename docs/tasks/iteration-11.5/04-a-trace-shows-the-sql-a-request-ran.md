# Task 04: A trace shows the SQL a request ran

- **Status:** done
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-2

## Why

Kalia's latency problems so far have been counts and indexes: a catalog query
over budget for want of an index
([ADR-0078](../../adr/0078-catalog-reads-over-budget-for-want-of-an-index-stay-uncached.md)),
and a public cellar page that made one call per entry until the join moved into
the backend
([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)).
Inside the backend the same shapes are SQL, and today the only way to see them
is to turn on Hibernate's SQL logging and read it, or to re-run the catalog
benchmark. A request's trace that held one span
per statement would show an N+1 as a count and a slow query as a width, for
any request an agent happens to be looking at.

## Scope

With the profile on, a backend request's trace holds a span for each SQL
statement it ran — the statement's text without its bound values, and its
duration — under the request's span, and a span for each event publication
the request caused.

## Non-goals

- Query plans; [iteration 11 task 21](../iteration-11/21-reads-that-scan-history-are-indexed-and-their-plans-pinned.md)
  pins those in tests.
- A latency budget enforced on traces.

## Constraints

- **A bound value never reaches a span**: a username, a bottle's dates and a
  search term are all bound parameters, and an instrumentation that inlines
  them leaks what ADR-0013 keeps out of a log.
- Flyway's migrations at startup are not traced as requests.
- Spring Modulith's event publication registry
  ([ADR-0081](../../adr/0081-incomplete-event-publications-are-resubmitted-five-times-and-completed-ones-deleted.md))
  writes its own statements; whether they show is a question, not an accident.
- **Decided at refinement (2026-11-15):**
  - The instrumentation is `datasource-micrometer`, which plugs into the
    Micrometer observation the backend already uses, at the version from
    [task 01](01-decision-the-local-observability-stack.md)'s batched
    question.
  - A span keeps the statement's text with `?` placeholders and its
    duration, never a bound value.
  - Statements run by an asynchronous event listener, and the event
    publications themselves, sit in the request's trace, not in one of their
    own.
  - The event publication registry's own statements are shown, since they
    are statements the request ran. Flyway's migrations at startup are not
    traced as a request.

## Open questions

**None.**

## Acceptance criteria

- [x] A cellar read's trace shows its statements as child spans of the request
      span, with their durations — verified against the running stack
- [x] A request that publishes an event shows the publication, its
      listener's statements and the registry's statements in the request's
      trace — verified against the running stack
- [x] An integration test shows a statement's span carrying no bound value for
      a search term and a username, and was seen to fail with values inlined
- [x] An integration test shows a deliberately repeated query in a test-only
      endpoint or repository call producing one span per execution, so an N+1
      is countable
- [x] `backend/README.md` says how to read a request's SQL from its trace, and
      `make verify-fast` is green
