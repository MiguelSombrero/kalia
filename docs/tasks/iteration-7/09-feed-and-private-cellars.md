# Task 09: What a feed line may reveal, and what that does to ADR-0050

- **Status:** needs-refinement
- **Iteration:** [7](../iteration-7.md)
- **Covers:** DW-3, DW-6

## Why

[ADR-0050](../../adr/0050-public-cellar-addressing.md) bought one property at a
real price: a private cellar, an unknown username and a username nobody has
claimed are one identical 404, so **usernames cannot be walked for cellars**.
The owner pays for it too — they 404 at their own private URL and cannot
preview it. That ADR then names, in its own words, the thing that would make
the decision worth taking again: *"Kalia wants public cellars to be
discoverable — by search, by a browse page, or by a feed that links to
strangers."* This iteration is that feed. The trigger has fired, and the
project's rule is that an accepted ADR is revisited deliberately rather than
contradicted quietly ([CLAUDE.md](../../../CLAUDE.md),
[ADR-0019](../../adr/0019-adr-format-and-conventions.md)).

The [vision](../../../README.md) for this page already answers part of it:
a private cellar's line appears, with the text and no link. Read against
ADR-0050 that is not a small exception. Nobody has to walk anything: the front
page hands a stranger a username, and the presence or absence of a link tells
them which state that cellar is in. It is the same oracle, arrived at from the
other side and without the walk. The question is not whether the vision is
allowed to win — it is the product owner's product — but what ADR-0050's
property becomes once it does, and which of its stated costs are still worth
paying for what is left.

Three consequences travel with it, and none is visible from inside
[task 01](01-feed-module.md) or [task 02](02-feed-api.md):

- **`cellar_public` defaults to `false`**
  ([architecture.md §3](../../architecture.md),
  [ADR-0049](../../adr/0049-profile-module-and-public-identity.md)). A rule of
  "only public cellars appear in the feed" therefore ships a landing page that
  is empty until somebody opts in — the opposite of what this iteration is for.
- **The consent behind the visibility toggle changes meaning.** ADR-0050 chose
  `noindex, nofollow` specifically so the control's copy — "anyone with the
  link" — could be *exactly* true. Once the front page hands the link to every
  visitor, "anyone with the link" is everyone. Users who already flipped that
  switch agreed to the old sentence.
- **The front page is not `noindex`, and it will contain names.** The cellar
  page's own directive keeps it out of a search index, but the front page
  carrying "Miguel Sombrero added AleSmith IPA" is itself indexable content,
  and a crawler reading it discovers both the username and the URL. The
  information ADR-0050 kept out of search arrives in it through a page nobody
  thought of as a cellar.

## Scope

One decision, recorded: whether a feed line exists for a cellar that is not
public and what it may name; what the front page's own indexing directives
become; and what remains of ADR-0050's uniform-404 property once the answer is
in — written as an amendment to that ADR, or as an ADR that supersedes the
part of it that no longer holds.

## Non-goals

- Implementing any of it. [Task 01](01-feed-module.md) decides what is
  recorded, [task 02](02-feed-api.md) what is served and
  [task 03](03-front-page-feed.md) what is rendered; each obeys this.
- Changing the visibility control itself, beyond its wording. A second toggle,
  if question 4 wants one, is a task of its own and probably a later iteration.
- Revisiting `/cellars/{username}`'s 404 behaviour for *direct* requests. That
  stays as it is unless this decision makes it pointless, which is question 3.
- GDPR erasure. It is [backlog](../backlog.md) work and it will reach this
  decision eventually; naming that is enough for now.

## Constraints

- [ADR-0019](../../adr/0019-adr-format-and-conventions.md): an accepted ADR is
  **amended, never rewritten**, and what changed it is recorded in its own
  `Amended`/`Superseded-by` field rather than in prose that will drift
  ([architecture.md §9](../../architecture.md)). `node scripts/check-adrs.mjs`
  checks the index rows either way.
- The answer must hold for a cellar whose visibility changes **after** an event
  was recorded, in both directions — public then private, and private then
  public. That is the case every fixture-based test misses and it is already
  named in tasks [01](01-feed-module.md) and [02](02-feed-api.md); this task
  decides what "correct" means there.
- Whatever is decided is one rule applied at read time, not a rule the writer
  and the reader each implement — two implementations of a privacy rule is one
  implementation and one liability.
- A decision that "just shows less" still has to be checkable. If a private
  cellar's line is unnamed, the response must not carry the name in a field the
  page happens not to render; a stripped-in-the-UI answer is not a privacy
  answer.

## Open questions

1. **Which of these is the feed?** (a) Every addition appears, and only a
   public cellar's line links — the vision as written. (b) Only public cellars
   appear at all — safest, and empty by default, per Why. (c) Every addition
   appears, but a non-public cellar's owner is not named: *"Someone added
   AleSmith IPA to their cellar."* (d) Appearing in the feed is its own opt-in,
   separate from cellar visibility. They differ in what a stranger learns, in
   what a brand-new Kalia's front page looks like, and in how much there is to
   build.
2. **Does the front page become `noindex`, stay indexable, or something in
   between?** An indexable front page carrying usernames is the part of this
   that cannot be undone later — a page in a search index persists after the
   content changes, which is the exact reason ADR-0050 refused indexing in the
   first place.
3. **What is left of ADR-0050's uniform 404?** If the feed already says who has
   a public cellar, the 404 still hides the cellars of people who have never
   added a bottle, and still costs the owner a preview of their own page. Is
   that trade still the one Kalia wants, or does the ADR get amended further
   while it is open?
4. **Do people who have already made a choice get asked again?** Nobody has
   users yet, so the honest version is: does the visibility control's copy
   change, and does it now describe two things — who may read the cellar, and
   whether the owner appears on the front page?
5. **Is a beer someone owns private information at all?** Kalia's position so
   far is that nothing in a cellar is private by nature — an ABV is catalog
   data ([ADR-0050](../../adr/0050-public-cellar-addressing.md)) — and the
   private/public switch is about the *collection*, not the facts in it. A feed
   line publishes one fact from a private collection. Worth saying out loud
   which of those two readings Kalia holds, because every later feature inherits
   it.

## Acceptance criteria

- [ ] A decision record states which option question 1 chose, what the rejected
      ones would have cost, and — as ADR-0019 requires — at least one Bad or
      Neutral consequence of the choice; `node scripts/check-adrs.mjs` passes
- [ ] [ADR-0050](../../adr/0050-public-cellar-addressing.md) is amended in
      place, its revisit trigger marked as fired, and the properties that no
      longer hold are named rather than left standing as written
- [ ] The record states the front page's indexing directive and why, given that
      indexing is the part that cannot be reversed on a user's timescale
- [ ] `docs/architecture.md` §4 and §5 describe the resulting rule where they
      describe the public cellar's addressing and the front page
- [ ] Tasks [01](01-feed-module.md), [02](02-feed-api.md) and
      [03](03-front-page-feed.md) have the answer written into their
      Constraints, and task 01's open question 1 is closed by it, before any of
      them is refined
- [ ] The record names the test each of tasks 01–03 must write to prove the
      rule holds across a visibility change in both directions, without writing
      any of them here

## Notes

This task produces no production code and therefore **no new automated test**,
a deliberate exception to
[ADR-0026](../../adr/0026-task-file-format.md)'s rule that every task carries
one — the same exception taken by
[iteration 6 task 07](../iteration-6/07-cellar-domain-events.md) and
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md). The tests
belong to tasks 01–03, which is why the last criterion names them.

It is first in the iteration's order because it is the only question whose
answer changes what [task 01](01-feed-module.md) *stores*. Everything else can
be decided against a table that already exists.
