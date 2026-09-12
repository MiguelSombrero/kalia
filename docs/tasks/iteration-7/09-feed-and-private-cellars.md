# Task 09: What a feed line may reveal, and what that does to ADR-0050

- **Status:** refined
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

The [vision](../../../README.md) for this page already answers part of it: a
private cellar's line appears, with the text and no link. A line names its
person by **username** — decided by the product owner on 2026-09-12, with the
security reasoning in [dropped task 10](10-person-display-name.md) — and that
is what most of this decision now turns on.

For a **public** cellar, a feed line reveals nothing new. ADR-0050 already
addresses it as `/cellars/{username}`, the URL its owner is invited to share;
the line's link is that URL. What is new is only that the landing page hands it
out unasked, which is *discoverability* — precisely the thing ADR-0050 asked to
be revisited for, rather than an accident to be caught.

For a cellar that is **not** public, a line carries the owner's username with
no link. That is the genuinely new exposure and the narrow one: it says a
person exists and, by the missing link, that their cellar is not public.
Usernames are already enumerable through the registration form — unique
usernames plus open self-registration means the form necessarily reports a name
as taken — so this is not the enumeration oracle ADR-0050 closed reappearing;
it is a smaller thing, and it should be decided rather than inherited.

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
- **The front page is not `noindex`, and it will carry usernames.** The cellar
  page's own directive keeps that page out of a search index; the front page
  carrying "MiguelSombrero added AleSmith IPA" is itself indexable content, and
  a crawler reading it takes the username, the link, and what that person owns.
  The association ADR-0050 kept out of search — *this handle owns these
  beers* — arrives in it through a page nobody thought of as a cellar.

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

**Decided 2026-09-12 by the product owner. This section is the single home for
the answers; tasks [01](01-feed-module.md), [02](02-feed-api.md),
[03](03-front-page-feed.md), [04](04-feed-line-composition.md) and
[06](06-feed-increments.md) point here rather than restating them
([ADR-0020](../../adr/0020-documentation-roles.md)).** The ADR this task writes
records them, the alternatives above as rejected, and their consequences.

- **A feed line is a piece of the collection, not an isolated fact** (question
  5). The visibility switch governs the facts in a cellar as well as the
  assembled view of them, so a cellar that is not public contributes nothing
  anywhere. This is the reading every later social feature inherits, and it is
  a narrowing of [ADR-0050](../../adr/0050-public-cellar-addressing.md)'s
  "nothing in a cellar is private by nature" — that sentence was about a
  *field* (an ABV is catalog data), not about who owns it.
- **Only a public cellar appears in the feed** (question 1, option b). A cellar
  that is not public produces no line, named or unnamed. The accepted cost is
  the one the Why names: `cellar_public` defaults to `false`, so a new Kalia's
  front page is empty until somebody opts in, and a mature one shows only those
  who did. [Task 03](03-front-page-feed.md) carries the empty state that
  follows from it, which is a first impression rather than an edge case.
- **The front page is served `noindex, nofollow`** (question 2), matching the
  public cellar page for the reason
  [ADR-0050](../../adr/0050-public-cellar-addressing.md) already gives:
  indexing is the part that cannot be reversed on a user's timescale, and
  making the page indexable later is one header change while un-indexing it is
  not.
- **Storage: record every addition unconditionally; the feed *read* always
  filters on the owner's current visibility; and a cellar going private purges
  that owner's feed rows.** The read filter is the single correctness rule.
  **The purge is deliberately redundant defence in depth and must be documented
  as such** — it cannot be the mechanism, because Spring Modulith's event
  publication is asynchronous and at-least-once, so between the visibility
  change committing and the purge running those rows are readable, and a purge
  that silently fails leaves a private cellar on the front page with nothing to
  notice. A reader who later finds both may not delete the filter. The purge
  also means an owner who was ever public retains nothing; an owner who has
  never been public accumulates rows nobody ever sees, which is the accepted
  cost. [Task 01](01-feed-module.md) builds both paths.
- **[ADR-0050](../../adr/0050-public-cellar-addressing.md)'s uniform 404 is
  unchanged** (question 3). The amendment marks the revisit trigger fired and
  records that discovery now exists — for public cellars, through this feed —
  but the 404 still hides everyone who has not opted in, which under the
  decision above is the majority, and the owner still cannot preview their own
  private cellar. A caller-dependent branch on that path stays rejected.
- **The visibility control's copy changes to say both things** (question 4):
  that a public cellar is readable by anyone with the link, *and* that your
  additions appear on Kalia's front page. Nobody has flipped the switch in
  production, so rewording is free now and is not later. The ADR states the
  new meaning; the string itself ships in
  [task 03](03-front-page-feed.md), with the front page that makes the old
  sentence untrue.
- **A line already painted in a visitor's browser cannot be retracted.** A
  cellar going private while someone sits on the front page leaves that line on
  screen until they reload, with a link that 404s from that moment. Accepted
  and recorded as a Neutral consequence rather than discovered later; see
  [task 06](06-feed-increments.md), whose contract is additive by design.

## Open questions

**None.**

## Acceptance criteria

- [ ] A decision record states which option question 1 chose, what the rejected
      ones would have cost, and — as ADR-0019 requires — at least one Bad or
      Neutral consequence of the choice; `node scripts/check-adrs.mjs` passes
- [ ] [ADR-0050](../../adr/0050-public-cellar-addressing.md) is amended in
      place, its revisit trigger marked as fired, and the properties that no
      longer hold are named rather than left standing as written
- [ ] The record states the front page's indexing directive and why, given that
      indexing is the part that cannot be reversed on a user's timescale
- [ ] The record states that a line names its person by username and why a
      separate display name was rejected, so the question is not reopened from
      scratch — [dropped task 10](10-person-display-name.md) is the source, not
      a second home for the reasoning
- [ ] The record states that the read-time visibility filter is the single
      correctness rule and the going-private purge is deliberately redundant,
      in terms plain enough that a later reader cannot remove the filter on the
      grounds that the purge covers it
- [ ] `docs/architecture.md` §4 and §5 describe the resulting rule where they
      describe the public cellar's addressing and the front page
- [ ] The ADR does not contradict the Constraints above, which the refinement
      PR already wrote into tasks [01](01-feed-module.md),
      [02](02-feed-api.md), [03](03-front-page-feed.md),
      [04](04-feed-line-composition.md) and [06](06-feed-increments.md) — read
      against each of them, and any divergence resolved in this PR rather than
      left for the task that hits it
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
