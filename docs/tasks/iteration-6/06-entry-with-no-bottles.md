# Task 06: What a cellar entry with no bottles is

- **Status:** needs-refinement
- **Iteration:** [6](../iteration-6.md)

## Why

Removing a bottle deletes that bottle's row and nothing else. When the bottle
removed was the entry's last one, the entry survives with no bottles under it,
and because `EntryRepository.findSummariesByUserId` counts with a `LEFT JOIN`,
that entry keeps coming back from `GET /api/v1/cellar` — a beer the caller
owns none of, quantity 0, indefinitely.

Nobody decided this. It is reachable today with two API calls, no test covers
removing an entry's last bottle, no task in iteration 5 describes the case, and
[ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md) — which settled the
two-level model in every other respect — does not say whether an entry outlives
its bottles.

Now, because this iteration gives that same list a second reader.
[Task 02](02-public-cellar-api.md) publishes a cellar to strangers, and a
phantom row is a worse thing to show a stranger than to show someone about
their own cellar: "beers this person owns none of" is a claim nobody chose to
publish. Deciding after task 02 ships means fixing it in two readers instead
of one.

## Scope

Settling how long an entry lives once its last bottle is gone, and carrying
that answer through the model, the cellar list endpoint and the tests — plus
whatever `docs/architecture.md` §3 has to say about it, since it currently
describes the two-level model without describing this case.

Underneath the mechanics is the question the answer actually turns on: whether
an entry is something a user *has*, or purely a grouping that exists for as
long as there are bottles to group.

## Non-goals

- Restructuring the write path — [task 05](05-cellar-aggregate-owns-its-writes.md).
- Public cellar reads — [task 02](02-public-cellar-api.md), which inherits
  whatever this decides rather than deciding it again.
- Any "drunk", "wanted" or history state for a bottle that is gone.
  [architecture.md §3](../../architecture.md) records that a bottle is removed
  by deleting its row and there is no such state. If the answer here turns out
  to be that entries persist *as* history, that is a larger question and
  belongs in the [backlog](../backlog.md), not in this task's implementation.

## Constraints

- [ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md) is accepted:
  quantity stays derived, and nothing here introduces a stored count or a
  stored "is empty" flag. If the decision contradicts something that ADR
  assumed, it is amended, never rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- `cellar.entry` carries `UNIQUE (user_id, beer_id)` and `cellar.bottle`
  references it `ON DELETE CASCADE`
  ([V005__cellar_schema.sql](../../../backend/src/main/resources/db/migration/cellar/V005__cellar_schema.sql)).
  Whatever is decided must not make adding a bottle of that beer again collide
  with a row that survived, and must not delete bottles that should have
  stayed.
- Migrations are forward-only, with the narrow pre-deployment exception in
  [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md) — relevant only
  if the decision requires cleaning up rows that already exist locally.
- The empty case has to be reachable from a test whichever way it is decided.
  It is reachable from the API today and covered by nothing, which is how it
  got this far.

## Open questions

1. **Does an entry die with its last bottle, or survive it?** Deleting it
   makes an entry a pure grouping, and the cellar contains exactly the beers
   you own bottles of. Keeping it makes an entry something the user holds, and
   a zero count then means something — "I finished these" or "I want more" —
   which is a feature, not a leftover.
2. **If entries survive, does the cellar list show them?** A zero-quantity row
   is either noise to filter out at read time or precisely the thing worth
   showing. These are different answers and the second one implies UI work in
   [task 03](03-profile-page.md)'s neighbourhood.
3. **If entries survive and are shown, what does a *public* cellar show?**
   Whether "owns none of this" is other people's business is a privacy-shaped
   question, not just a display one, and [task 02](02-public-cellar-api.md)
   has to know the answer.
4. **Should removing the last bottle tell the user anything?** If the entry
   disappears from their cellar, that is a bigger consequence than removing
   one of six, and iteration 5 [task 14](../iteration-5/14-edit-remove-bottle.md)
   built the removal flow without knowing it.
5. **Should an entry's `updated_at` move when a bottle is added or removed?**
   It does not today: both operations write only the bottle row, so
   `Entry.updated_at` reflects nothing but the entry's creation — and it is
   published in `EntryDto`. This is the same question about what an entry is,
   asked about a different column, so it is cheaper to answer here than
   separately.
6. **Does this earn an ADR, or an amendment to
   [ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md), or neither?**
   The *fact* fits in one line of `architecture.md` §3. Whether the reasoning
   needs a home depends on how close the two answers in question 1 turn out to
   be ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)).

## Acceptance criteria

- [ ] Removing an entry's last bottle has a defined outcome, proven by an
      integration test that adds one bottle, removes it, and asserts what
      `GET /api/v1/cellar` returns — confirmed to fail against today's build,
      which returns a zero-quantity row nobody chose
- [ ] Adding a bottle of the same beer again after the entry emptied works and
      does not collide with `UNIQUE (user_id, beer_id)` — integration test,
      whichever way question 1 is answered
- [ ] What an entry's `updated_at` means is stated and covered by a test, so
      the column stops being true by accident
- [ ] [Task 02](02-public-cellar-api.md) has its Scope or Constraints updated
      to name this behaviour before it is refined, so the public read inherits
      the decision rather than re-deriving it
- [ ] `docs/architecture.md` §3 states how long an entry lives, in the same PR
- [ ] `mvn clean verify` is green

## Notes

Provenance: a Domain-Driven Design review of `backend/` on 2026-08-10, item 3
of its findings. The review reached this by asking an aggregate-lifecycle
question — how long does the root live relative to its members — which is the
argument for [task 05](05-cellar-aggregate-owns-its-writes.md) landing first:
the same question is harder to forget once the aggregate owns its own writes.

The zero-quantity row is visible in `EntryRepository.findSummariesByUserId`'s
`left join e.bottles b`, and `CellarServiceIT` removes bottles only from
entries that have more.

Also the subject of quality-backlog SHOULD-10, retired 2026-08-23 as
superseded by this task rather than duplicated into iteration 5.5. In the
conversation that retired it, the product owner leaned toward deleting the
entry when its last bottle goes (question 1) — recorded here as a data point
for this task's refinement, not a decision: that conversation didn't cover
questions 2-6, in particular the public-cellar-visibility implications
[task 02](02-public-cellar-api.md) needs answered.
