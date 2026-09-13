# ADR-0059: A feed line exists only for a public cellar, filtered at read time, and the front page stays noindex

- **Status:** accepted
- **Date:** 2026-09-13

## Context

[ADR-0050](0050-public-cellar-addressing.md) bought a real property at a real
price: a private cellar, an unknown username and a username nobody has claimed
are one identical 404, so usernames cannot be walked for cellars — and the
owner pays for it too, 404ing at their own private URL with no preview. That
ADR named, in its own words, what would make the decision worth revisiting:
*"Kalia wants public cellars to be discoverable — by search, by a browse page,
or by a feed that links to strangers."* [Iteration 7](../tasks/iteration-7.md)
is that feed, so the trigger has fired.

The [vision](../../README.md)'s feed line names a person by first and last
name, which Kalia stores nowhere — `profile.profile` holds only `id`,
`username` and `cellar_public`. [Dropped task
10](../tasks/iteration-7/10-person-display-name.md) settles that a line names
its person by **username** instead, with the security reasoning recorded
there rather than repeated here: showing it reveals nothing a public cellar's
own shared link does not, usernames are already enumerable through
self-registration ([ADR-0055](0055-self-registration-via-keycloak.md)), and a
real name would publish strictly more (linkable, unwithdrawable, not
self-chosen) than the pseudonymous handle a user already agreed to share.

What username-naming leaves open is what happens for a cellar that is **not**
public. A line naming that owner with no link says a person exists and, by
the missing link, that their cellar is not public — a narrow exposure, not a
reappearance of the enumeration oracle ADR-0050 closed, but new and worth
deciding rather than inheriting. Three consequences travel with any answer,
none of them visible from inside the feed's own recording or reading code:

- **`cellar_public` defaults to `false`**
  ([architecture.md §3](../architecture.md),
  [ADR-0049](0049-profile-module-and-public-identity.md)), so a rule of "only
  public cellars appear" ships a landing page empty until someone opts in —
  the opposite of what a front-page feed is for.
- **The visibility toggle's consent changes meaning.** ADR-0050 chose
  `noindex, nofollow` specifically so the toggle's copy — "anyone with the
  link" — could be exactly true. Once a front page hands that link to every
  visitor, "anyone with the link" is everyone; a user who already flipped the
  switch agreed to the old sentence.
- **The front page itself is indexable content that will carry usernames.**
  The cellar page's own `noindex` keeps it out of search; a front page reading
  "MiguelSombrero added AleSmith IPA" is a different page, and a crawler
  reading it associates a handle with what it owns — the exact association
  ADR-0050 kept out of search, arriving through a page nobody thought of as a
  cellar.

## Decision

**Only a cellar that is currently public contributes a line to the feed,
resolved by a single read-time filter rather than anything decided when the
line was recorded; the front page is served `noindex, nofollow`; and
[ADR-0050](0050-public-cellar-addressing.md)'s uniform 404 and locale-less
addressing are otherwise unchanged.**

- **A cellar that is not public contributes nothing, named or unnamed.** A
  feed line is a piece of the collection, not an isolated fact about one
  addition — the same visibility switch that governs the assembled cellar
  governs every line drawn from it. This narrows ADR-0050's "nothing in a
  cellar is private by nature" (which was about a *field*, an ABV, being
  catalog data) to say who owns the collection is a different question, one
  the switch already answers.
- **Recording is unconditional; the filter lives once, at read time.**
  Every addition is recorded regardless of the owner's visibility at that
  moment, and exactly one filter — resolved against `profile`'s *current*
  answer, not a copy taken when the line was written — decides what a reader
  sees. This is what makes a visibility change after an event was recorded
  behave correctly in both directions: an addition made while private and
  later opted in appears without a backfill step, and one made while public
  and later opted out disappears without a delete. Two implementations of
  this rule — one on the write path, one on the read path — would be one
  rule and a liability; there is only ever the read-time one.
- **A line names its person by username, not a display name**, for the
  reasons [dropped task 10](../tasks/iteration-7/10-person-display-name.md)
  records — not restated here, since re-affirming a decision is not a new one
  ([ADR-0032](0032-when-a-decision-earns-an-adr.md)).
- **The front page is `noindex, nofollow`**, matching the public cellar page.
  Indexing is the one part of this that cannot be reversed on a user's
  timescale — a page made indexable later is a header change, a page made
  unindexed is not — so the front page starts exactly as closed as the page
  it draws its content from, and opening it to search is left to a future,
  deliberate decision.
- **ADR-0050's 404 is unchanged.** A direct request to `/cellars/{username}`
  still answers one identical 404 for private, unknown and unclaimed, and the
  owner still cannot preview their own private cellar. The trigger firing
  means discoverability now exists — for a public cellar, through this feed —
  not that the 404 rule stops holding for everyone it always covered, which
  under this decision is still the majority of cellars in a young Kalia.
- **The visibility toggle's copy says both things now**: that a public cellar
  is readable by anyone with the link, and that a public cellar's additions
  appear on Kalia's front page. Nobody has flipped the switch in production
  yet, so the reword is free now and will not be later; the string itself
  ships with the front page that makes the old sentence untrue
  ([task 03](../tasks/iteration-7/03-front-page-feed.md)).

## Alternatives considered

**Show a line for every cellar; an unnamed one for a private owner, or one
named by username with no link.** This is what the Why section above
analyses in detail, and it is a real option: the exposure is narrow (a
username and the fact of non-public status, not the enumeration oracle
ADR-0050 closed) and it was on the table as option (a). Rejected because a
feed line is being fixed here as a piece of the collection rather than an
isolated fact, and every later social feature inherits that reading; carrying
a private owner's username into a page nobody thought of as a cellar page,
even without a link, is discoverability by a different name, and the
narrower rule — contribute nothing — is the one that never needs revisiting
as the feed grows richer lines later.

**A purge on going private, as defense in depth alongside the read filter.**
Delete an owner's existing feed rows the moment their cellar stops being
public, so a broken read filter would not be the only thing standing between
a private cellar and the feed. Rejected on four grounds, each fatal alone:

- **It bounds nothing.** Recording never stops, so an owner's rows rebuild
  from their very next addition — the purge clears a snapshot, not a state.
- **Its defense in depth is partial in the worst direction.** It only
  reaches rows predating the flip, so a broken filter still exposes
  everything added after it — the more recent, more sensitive half. A
  partial net against a fail-open bug is worse than none: its presence is
  what tempts a later reader to trust it instead of the filter it cannot
  replace.
- **It makes history asymmetric and irreversible.** An owner who goes private
  and public again loses everything from before the flip; one who never
  toggled keeps it — permanent data loss from a one-click control whose copy
  says nothing about deletion.
- **It does not un-publish.** A line already painted in a visitor's browser
  survives until they reload regardless, and the front page is `noindex`, so
  there is no search index to expunge either. The one thing a purge could
  have delivered that the filter alone cannot — actually erasing what had
  been shown — it does not deliver, because nothing here erases a rendered
  page.

  The accepted cost of rejecting it: the `feed` table retains rows for
  cellars that are currently private. They are never served, assembled into
  a line, or counted — retained, not exposed — and GDPR erasure
  ([backlog](../tasks/backlog.md)) is where that retention gets revisited, not
  this decision.

**Make the front page indexable.** A feed is exactly the kind of content
search engines are good at surfacing, and an unindexed front page is a
smaller feature than an indexed one. Rejected for the reason ADR-0050 already
gives indexing in general: it is not reversible on a user's timescale, and it
is the one property this decision can afford to leave closed while everything
else about discoverability changes.

**A caller-dependent branch letting an owner preview their own private
cellar or its feed lines.** Stays rejected for the reason ADR-0050 gives it:
a status or content difference keyed on who is asking is untestable in one
direction without decaying into the other, on a path meant to answer
identically for everyone.

## Consequences

- Good, because the filter is one rule in one place, so there is no
  consume-time check to get wrong and no window in which an addition is
  silently dropped or silently exposed because the owner flipped the switch a
  moment earlier or later.
- Good, because showing a username beside a public cellar's own shareable
  link reveals nothing that link did not already — the feed's cost is paid
  entirely by discoverability, not by a new fact about anyone.
- Bad, because a new Kalia's front page is empty until somebody opts in, and
  `cellar_public` defaults to `false` — the empty state
  [task 03](../tasks/iteration-7/03-front-page-feed.md) builds is this
  decision's direct consequence, not a corner case.
- Bad, because the `feed` table permanently retains rows for cellars that are
  currently private, as the accepted cost of rejecting the purge above; this
  is revisited only by GDPR erasure work, not by this decision.
- Neutral, because a line already painted in a visitor's browser cannot be
  retracted — a cellar going private while someone sits on the front page
  leaves that line on screen, with a link that 404s from that moment, until
  they reload. Accepted rather than solved:
  [task 06](../tasks/iteration-7/06-feed-increments.md)'s increments contract
  is additive by design, and nothing here proposes evicting a rendered line.
- **Revisit trigger:** an owner asking to preview their own private cellar or
  front-page appearance, or GDPR erasure reaching the retained rows above —
  either reopens the read-time-only rule or the no-purge decision.

## Evidence

`FeedControllerIT` already exercises both directions of a visibility change
after an event was recorded — a profile made public then flipped private
(the line disappears), and one made private then flipped public (the line
appears) — against the read-time filter this ADR describes, confirming the
rule holds in the code [task 02](../tasks/iteration-7/02-feed-api.md) shipped
ahead of this record. The corresponding coverage still owed:

- [Task 01](../tasks/iteration-7/01-feed-module.md) needs no visibility test
  of its own — recording is unconditional and the write path never consults
  `profile`.
- [Task 02](../tasks/iteration-7/02-feed-api.md) already carries it, as
  above.
- [Task 03](../tasks/iteration-7/03-front-page-feed.md) must add a test —
  component or E2E — that re-fetches the rendered page after a visibility
  flip in both directions and asserts a line's presence changes accordingly,
  the front-page analogue of `FeedControllerIT`'s two cases rather than a
  restatement of them.
