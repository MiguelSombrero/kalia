# Iteration 7 — Front page activity feed

Goal: the front page shows what people are putting in their cellars, and keeps
showing it as it happens.

## Done when

- **DW-1:** Adding a bottle to a cellar records a feed event, and `cellar` has
  no compile-time dependency on `feed`.
- **DW-2:** A signed-out caller can read recent feed events over HTTP,
  newest-first, each carrying the person and the beer a line needs to name.
- **DW-3:** Nothing in the feed — over HTTP or on the page — reveals more about
  a cellar than its owner has agreed to, including a cellar whose visibility
  changed after the event was recorded.
- **DW-4:** The front page lists recent events as sentences that read correctly
  in both locales, and a public cellar's line links to it.
- **DW-5:** A visitor sitting on the front page is told when new events have
  been recorded and takes them into the list, without reloading the browser.
  *(Reworded during refinement: the product owner chose arrival behind a
  "N new events" control over automatic insertion, so the criterion says what
  can now be run — [task 07](iteration-7/07-live-front-page.md).)*
- **DW-6:** How the feed reaches an already-open browser, and what a feed line
  does to [ADR-0050](../adr/0050-public-cellar-addressing.md)'s uniform 404,
  are each recorded as a decision rather than left implicit.

## Tasks

| ID | Task | Status |
|---|---|---|
| [09](iteration-7/09-feed-and-private-cellars.md) | What a feed line may reveal, and what that does to ADR-0050 | refined |
| [05](iteration-7/05-feed-delivery-decision.md) | Decide how the feed reaches a browser that is already open | refined |
| [01](iteration-7/01-feed-module.md) | `feed` module and cellar events | done |
| [04](iteration-7/04-feed-line-composition.md) | The reads a feed line needs | done |
| [02](iteration-7/02-feed-api.md) | Feed read API | refined |
| [06](iteration-7/06-feed-increments.md) | Asking the feed what is new | refined |
| [08](iteration-7/08-shared-relative-time.md) | Relative time outside the cellar | refined |
| [03](iteration-7/03-front-page-feed.md) | Front page feed | refined |
| [07](iteration-7/07-live-front-page.md) | The front page updates without a reload | refined |
| [10](iteration-7/10-person-display-name.md) | A person's name, for a feed line to say | dropped |

## Hardening

Carried alongside the feed, not part of it — each advances no `Done when`
criterion and each says so with `Covers: none`.

| ID | Task | Status |
|---|---|---|
| [15](iteration-7/15-session-cookie-prefers-secure-prefix.md) | Prefer the `__Secure-` session cookie over the unprefixed one | refined |
| [11](iteration-7/11-keycloak-brute-force-protection.md) | Lockout on password guessing | refined |
| [12](iteration-7/12-scope-exception-advices.md) | Scope each module's exception advice to its own module | refined |
| [13](iteration-7/13-guard-dtos-at-the-api-boundary.md) | Make "DTOs at the API boundary" a rule the build enforces | refined |
| [14](iteration-7/14-catalog-silent-failures.md) | Two silent catalog bugs, and the unit tests that would have caught them | refined |

Order of work is the table's order, not the ID — tasks 01–03 were written
first and keep their numbers ([the template](template.md): IDs are permanent).
The two decision tasks come first because each changes what the tasks after it
build: [09](iteration-7/09-feed-and-private-cellars.md) decides what a feed
event may say and therefore what [01](iteration-7/01-feed-module.md) stores,
and [05](iteration-7/05-feed-delivery-decision.md) decides the delivery
mechanism and therefore the shape of [06](iteration-7/06-feed-increments.md)
and [07](iteration-7/07-live-front-page.md). Both produce an ADR and no
production code, following
[iteration 6 task 07](iteration-6/07-cellar-domain-events.md) and
[iteration 8 task 01](iteration-8/01-catalog-data-source.md).

**A feed line names its person by username**, decided 2026-09-12: it publishes
strictly less than a real name, and for a public cellar it publishes nothing
that `/cellars/{username}` does not already
([ADR-0050](../adr/0050-public-cellar-addressing.md)). The username is also the
line's **link** to that cellar, which is what keeps the Finnish sentence
translatable without a component placeholder mid-sentence
([task 03](iteration-7/03-front-page-feed.md)).
[Task 10](iteration-7/10-person-display-name.md) is kept as `dropped` because
it holds the reasoning, including the one control that decision leans on and
that did not exist —
[task 11](iteration-7/11-keycloak-brute-force-protection.md).

The five hardening tasks are lifted from
[the quality backlog](quality-backlog.md) — SHOULD-24, the brute-force half of
SHOULD-25, SHOULD-13, SHOULD-14, and SHOULD-22/23/COULD-16 merged into one.
Three of them are here rather than in a later sweep because this iteration is
what makes them urgent: `feed` is the third module to register a global
exception advice, [task 02](iteration-7/02-feed-api.md) is the first public
endpoint returning many users' data, and the front page is what starts
publishing usernames.

Depends on [iteration 6](iteration-6.md): the feed's central question is what
it may show about a private cellar, which cannot be answered before cellars
have a visibility model.

The front page today renders a static welcome. This iteration replaces it, so
it is also the first time Kalia's landing page has anything on it — and the
first time any page in Kalia changes without the visitor doing something,
which is where [task 07](iteration-7/07-live-front-page.md)'s accessibility
work comes from.

## Refinement

Refined in one conversation on 2026-09-12
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)): 47 open
questions across 14 live tasks merged into 19 decisions. Each answer is
recorded once, in the Constraints of the task that owns it, and pointed at from
the others ([ADR-0020](../adr/0020-documentation-roles.md)). The two decision
tasks still write the ADRs — refinement recorded *what* was decided, not the
rejected alternatives and consequences that are those tasks' deliverable.

Four answers changed the shape of the iteration rather than merely filling a
gap in it:

- **Only a public cellar appears in the feed**
  ([task 09](iteration-7/09-feed-and-private-cellars.md)). `cellar_public`
  defaults to `false`, so the empty state is the normal first impression rather
  than an edge case, and the front page carries the only lever that changes it.
- **Delivery is polling within a 60-second budget**
  ([task 05](iteration-7/05-feed-delivery-decision.md)), so
  [task 06](iteration-7/06-feed-increments.md) loses the streaming endpoint it
  might have needed, [task 07](iteration-7/07-live-front-page.md) loses the CSP
  and route-handler questions, and no instance-affinity limitation has to be
  accepted.
- **The front page gains infinite scroll**
  ([task 03](iteration-7/03-front-page-feed.md)), which makes that task build a
  client component rather than a pure server-rendered list, and makes its
  ordering after [task 06](iteration-7/06-feed-increments.md) a dependency
  rather than a convenience.
- **The read-time visibility filter is the only thing keeping a private cellar
  off the front page.** A purge of an owner's rows on going private was decided
  during refinement and removed in review of the refinement PR: it bounds
  nothing, because recording never stops and the rows rebuild from that owner's
  next addition. [Task 09](iteration-7/09-feed-and-private-cellars.md) holds
  the full reasoning and the rejected alternative for its ADR to carry;
  [task 01](iteration-7/01-feed-module.md) consumes one event rather than two,
  and `profile` gains no domain event yet.

[Task 08](iteration-7/08-shared-relative-time.md) was conditional on the feed
showing relative time; it does, so the task stands rather than being dropped.
