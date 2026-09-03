# Task 06: What a cellar entry with no bottles is

- **Status:** done
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

Carrying the decision that an entry dies with its last bottle through the
model, the cellar list endpoint and the tests — plus the removal flow's own
wording, since a beer leaving the cellar is a bigger consequence than a bottle
leaving an entry, and `docs/architecture.md` §3, which describes the two-level
model without describing this case.

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
- **An entry dies with its last bottle.** An entry is a pure grouping: the
  cellar contains exactly the beers you own bottles of, and there is no
  zero-quantity row in any reader. Re-adding that beer creates a fresh entry,
  so `UNIQUE (user_id, beer_id)` cannot collide with a survivor. The rejected
  alternative — an entry as something a user *has*, where a zero count would
  mean "I finished these" — and why it lost go into
  [ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md) as an amendment,
  never a rewrite ([ADR-0019](../../adr/0019-adr-format-and-conventions.md));
  `architecture.md` §3 carries the one-line fact.
- **`Entry.updated_at` means "the last time this beer's holdings changed"** —
  it moves when a bottle is added, edited or removed, which is what a reader
  of the published `EntryDto` field would assume and what it does not do
  today. [Task 05](05-cellar-aggregate-owns-its-writes.md) routes writes
  through the root, which is what makes that a natural write rather than a
  retrofit.
- **The removal flow says what happened.** Iteration 5
  [task 14](../iteration-5/14-edit-remove-bottle.md)'s existing undo toast
  gains a second message for the last-bottle case, naming that the beer is no
  longer in the cellar. No new interaction and no confirmation dialog: undo
  restores the bottle, which restores the entry, so the escape hatch already
  covers the larger consequence — and a modal here would put two different
  safety models on one action.

## Open questions

**None.**

## Acceptance criteria

- [x] Removing an entry's last bottle has a defined outcome, proven by an
      integration test that adds one bottle, removes it, and asserts what
      `GET /api/v1/cellar` returns — confirmed to fail against today's build,
      which returns a zero-quantity row nobody chose
      (`CellarApiIT.removingAnEntrysLastBottleDropsTheBeerFromTheCellarList`;
      reverting the fix makes it expect 0 but get 1)
- [x] Adding a bottle of the same beer again after the entry emptied works and
      does not collide with `UNIQUE (user_id, beer_id)` — integration test,
      whichever way question 1 is answered
      (`CellarApiIT.aBeerCanBeAddedAgainAfterItsEntryEmptied`,
      `CellarServiceIT.reAddingABeerAfterItsEntryEmptiedCreatesAFreshEntryWithoutColliding`;
      also exercised in the browser)
- [x] `Entry.updated_at` moves when a bottle is added, edited or removed —
      integration test, confirmed to fail against today's build where it never
      moves after creation
      (`CellarServiceIT.movesTheEntrysUpdatedAtWhenABottleIsAddedUpdatedOrRemoved`;
      the moving `updated_at` shipped with [task 05](05-cellar-aggregate-owns-its-writes.md)
      / [ADR-0052](../../adr/0052-cellar-aggregate-owns-its-writes.md), so the
      test is green on `dev` now — this task keeps it green through the
      entry-deletion change)
- [x] [Task 02](02-public-cellar-api.md) has its Scope or Constraints updated
      to name this behaviour before it is refined, so the public read inherits
      the decision rather than re-deriving it — done in the refinement PR that
      settled it, which is the only place it could have been done in time
- [x] Removing the last bottle shows the message that names the consequence,
      and undo restores both the bottle and the entry — component test for the
      wording, integration test for the restore
      (`BottleRemoval.test.tsx` "removes a beer's row once its last bottle is
      removed, names the consequence, and Undo restores both"; browser-confirmed
      the wording "Bottle removed. That beer is no longer in your cellar.")
- [x] `docs/architecture.md` §3 states how long an entry lives, and
      [ADR-0034](../../adr/0034-cellar-two-level-bottle-model.md) is amended
      with the decision and the rejected alternative — in the same PR, with
      `node scripts/check-adrs.mjs` passing
- [x] `mvn clean verify` is green

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

Refined 2026-08-30 with iteration 6 as a batch
([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)). The lean
above held: the entry dies. Questions 2 and 3 — whether the cellar list and a
public cellar show zero-quantity rows — went away with it, since there are
none to show.
