# Task 04: The reads a feed line needs

- **Status:** refined
- **Iteration:** [7](../iteration-7.md)
- **Covers:** DW-2

## Why

A feed line is a sentence about a person and a beer: *"Miguel Sombrero added
AleSmith IPA to the cellar."* Nothing in Kalia can produce either half of it
from a feed event.

[ADR-0053](../../adr/0053-cellar-domain-events-on-the-aggregate-root.md) fixed
that an event carries ids and `occurredAt` and nothing mutable, and said the
consumer "reads current data back through `CatalogApi` and `ProfileApi`" — that
sentence is what keeps a cellar made private after the fact from leaking
through a stale copy. But the rule cannot be followed as written, because
neither API carries the read it names. `CatalogApi` exposes `beerExists(UUID)`
and nothing else. `ProfileApi` exposes `publicCellarOwnerId(String)` — a
username-to-id lookup, the opposite direction from the one a feed makes, which
starts from a user id and needs a name to print and an answer about linking.
There is today **no way at all, over HTTP or across modules, to turn a user id
into anything a line could print.** `profile.profile` holds the username and
`ProfileApi` will not hand it over for an id. A feed line names its person by
username — the product owner's decision, with the reasoning in
[dropped task 10](10-person-display-name.md) — so the missing read is narrow
and entirely inside `profile`.

The second half is shape, not existence. A page of twenty lines resolves twenty
beers and twenty people. Done one line at a time that is forty queries across
two modules on the app's landing page, and it is the fan-out the catalog
already had to answer once — `GET /api/v1/beers/batch`
([architecture.md §4](../../architecture.md)) exists precisely because a client
holding a list of ids should not ask twenty times.

## Scope

Making two facts reachable for a *set* of ids rather than one at a time: a
catalog beer's identity as a feed line prints it, and a person's username plus
their cellar's current visibility — the username being both what a line prints
and what a public cellar's link is built from. Whichever side of the API
boundary question 1 settles, the same two reads are the deliverable.

## Non-goals

- The feed endpoint itself — [task 02](02-feed-api.md).
- Introducing a display name distinct from the username. Decided against —
  [dropped task 10](10-person-display-name.md) records why.
- Recording events — [task 01](01-feed-module.md).
- Deciding what a line may say about a private cellar —
  [task 09](09-feed-and-private-cellars.md) owns that, and this task returns
  whatever it allows.
- Caching either read. [architecture.md §8](../../architecture.md) records that
  backend read-caching waits for a measurement; a batch shape is the thing that
  makes the measurement unnecessary for now.
- Changing how the cellar page gets its beer names. It enriches client-side
  today ([iteration 6 task 09](../iteration-6/09-batch-beer-lookup-for-cellar.md));
  whether it should converge on whatever this task builds is question 4.

## Constraints

- **A module's root package is its inter-module API and calls its own
  `application` layer, never another module's `domain`**
  ([architecture.md §3](../../architecture.md),
  [ADR-0007](../../adr/0007-backend-package-structure.md)); `ArchitectureTest`
  and `ModularityTest` are the guards.
- **A missing profile row reads as private, and a missing row is legitimate** —
  profiles are created lazily, the first time anything needs one
  ([ADR-0049](../../adr/0049-profile-module-and-public-identity.md)). Every
  reader must apply that rule, and a *batch* reader must apply it to ids it
  gets no row back for, which is the case a per-id reader never has to think
  about.
- **A caller must not be able to tell "no such user" from "cellar is private"**
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)). In a batch read
  that is a shape question, not a status-code question: two different absences
  in one response are distinguishable unless they are deliberately made not to
  be.
- Whatever the read returns must resolve in **one query per module regardless
  of how many ids are asked for**, and the id set must be bounded
  ([ADR-0042](../../adr/0042-bounded-request-parameters.md)). The existing
  batch convention — unknown ids omitted rather than returned as null, `400`
  over the cap ([architecture.md §4](../../architecture.md)) — is the one to
  follow or to deviate from deliberately, not to re-invent by accident.
- If question 1 lands on an HTTP endpoint, it is a **public** one and is listed
  as such deliberately ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)),
  and the generated client is regenerated and committed
  ([ADR-0012](../../adr/0012-orval-api-client.md)).

**Decided 2026-09-12 by the product owner.** This section is the single home
for how a line is assembled; [task 02](02-feed-api.md) and
[task 03](03-front-page-feed.md) point here.

- **The backend assembles the line** (question 1). `GET /api/v1/feed` answers
  with the username, the beer, the brewery, the count, the vintage and the
  time — resolved server-side, one query per module — not with ids for a client
  to enrich. **Both reads therefore stay inside the backend as module APIs
  (`CatalogApi`, `ProfileApi`); neither becomes an HTTP endpoint**, so the
  bounding above applies to the module-API method signature rather than to a
  request parameter, and nothing is added to the OpenAPI spec by this task.
- **[architecture.md §4](../../architecture.md)'s client-agnostic-resources
  convention is reconciled, not excepted.** That convention says an endpoint's
  shape follows the resource rather than the screen. "Who added what, and when"
  *is* the feed resource — a feed event without its actor is not a smaller
  resource, it is an incomplete one — so returning it whole follows the
  convention. The ids-only alternative is the one that would shape the endpoint
  around a rendering strategy. §4 currently names the feed endpoint as where
  this convention gets tested; the paragraph gets that reading written into it
  by [task 09](09-feed-and-private-cellars.md)'s documentation pass or this
  task, whichever lands first, so the two documents do not disagree.
  [ADR-0053](../../adr/0053-cellar-domain-events-on-the-aggregate-root.md)'s
  "the consumer reads back through `CatalogApi` and `ProfileApi`" is satisfied
  literally.
- **The privacy argument for backend assembly is gone, and that is worth
  recording rather than relying on.** [Task 09](09-feed-and-private-cellars.md)
  decided only public cellars appear, so every line is linkable by construction
  and there is no username a browser would have to be trusted not to link. The
  decision above rests on the resource argument and on the landing page's first
  paint being one call rather than three — not on privacy.
- **The beer read returns name and brewery separately** (question 2), so a line
  can name the brewery and so a brewery link stays available later without
  changing the read.
- **A line whose beer or person no longer resolves is dropped** (question 3),
  not rendered with a blank. Theoretical until GDPR account deletion
  ([backlog](../backlog.md)), which makes it the normal case for exactly the
  people who asked to disappear — so dropping is also the behaviour those users
  would want.
- **The `ProfileApi` batch read stays username-plus-current-visibility.** The
  feed filters on it ([task 09](09-feed-and-private-cellars.md)), so the
  visibility answer is load-bearing on the read path and not merely a hint for
  whether to link.
- **The cellar page's client-side enrichment is deliberately not converged on
  this** (question 4). It stays as
  [iteration 6 task 09](../iteration-6/09-batch-beer-lookup-for-cellar.md)
  built it: a signed-in page whose client component already holds ids, reading
  over `/beers/batch` through a Server Action
  ([ADR-0040](../../adr/0040-client-reads-via-server-actions.md)). The feed is
  a public, server-rendered landing page assembled in one call. Two shapes for
  two situations, said out loud here so a later reader tidies neither into the
  other. **Recorded by the agent during refinement rather than asked** — the
  product owner should say so if they disagree.

## Open questions

**None.**

## Acceptance criteria

- [ ] A set of beer ids resolves to a name and a brewery, separately, in one
      query, and an unknown id is handled by the convention this task states
      rather than by an exception — integration test including an unknown id
- [ ] A set of user ids resolves to a username and the *current* cellar
      visibility, in one query — integration test
- [ ] A user id with no profile row and a user id whose cellar is private are
      indistinguishable in the response — integration test asserting the two
      cases produce identical output, confirmed to fail against an
      implementation that reports them separately
- [ ] The id set is bounded and an over-cap request is rejected rather than
      executed — integration test
- [ ] `ModularityTest` and `ArchitectureTest` stay green with `feed` reading
      both modules, and `cellar` still does not depend on `feed`
- [ ] Neither read is exposed over HTTP, so the OpenAPI spec and the generated
      client are unchanged by this task — `api-client-drift` passes with no
      regeneration, which is the observable form of "these stayed module APIs"
- [ ] `mvn clean verify` is green

## Notes

**None.**
