# Task 04: The reads a feed line needs

- **Status:** needs-refinement
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

## Open questions

1. **Who assembles a feed line — the backend or the browser?** This is the
   task's real question and it points two ways at once.
   [ADR-0053](../../adr/0053-cellar-domain-events-on-the-aggregate-root.md)
   says the consumer reads back through `CatalogApi`/`ProfileApi`, which is
   backend assembly. [architecture.md §4](../../architecture.md)'s
   client-agnostic-resources convention says the opposite and *names the feed
   endpoint by name* as one of the places that convention is about to be
   tested; the cellar page already works that way, holding ids and enriching
   them over `/beers/batch`. The feed has one thing the cellar does not,
   though: the decision of whether a cellar may be linked is a privacy
   decision, and handing a browser the ingredients to make it — a username it
   would then have to be trusted not to link — is a different thing from
   handing it a beer name. An answer here either way should be reconciled with
   whichever of those two documents it contradicts, rather than left as two
   rules that disagree.
2. **Does a line name the brewery?** The vision's sentence says "AleSmith IPA",
   which is already brewery-plus-beer in one string as beer names usually go.
   Whether the read returns the brewery separately decides whether a line can
   say "AleSmith's IPA" or link the brewery later.
3. **What does a line do when its beer or its person no longer resolves?**
   Nothing deletes catalog beers and nothing deletes profiles today, so this is
   theoretical — until GDPR account deletion ([backlog](../backlog.md)), which
   makes it the normal case for exactly the users who asked to disappear. Drop
   the line, or render it without the name?
4. **Should the cellar page's client-side enrichment converge on this?** Two
   ways of turning ids into beer names is a thing someone will later "tidy",
   and it is cheaper to say now that they are deliberately different than to
   discover it in a review.

## Acceptance criteria

- [ ] A set of beer ids resolves to what a feed line prints, in one query, and
      an unknown id is handled by the convention this task states rather than
      by an exception — integration test including an unknown id
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
- [ ] If question 1 lands on HTTP, the generated client is regenerated and
      committed and the `api-client-drift` CI job passes
- [ ] `mvn clean verify` is green

## Notes

**None.**
