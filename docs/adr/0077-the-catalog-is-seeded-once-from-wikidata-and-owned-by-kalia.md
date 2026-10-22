# ADR-0077: A catalog that could only grow by migration is seeded once from Wikidata and owned by Kalia, taking facts only and recording each row's source

- **Status:** accepted
- **Date:** 2026-10-15
- **Amended:** 2026-10-18 — the import rules the product owner decided while
  the import was built, for cases the data showed and refinement had not
  covered; see the end of Decision
- **Amended:** 2026-10-22 by [ADR-0079](0079-a-brewerys-country-is-an-iso-code-named-in-the-readers-language-by-the-runtime.md)
  — a brewery's country is imported as an ISO 3166-1 code, and a brewery
  whose country has no code maps to where it stood, today

## Context

Kalia's catalog is one Flyway migration written in iteration 1. It holds 54
beers from 20 breweries, and it changes only when someone edits SQL and
redeploys ([architecture.md §8](../architecture.md#8-trade-offs-made-explicit)).
A cellar can only hold beers someone thought to seed.
[Iteration 8](../tasks/iteration-8.md) removes that ceiling, and
[task 01](../tasks/iteration-8/01-catalog-data-source.md) asks where the
catalog's data comes from before anyone builds a way to add to it.

There are three models, and they are not variations on each other:

- **Live source:** call an external source as the live source of truth.
- **Seed and own:** seed once from an open dataset, and own the result.
- **User-grown:** own the catalog outright, and grow it only from what users
  add.

They differ in what breaks when the source goes away, in what a user may
change, and in whether user contributions add to Kalia's data or are
reconciled against someone else's.

Several forces constrain the answer:

- The catalog is the floor the whole app stands on.
- Kalia never collects reviews ([README.md](../../README.md)).
- Any external source is the product owner's choice, not an agent's.
- Barcode coverage matters to [iteration 14](../tasks/iteration-14.md)'s
  scanning. A barcode column can be added at any time, but nobody re-scans
  beers that already exist.

Four candidate sources were measured (see Evidence), along with the
provenance of the one that fit best.

## Decision

**Kalia's catalog is seeded once, offline, from a pinned Wikidata snapshot and
is Kalia's own from then on. The import takes facts only, never anything from
Untappd, and every row records where it came from.**

- **The model.** Beers, and the breweries that make them, are imported from a
  committed snapshot. After the import every row is an ordinary Kalia row.
  Nothing at runtime calls Wikidata, and no job keeps the catalog in step with
  it. A later re-import is a deliberate act, and it only ever adds rows: it
  never overwrites a row Kalia already holds.
- **If Wikidata becomes unavailable, changes its terms, or deletes or merges
  the items imported from it, Kalia's catalog is unaffected.** The data is
  already Kalia's. A future re-import is the only thing that would notice.
- **Facts only.** The import takes a beer's name, ABV and style, and its
  brewery's name, country and city. It never takes:
  - Untappd beer or brewery identifiers, or any other external identifier;
  - review scores;
  - descriptions;
  - images.

  Kalia links to Untappd nowhere. Kalia still never becomes a review platform,
  so the review scores Wikidata carries are excluded by rule, not by accident.
- **Provenance on every row.** Each catalog row records its source:
  - an imported row: Wikidata, and the item (QID) it came from;
  - a row from the existing seed: Kalia's own seed;
  - a row a user added: user-added.

  This is how the catalog is audited, and how every Wikidata-sourced row could
  be removed in one migration.
- **The provenance risk is accepted openly.** Most of Wikidata's beer data
  cites untappd.com, and it was added in bulk by one volunteer, in a way that
  was never documented (see Evidence). Kalia takes facts that are CC0 on
  Wikidata, from Wikidata, and accepts that risk deliberately. It does not ask
  the contributor how the data was obtained. The provenance column is the
  remedy if the risk ever materialises.
- **Wikidata is credited visibly** wherever its data is shown, even though
  CC0 does not require it.
- **The extraction follows Wikimedia's etiquette**
  ([Terms of Use](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)
  §4, §12). It runs once, paced, with an identifying User-Agent, and never
  from a running app or from CI.
- **The existing seed stays.** `V004__catalog_seed_data.sql` is unchanged. The
  import skips any beer or brewery that matches a seeded row, so seeded ids,
  and the cellar entries that point at them, survive. The hand-checked values
  also survive: Orval stays 6.2%, where Wikidata says 5.2%.
- **What a user contribution means.** A user adds a beer to Kalia's own
  catalog. It is visible to everyone at once, with no review queue, and the
  contributor is recorded so a bad row can be traced and removed by hand. In
  iteration 8 nobody edits an existing beer, imported or user-added. Editing
  is a [backlog](../tasks/backlog.md) item.
- **No barcodes come with this source.** Barcodes stay with
  [iteration 14](../tasks/iteration-14.md).

The decision does not cover the provenance columns' design, the style
vocabulary, name and alias handling, brewery uniqueness, the treatment of bad
values, or where the import tooling lives. Those are
[task 17](../tasks/iteration-8/17-seed-the-catalog-from-wikidata.md)'s
questions.

> **Amended 2026-10-18.** Building the import turned up cases its refinement
> had not decided. The product owner decided them as follows, and
> `scripts/wikidata-migration.mjs` applies them:
>
> - **A beer Wikidata says several breweries make is dropped** (about 920,
>   collaborations and owner-plus-brewery pairs alike). Attaching it to one
>   brewery by rule was rejected: it would show some beers under the wrong
>   brewery.
> - **Breweries sharing a normalised name and country merge into one row**,
>   the one making the most imported beers, and the others' beers attach to
>   it. Dropping every brewery in such a group was rejected: it loses real
>   breweries, such as Duvel Moortgat's two items.
> - **A brewery with conflicting countries is dropped**, except the four that
>   make imported beers, whose country is hand-reviewed in
>   `scripts/wikidata/brewery-countries.json`. Dropping all of them was
>   rejected: Moersleutel alone makes 417 of the beers.
> - **A regional variant folds into its base style** (American IPA into IPA,
>   English barley wine into Barleywine), as the seed already files its own
>   beers. Keeping each variant as a style was rejected.
> - **New England IPA's double, triple and session strengths stay styles of
>   their own**, as New England IPA does. Folding them into Double, Triple
>   and Session IPA was rejected.

## Alternatives considered

**A live external source as the catalog (model 1).** Kalia would hold no
catalog of its own and would read beers from a third party at request time. It
would cost an availability dependency on the floor of the app, a cache whose
purpose is availability rather than speed, and user contributions reconciled
against data Kalia cannot correct. None of the candidates can be used this
way:

- beer.db has no API.
- Open Brewery DB's API is community-run with no service commitment, and it
  holds no beers.
- Open Food Facts allows "1 API call = 1 real scan", not catalog serving.
- Wikidata's items get merged and deleted, and Wikimedia's Terms forbid
  putting an undue burden on its APIs.

Rejected.

**A catalog grown only by its users (model 3).** This carries no external risk
and no licence questions. Its cost is that the catalog stays at 54 beers on
the day iteration 8 ships. Every user's first visit becomes data entry, and
breweries have to be user-created too. That leaves in place the ceiling this
iteration exists to remove. Rejected as the starting point. User contribution
remains, on top of the seed.

**beer.db (openbeer) as the seed.** Public domain. It was rejected for three
reasons:

- It is unmaintained since 2014–2017.
- It is thin: about 3,400 beer lines, 30% with an ABV, and six beers in
  Finland.
- It exists only as hand-written text files in a custom format that Kalia
  would have to parse and maintain.

**Open Brewery DB as the seed.** It is MIT licensed, maintained, and has
about 12,000 breweries, but it holds no beers at all. It could seed a brewery
picker, but not a catalog. As a later top-up for breweries Wikidata lacks, it
remains possible but undecided. Its rows are locations rather than companies,
which would need collapsing.

**Open Food Facts as the seed.** It is the only candidate with barcodes. It
was rejected for three reasons:

- Its ODbL share-alike would extend to the mixed catalog, so user-added beers
  would effectively become ODbL, and the UI would carry mandatory
  attribution.
- It has no brewery field, so every beer would need its brand matched to a
  brewery.
- Its coverage follows supermarket scanning: 44% of it is French products,
  and it is weakest on the beers people cellar.

It stays the candidate route for barcodes in iteration 14, used as one lookup
per scan rather than as a seed.

**Wikidata, but only values that do not cite Untappd.** This would remove the
provenance risk. It would also remove almost every ABV, and with it the reason to choose
Wikidata at all. Only 18,083 beers have an ABV, and 18,219 ABV references cite
untappd.com; every other source together accounts for fewer than a hundred.
Rejected.

**Wikidata, after asking the contributor how the data was obtained.** This
might have turned an unknown into a known. The product owner chose not to ask,
and to record the risk as accepted instead.

## Consequences

- Good, because the catalog goes from 54 beers to about 14,700 on day one, and
  each beer arrives with an ABV, a specific style and a link to its brewery.
  It needs no fuzzy brewery matching, because Wikidata links beers to
  breweries by QID.
- Good, because CC0 puts no obligation on Kalia. Beers users add stay Kalia's
  own and carry no share-alike.
- Good, because nothing at runtime depends on a third party. Task 04's caching
  question is about speed only, never about availability.
- Good, because every row's provenance is recorded, so the catalog can be
  audited, and every Wikidata-sourced row can be removed in one migration.
- Bad, because most of the imported ABVs trace back to Untappd through one
  volunteer's bulk import, by an undocumented method, with no community review
  of the import. If that is ever challenged, the remedy removes the bulk of
  the catalog.
- Bad, because coverage follows who edited Wikidata, not the beer market. The
  data counts 5,075 Dutch beers but 7 from Sierra Nevada, 65 Finnish beers,
  and none from Rochefort, Founders or The Kernel. Only 418 beers have an
  English name.
- Bad, because the data needs cleaning before it is usable: it has 110 ABVs at
  or below 0 or above 20%, 19 beers with conflicting ABVs, and 166 style
  classes to map.
- Bad, because the source has no barcodes. Imported beers gain one only when a
  user scans them, so iteration 14's scanning starts half-covered. The product
  owner accepted this knowingly.
- Neutral, because the snapshot ages from the day it is taken. Keeping up with
  new beers is the users' job, and a re-import is a new task that adds and
  never overwrites.
- Neutral, because a catalog about 270 times larger breaks tests that assert
  the seed's exact contents:
  - In
    [`BeerSpecificationsIT`](../../backend/src/test/java/fi/kalia/catalog/domain/BeerSpecificationsIT.java):
    the totals of 54, Westvleteren's 3 beers, Finland's 3, the strongest
    beer being KBS, the weakest being Table Beer, and exactly three Belgian
    quads.
  - In
    [`CatalogApiIT`](../../backend/src/test/java/fi/kalia/catalog/web/CatalogApiIT.java):
    `totalElements` of 54, 3 and 20, `totalPages` of 6 and 3, the first
    result's ABV of 12.0 and 3.0, and the brewery list's size of 20.
  - The e2e filter in `search-to-detail.spec.ts` (Belgian quads at 9–12%)
    may lose a seeded quad to page two.

  `CatalogPersistenceIT` and the Westvleteren searches in e2e survive because
  the seed stays. `FeedServiceTest` builds its own data, and
  `BeerSearchIndexIT` generates its own 10,000 rows. Task 17 owns updating
  them.
- **Revisit trigger:**
  - Untappd, Wikimedia or a Wikidata editor objects to the imported data.
  - The Untappd-sourced items are deleted from Wikidata, which would make a
    re-import impossible and is a sign the objection exists.
  - A CC0 source with barcodes and comparable coverage appears.

## Evidence

All counts are from queries run on 2026-10-15. They drift as each source
changes.

**Wikidata** ([Wikidata Query Service](https://query.wikidata.org/)). The
structured data is CC0
([Wikidata:Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)).

- **What counts as a beer or a brewery.** A beer is
  `?b wdt:P31/wdt:P279* wd:Q44` (an instance of
  [beer](https://www.wikidata.org/wiki/Q44) or of a style beneath it). That
  gives 19,815 items. A brewery is `wdt:P31/wdt:P279* wd:Q131734`, which gives
  5,204.

| Property | Beers with it |
|---|---|
| ABV ([P2665](https://www.wikidata.org/wiki/Property:P2665)) | 18,083 |
| Manufacturer ([P176](https://www.wikidata.org/wiki/Property:P176)) | 18,649 |
| Manufacturer that is itself a brewery | 18,417 |
| Country of origin ([P495](https://www.wikidata.org/wiki/Property:P495)) | 17,763 |
| GTIN ([P3962](https://www.wikidata.org/wiki/Property:P3962)) | 3 |

- **Complete beers.** A specific style class (`?b wdt:P31 ?t . ?t
  wdt:P279+ wd:Q44`) plus ABV plus manufacturer: 14,731 beers, across 166
  distinct style classes. 4,087 are typed only as plain "beer".
- **Breweries.** 5,073 have a country and about 2,060 a "located in".
  Finland has 46.
- **Countries of origin.** United States 7,897, Netherlands 5,075, Belgium
  1,226, Sweden 667, Germany 440, Finland 65.
- **Labels.** 418 beers have an English label. All 19,815 have a label in
  some language.
- **Bad values.** 110 beers have an ABV of 0 or below, or above 20, and 19
  have more than one distinct ABV.
- **Seed brewery coverage.** Beers per manufacturer: Omnipollo 555,
  BrewDog 102, Mikkeller 17, Duvel Moortgat 16, Põhjala 15, St. Bernardus 13,
  Lervig 9, Sierra Nevada 7, Westvleteren 4 (none with an ABV), Russian River
  4, Cantillon 3, Ayinger 2, Orval 1 (5.2%), Weihenstephan 1. None of
  Rochefort, Founders, Bell's, The Kernel, Maku or Schneider has any beers.

**Provenance of Wikidata's beers.**

- **References.** 18,219 ABV statement references point at `untappd.com`.
  The next largest source has 18. 19,252 beers carry an Untappd beer ID
  ([P13423](https://www.wikidata.org/wiki/Property:P13423)).
- **Who created them.** The creation edits of a sample of the beers with an
  Untappd ID were read through the MediaWiki API (`prop=revisions`,
  `rvdir=newer`). Of the 9 read before the API throttled, 8 were created by
  [Mitsjol](https://www.wikidata.org/wiki/User:Mitsjol) between 2026-05-08 and
  2026-06-19 as QuickStatements batches (e.g. "batch #257719"). The ninth is a
  2013 item that gained its Untappd ID later.
- **The property proposal.** The
  [Untappd beer ID proposal](https://www.wikidata.org/wiki/Wikidata:Property_proposal/Untappd_beer_ID)
  (created 2025-04-11, with one support vote) motivates linking beers to their
  Untappd pages. It does not discuss licensing or importing data.
- **No import discussion found.** A Wikidata search for "Untappd" in the
  project, talk and property-talk namespaces found no bot request,
  project-chat thread or talk-page discussion of the 2026 import.
- **Untappd's terms.** [Untappd's Terms of Use](https://untappd.com/terms)
  (last updated August 2023):
  - §3(d) forbids "data mining, robots or similar data gathering or
    extraction methods".
  - §3 claims the "selection and arrangement" of content.
  - §1 binds those who access the site, and §17 is governed by North Carolina
    law. Untappd, Inc. is in Charlotte, NC.
- **Wikimedia's terms.** [Wikimedia's Terms of Use](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use):
  - §1.2: a reuser is "legally responsible" for "your reuse of content".
  - §15: content comes with no warranty.
  - §7.1: facts "may be reused freely without attribution".
- **Not legal advice.** These are readings of the documents, not legal advice.

**Rejected sources.**

- **[beer.db](https://openbeer.github.io/)** ([world](https://github.com/openbeer/world)
  and 16 country repositories):
  - Public domain; `world` was last pushed in 2014.
  - About 3,386 beer lines (heuristic count): about 1,030 with an ABV, about
    1,035 with a style, and about 1,256 brewery entries.
- **[Open Brewery DB](https://github.com/openbrewerydb/openbrewerydb)**
  (`breweries.csv`, last data commit 2026-10-07):
  - MIT licensed.
  - 11,959 rows across 23 countries, 8,334 of them in the US.
  - Types include closed (645), planning (634) and bar (45).
  - 155 duplicate (name, country) pairs.
  - 15 of the 20 seeded breweries are present.
- **[Open Food Facts](https://world.openfoodfacts.org/data)**:
  - ODbL for the database, DbCL for its contents, CC BY-SA for images.
  - About 10,240 products in `en:beers`, via search-a-licious (France 4,495,
    Finland 50).
  - In a 1,000-record sample, 93% had a name, 85% a brand, and 0% a brand
    owner or manufacturing place.
  - About 45% had an ABV, from full records of a 40-product subsample, and
    about 50% had a style-like category.
  - Every product has an EAN.
