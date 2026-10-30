# ADR-0091: A contributed catalog entry waits for an operator, and no catalog row is ever deleted

- **Status:** accepted
- **Date:** 2026-10-27
- **Amended:** 2026-10-30 — a public cellar leaves out every beer that is not
  `APPROVED`, so its pages and totals count only what the reader is shown; an
  owner's own cellar and the feed still name a `REJECTED` or `REMOVED` beer

## Context

Iteration 8 let any signed-in user add a beer, and its brewery, to the catalog
everyone shares, visible to everyone at once. Nothing stopped a script from
filling it, and the only remedy for junk or an offensive name was SQL by hand.
Removing a row raised a second question the code had answered only by habit:
a cellar entry or a feed line points at a catalog beer by id across a module
boundary with no foreign key (`docs/architecture.md` §3), so a beer that goes
away leaves entries its owner can no longer see, and `CellarService` and
`FeedService` quietly drop them on read.

Product-owner decisions at refinement on 2026-10-24: a contribution is visible
to its contributor at once, keeping iteration 8's promise that a beer one adds
can be cellared immediately, and to nobody else until reviewed; the number
waiting per contributor is bounded; review is an operator command, not a role
or a page; and a catalog beer is never hard-deleted.

## Decision

A beer or brewery a user adds starts `PENDING`, is seen by its contributor
alone, and becomes visible to everyone only when an operator approves it; an
operator can also reject or remove it, which hides it, and no catalog row is
ever deleted.

- **Four states**, stored in `moderation_status` on `catalog.beer` and
  `catalog.brewery`: `PENDING`, `APPROVED`, `REJECTED` (refused while pending)
  and `REMOVED` (taken down after approval). Seeded and imported rows are
  `APPROVED`, which is the column's default.
- **Visible** means `APPROVED`, or `PENDING` and the viewer is the contributor.
  Search, a beer's details, the brewery list, adding to a cellar and adding a
  beer to an existing brewery all apply it. A `PENDING` row is also left out of
  every public read of a cellar and of the feed. A `REJECTED` or `REMOVED` row
  is hidden from all of those and from a public cellar, and still named
  wherever else something points at it: an owner's cellar and the feed.
- **A contributor may have 20 entries waiting** (`PENDING` beers plus
  breweries; a beer with a new brewery is two). An add past that answers `429`
  `problem+json` until some are approved or rejected. Two adds by one
  contributor are serialised by a transaction-scoped advisory lock, so the
  count cannot be read by both.
- **The operator command** is `make moderate`, which runs
  `scripts/moderate-contributor.sql` against the stack's PostgreSQL. It acts on
  everything one contributor added, named by username or id: *approve* turns
  `PENDING` into `APPROVED`, *reject* turns `PENDING` into `REJECTED`, *remove*
  turns `PENDING` or `APPROVED` into `REMOVED`.
- **No catalog row is deleted**, by the command or by anything else. Hidden is
  a state, not an absence, and an integration test pins that an owner's cellar entry
  and a feed line pointing at a rejected or removed beer still render.
- **A hidden row leaves the duplicate key.** The unique indexes on
  `(brewery, folded name)` and `(folded name, country)` cover `PENDING` and
  `APPROVED` rows only, so a name an operator refused can be proposed again.
- **A name is folded with NFKC before case and punctuation**, so a fullwidth
  twin of a name is a duplicate, and a name containing a Unicode `Cf` character
  (zero-width, bidirectional control, soft hyphen) is refused with `400`.

## Alternatives considered

- **A per-contributor quota alone.** Bounds the damage of one account but not
  its content: an offensive name is still public at once. Rejected by the
  product owner in favour of review.
- **Deleting a removed beer, and cleaning up what points at it** through a
  deletion event. Rejected: it makes a stranger's cellar and the feed lose
  rows because of a decision about someone else's contribution, and a cleanup
  that fails or is missed leaves the orphans this ADR set out to avoid.
- **Accepting orphans**, dropping them on read as the code did. Rejected: the
  drop is invisible to the owner, never cleaned up, and untested.
- **An approver role and review page.** The backlog's "Admin UI + role-based
  access" item; far larger than the need, and nobody but the operator reviews.
- **A cross-schema foreign key**, so the database refuses a delete that
  something references. Rejected by `docs/architecture.md` §3's no-cross-schema
  rule, which also keeps modules extractable.
- **A database trigger refusing `DELETE` on `catalog.beer`.** Would enforce the
  invariant for any writer, but it also blocks test cleanup and a future
  deliberate purge, and the invariant is one every writer in this codebase can
  keep by not deleting. The integration test is the guard.
- **Keeping the unique index over every row.** Simpler, but a refused or junk
  name would block a legitimate one for good, with no way to free it short of
  deleting the row.
- **Zero-width characters stripped inside `fold_name`.** Would make a zero-width
  twin a `409` rather than a `400`, but `fold_name` must fold no more than the
  Wikidata generator does, or the import trips the unique index; the generator
  does not strip them, and refusing them at the edge is the stronger answer.

## Consequences

- Good, because a script can fill only 20 slots in a queue nobody else sees,
  and an offensive name is never public before an operator has looked at it.
- Good, because a cellar or feed line never loses what it points at: the
  invariant is a stated policy with a test, where it was an assumption.
- Good, because the same hidden-not-deleted rule covers the removal of a
  contributor's whole output, which `make moderate remove` does in one
  statement.
- Bad, because review is manual and needs an operator with database access; a
  contributor who is never reviewed waits forever, and nothing tells them.
- Bad, because the duplicate check cannot tell a row the viewer can see from
  one they cannot: proposing the name of someone else's pending entry answers
  `409` with an id that then reads as not found, and for a brewery discloses its
  name and country and offers a brewery the proposer cannot use.
- Bad, because a hidden beer's details page answers `404` while a cellar entry
  and a feed line still render it, so their link to it is dead; and a public
  cellar omits a rejected or removed beer that the owner's cellar and the feed
  still show.
- Bad, because removing a brewery hides nothing of another contributor's beers
  in it; they stay visible, under a brewery the lists no longer show.
- Neutral, because every catalog read now filters on `moderation_status`; the
  filter passes almost every row, and `BeerSearchIndexIT` still asserts each
  search index is chosen.
- Neutral, because the count is of waiting entries, not of requests, so it
  bounds a queue and is not a rate limit; throttling requests belongs to the
  edge ([iteration 8.5 task 10](../tasks/iteration-8.5/10-unauthenticated-edges-throttled.md)).
- **Revisit trigger:** a second operator, or a contributor-visible outcome
  (a notification that an entry was approved or rejected), either of which
  asks for the roles and page the backlog already names.
