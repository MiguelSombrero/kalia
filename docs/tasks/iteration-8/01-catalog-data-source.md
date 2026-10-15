# Task 01: Decide where catalog data comes from

- **Status:** done
- **Iteration:** [8](../iteration-8.md)

## Why

Kalia's catalog is a Flyway migration written in iteration 1 — a fixed set of
beers that changes only when someone edits SQL and redeploys. That was the right
call then ([architecture.md §8](../../architecture.md)) and it is the ceiling on
everything now: a cellar can only hold beers someone thought to seed, and new
beers appear constantly.

There are three ways out and they are not variations on each other. Kalia can
call an external beer API and hold no catalog of its own; it can seed from an
open dataset once and own the result; or it can own its catalog outright and
grow it only from what users add. They differ in what breaks when the source
goes away, in what a user is allowed to change, and in whether
[task 02](02-add-beer-api.md) is contributing to Kalia's data or reconciling
against someone else's.

The decision has to come before either other task, because it is what they are
built on.

## Scope

Settling the question and recording it: which source, what Kalia stores itself,
what happens to the existing seed data, and what a user contribution means
under the chosen model.

## Non-goals

- Implementing any of it. Tasks [02](02-add-beer-api.md) and
  [03](03-add-beer-ui.md) build what this decides.
- Beer ratings. Sourcing a rating from an external platform is a related
  question with a different answer and lives in the [backlog](../backlog.md).
- Migrating existing cellars, if the decision invalidates seeded beer ids —
  that becomes its own task once there is a decision to size it against.

## Constraints

- The output is an ADR following [template.md](../../adr/template.md) with the
  rejected options and their costs recorded
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)); this passes
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s test because it
  binds the two tasks behind it.
- Any external service is a new dependency and its selection is the product
  owner's, not an agent's — do not go registry-hunting
  ([CLAUDE.md](../../../CLAUDE.md)). Name the candidates and their licensing and
  rate limits; the choice is a question, not a recommendation to act on.
- Kalia never becomes a review platform ([README.md](../../../README.md)). A
  source that only offers ratings and reviews does not answer this question.

The product owner decided the following on 2026-10-15. The evidence behind
them is under Notes; the ADR records the reasoning.

- **The model is a one-time seed from Wikidata, which Kalia then owns.** Beers
  and the breweries that make them are imported once, offline, from a pinned
  Wikidata snapshot. From then on every row is Kalia's own, and nothing at
  runtime calls Wikidata. A live external source and a catalog grown only by
  its users are both rejected, and so are beer.db, Open Brewery DB and Open
  Food Facts as the source.
- **If Wikidata becomes unavailable, changes its terms or deletes items,
  Kalia's catalog is unaffected.** The snapshot is committed and the imported
  rows are Kalia's. Only a future re-import would notice.
- **Facts only, and nothing from Untappd.** The import takes a beer's name, ABV
  and style, and its brewery's name, country and city. It never takes Untappd
  beer or brewery IDs, any other external identifier, review scores,
  descriptions or images. Kalia links to Untappd nowhere.
- **Every catalog row records where it came from.** An imported beer or brewery
  carries its source and the Wikidata item (QID) it came from. Rows from the
  existing seed are marked as Kalia's own seed, and user-added rows as
  user-added. The column design is the import task's.
- **Open about provenance.** Most of Wikidata's beer data cites untappd.com and
  was added in bulk by one volunteer in 2026, by a method nobody documented.
  The ADR says so plainly, records that Kalia accepts that risk deliberately
  without asking the contributor how the data was obtained, and names the
  provenance columns as the way to remove every Wikidata-sourced row in one
  migration if that is ever needed.
- **Kalia credits Wikidata visibly** wherever its data is shown, even though
  CC0 does not require it. Where and in what words is the import task's
  question.
- **The extraction follows Wikimedia's API etiquette**
  ([Terms of Use](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)
  §4, §12). It runs once, paced, with an identifying User-Agent, and never
  from a running app.
- **The existing seed stays.** `V004__catalog_seed_data.sql` is
  unchanged. The import skips any beer or brewery that matches a seeded row, so
  seeded ids, and any cellar entry pointing at one, survive.
- **Users add beers and do not edit them in iteration 8.** No
  existing beer is edited, whether imported or user-added. Editing is a
  [backlog](../backlog.md) item.
- **A user-added beer is visible to everyone at once.** There is
  no review queue. The contributor is recorded, so a bad row can be traced and
  removed by hand.
- **No barcodes in iteration 8.** Wikidata carries almost none.
  Barcodes stay with [iteration 14](../iteration-14.md), which records the
  candidate route.
- **Building the import is [task 17](17-seed-the-catalog-from-wikidata.md)**,
  which runs before [task 02](02-add-beer-api.md).

## Open questions

**None.**

## Acceptance criteria

- [x] An ADR records the chosen model, the two rejected ones and what each
      would have cost, and passes `node scripts/check-adrs.mjs`
- [x] The ADR names what happens if the chosen source becomes unavailable —
      the question the seeded catalog never had to answer
- [x] The ADR names every source evaluated (beer.db, Open Brewery DB, Open Food
      Facts, Wikidata) with its licence and why it was or was not chosen. It
      also records Wikidata's Untappd-derived provenance, the risk accepted and
      the mitigations above.
- [x] `docs/architecture.md` describes the catalog's data source and, where the
      decision changes it, the catalog's shape
- [x] Tasks [02](02-add-beer-api.md) and [03](03-add-beer-ui.md) have their
      Scope and Open questions rewritten against the decision before either is
      refined — the decision is worthless if the tasks behind it still describe
      a different model
- [x] Any test the decision invalidates is identified, and the seed migration's
      fate is stated explicitly rather than left to whoever implements task 02

## Notes

This task produces no production code and therefore **no new automated test**,
which is a deliberate exception to
[ADR-0026](../../adr/0026-task-file-format.md)'s rule that every task carries
one. The rule exists to stop behaviour shipping untested; there is no behaviour
here. The tests belong to tasks [02](02-add-beer-api.md) and
[03](03-add-beer-ui.md), which is also why this task's last criterion is about
naming the tests the decision breaks rather than writing any.

If the product owner would rather not carry that exception, the alternative is
to fold this decision into task 02 as its first deliverable. That was rejected
because it would put an ADR-shaped conversation inside a task someone has
already started coding.

**Evidence gathered at refinement (2026-10-15).** Counts are from queries run
that day. They are approximate and will drift as each source changes.

- **[beer.db / openbeer](https://openbeer.github.io/)** is public domain.
  Unmaintained: `world` was last updated in 2014. It has no download and no
  API, only text files in a custom format across about 27 repositories. About
  3,400 beer lines, roughly 30% of them with ABV and 30% with a style.
  Rochefort and Westvleteren appear only as breweries, and Finland has six
  beers.
- **[Open Brewery DB](https://github.com/openbrewerydb/openbrewerydb)** is MIT
  licensed and actively maintained. 11,959 brewery *locations* in 23
  countries, 8,334 of them in the US. It holds no beers. Rows are locations
  rather than companies (Sierra Nevada appears twice), and 645 are closed and
  634 are planned breweries.
- **[Open Food Facts](https://world.openfoodfacts.org/data)** is ODbL (the
  database), DbCL (its contents) and CC BY-SA (images). About 10,240 beer
  products, 44% of them in France. It has barcodes but no brewery field, and
  ABV and style are each filled on about half the records. Its policy is "1 API
  call = 1 real scan"; bulk use goes through the dumps.
- **Wikidata** structured data is CC0
  ([Wikidata:Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)).
  - **Size and completeness:** 19,815 beers (instances of
    [Q44](https://www.wikidata.org/wiki/Q44) or a style beneath it) and 5,204
    breweries ([Q131734](https://www.wikidata.org/wiki/Q131734)). About 14.7k
    beers have an ABV ([P2665](https://www.wikidata.org/wiki/Property:P2665)),
    a manufacturer ([P176](https://www.wikidata.org/wiki/Property:P176)) and a
    specific style, across 166 style classes. 3 carry a barcode
    ([P3962](https://www.wikidata.org/wiki/Property:P3962)).
  - **Labels:** only 418 beers have an English label.
  - **Bad values:** 110 have an ABV of 0 or below, or above 20%, and 19 have
    conflicting ABVs.
- **Provenance of Wikidata's beers:**
  - About 18.2k ABV statements cite untappd.com, and 19,252 beers carry an
    Untappd beer ID ([P13423](https://www.wikidata.org/wiki/Property:P13423)).
  - Sampled items were created by the user
    [Mitsjol](https://www.wikidata.org/wiki/User:Mitsjol) in QuickStatements
    batches between May and June 2026.
  - The [property proposal](https://www.wikidata.org/wiki/Wikidata:Property_proposal/Untappd_beer_ID)
    (April 2025) discussed linking only. No discussion of the import or of its
    licensing was found.
  - [Untappd's terms](https://untappd.com/terms) (August 2023) forbid data
    mining and claim the "selection and arrangement" of content. They bind
    users of Untappd's site, are governed by North Carolina law, and Untappd,
    Inc. is a US company.
  - Wikidata also holds Untappd-sourced review scores
    ([P444](https://www.wikidata.org/wiki/Property:P444)), which this decision
    excludes.
