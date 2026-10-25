# ADR-0087: The brewery list is cut in SQL by a stored sort key that keeps the Java name order

- **Status:** accepted
- **Date:** 2026-10-25
- **Supersedes:** [ADR-0045](0045-brewery-list-paginates-in-application.md) — the brewery list no longer loads and sorts the whole table in Java

## Context

[ADR-0045](0045-brewery-list-paginates-in-application.md) kept the brewery sort
in Java, and with it the load of every brewery, because a database collation
orders punctuation and diacritics differently from
`String.CASE_INSENSITIVE_ORDER`, and the API's order must not shift with the
deployment's locale. It named its own revisit trigger: the brewery read volume
growing enough to matter.

That has happened. The Wikidata import
([ADR-0077](0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md))
made it 4.9k breweries, and the add-beer form's brewery field calls the search
branch on every debounced keystroke, so typing one letter hydrates and sorts
thousands of entities to show eight. At a generated 54k breweries the list took
1,112 ms p95, against a 300 ms budget
([ADR-0078](0078-catalog-reads-over-budget-for-want-of-an-index-stay-uncached.md),
Evidence). ADR-0078 declined a cache, so the fix has to be an index, and an
index can serve a sort only if the database can produce that sort.

The sort order itself is the contract. The product owner's refinement decision
was to keep today's Java order exactly, in every environment.

## Decision

**`brewery.name_sort_key` stores each name folded the way
`String.CASE_INSENSITIVE_ORDER` folds it, in `COLLATE "C"` and indexed with the
id, and the brewery list and its search order by that key and cut their page in
SQL.** The key is a name lower-cased one UTF-16 code unit at a time
(`Character.toLowerCase(Character.toUpperCase(c))`), which is what the
comparator does per char, so sorting its bytes sorts the names as the Java sort
did.

Two writers produce the key: the `Brewery` entity, for every brewery a user
adds, and the Wikidata generator, for the imported ones and V004's seeded ones.
Both are held equal by a test that checks every stored key against the
application's. The column is `NOT NULL`, so a writer that forgets the key fails
loudly. The search filter is `lower(name) LIKE`, served by a trigram index as the beer
search is ([ADR-0044](0044-catalog-search-indexes.md)).

This covers the brewery list and its search. The `page`/`size` contract and
`PageDto` envelope ADR-0045 introduced are unchanged. It does not make brewery names
editable: a rename would have to rewrite the key in the same statement.

## Alternatives considered

**A collated `ORDER BY lower(name)` or `upper(name)`** (ADR-0045's first
alternative). Rejected for the reason ADR-0045 gave and the product owner
confirmed: its order at the edges (`d'Orval` against `de Rochefort`, `Põhjala`)
depends on the collation of the database it runs in.

**`COLLATE "C"` on `name` itself** (ADR-0045's second alternative). Rejected:
`lower()` and `upper()` under the C locale fold only ASCII, so `Åbro` and
`åbro` would not sort together as the Java comparator sorts them, and the
column the trigram index sits on would change collation.

**A sort key computed by a database function or generated column.** Rejected:
`lower()` depends on the database's locale, which is the dependence the key
exists to remove, and no SQL function reproduces Java's per-char mapping.

**A bytea key of the name's UTF-16 code units.** It would reproduce the
comparator exactly, including its order for characters outside the Basic
Multilingual Plane. Rejected: it roughly triples the generated import
migration's brewery rows, and a name with such a character is not a case the
catalog has. See the second Bad consequence.

**A cache of the sorted list**, ADR-0045's own answer to its trigger. Rejected:
[ADR-0078](0078-catalog-reads-over-budget-for-want-of-an-index-stay-uncached.md)
decided against a catalog cache, and a miss would still hydrate the table.

## Consequences

- Good, because a page reads its 20 rows off `brewery_name_sort_key_idx`
  instead of sorting 54k, and the order stays the one Java gave, in every
  environment.
- Good, because the brewery search shares the beer search's index shape, so
  one convention serves both.
- Bad, because the key is a second copy of the name that two writers must
  keep in step. `BrewerySortKey` in Java and `sortKey` in
  `scripts/wikidata-migration.mjs` must stay equal, which is checked only
  against the imported rows and the application's own code, not by a shared
  definition.
- Bad, because the key sorts by UTF-16 code unit in Java and by code point in
  the database. They differ only between a character outside the Basic
  Multilingual Plane and one from U+E000 to U+FFFF. No brewery name holds
  either, and the order for them is the one change this makes.
- Neutral, because the brewery search now matches on `lower(name)` as the beer
  search does, where it matched on `upper(name)`. The matches differ only for
  characters whose upper and lower case do not round-trip.
- **Revisit trigger:** brewery names become editable, or a name appears with a
  character from the two ranges above.

## Evidence

The brewery list, brewery search and `/styles` at 150k are in
[ADR-0078](0078-catalog-reads-over-budget-for-want-of-an-index-stay-uncached.md)'s
Evidence, measured by [architecture.md §7](../architecture.md#catalog-read-latency).
`BreweryReadIT` pins the plans and compares the whole table's order, 4.9k
names, against `String.CASE_INSENSITIVE_ORDER`.
