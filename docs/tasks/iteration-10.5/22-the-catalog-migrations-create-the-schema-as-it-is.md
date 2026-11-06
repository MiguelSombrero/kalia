# Task 22: The catalog migrations create the schema as it is, with no ALTER or UPDATE

- **Status:** refined
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** none

## Why

Kalia has never been deployed. [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md)
(amended 2026-08-29) and `backend/README.md` "Database migrations" say that
before it is, a schema change goes into the migration it belongs to, not into
a new `ALTER` migration. Two things in the catalog schema break that rule today:

- **Iteration 10.5 drifted from it.** `catalog/V010` created `catalog.review`;
  `V011` then added the `suggested_*` columns and `review_suggested_values_check`
  to it with an `ALTER`, and `V013` dropped the beer table's auto-named
  `beer_check2` and added `beer_non_user_status_check`. Neither change needed a
  new migration.
- **`catalog/V008` opens with fixups.** The generated import starts with
  `ALTER`/`UPDATE` statements that exist only because
  [ADR-0077](../../adr/0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md)
  and [ADR-0079](../../adr/0079-a-brewerys-country-is-an-iso-code-named-in-the-readers-language-by-the-runtime.md)
  say `V004`, the hand-written seed, stays unchanged. They flip the `source`
  default, code the seeded breweries' English country names, fill
  `name_sort_key`, make both columns `NOT NULL` and drop `brewery.country`. A
  reader of `V003` sees a schema that is not the one the database ends with, and
  `scripts/wikidata-migration.mjs` carries a second copy of the seed's countries
  and sort keys to repair `V004`'s rows.

The product owner chose to fix both on 2026-11-06. The goal is migrations that
create the schema as it is, with no `ALTER` or `UPDATE` anywhere in them.

## Scope

**A — the catalog schema in one file.**

- `catalog.review`, with its `suggested_*` columns and
  `review_suggested_values_check`, is created by `V003`, not by `V010` and
  `V011`.
- The beer table's third table-level `CHECK`, which Postgres named
  `beer_check2`, is named `beer_non_user_status_check` in `V003` and carries
  `V013`'s meaning: `moderation_status IN ('APPROVED','REMOVED') OR source = 'USER'`.
- `V010`, `V011` and `V013` are deleted. `notification/V012` becomes `V010`, so
  the sequence has no hole the folding left. Every reference to a deleted or
  renumbered file or version, in code, scripts and docs, is corrected.
- The SQL comments that explain the review table and the status check survive,
  merged and rewritten to say what the schema is rather than how it got there.

**B — no fixups in `V008`.**

- `V003` creates `catalog.brewery` without a `country` column, with
  `country_code` and `name_sort_key` `NOT NULL` from the start, and with the
  `source` default `'USER'` on brewery and beer.
- `V004` inserts `country_code`, `name_sort_key` and `source = 'SEED'`
  explicitly — for beers as well, where the default no longer supplies it.
- `scripts/wikidata-migration.mjs` reads the seeded breweries' country codes
  straight from `V004`, drops its English-name-to-code mapping for the seed and
  the preamble it emits, and `V008` is regenerated. `V008` then holds only the
  import's inserts.
- `ADR-0077` and `ADR-0079` are amended, and the documents that describe the
  fixups are corrected.

The resulting schema and catalog data are the ones the migrations produce
today, except for the one constraint's name.

## Non-goals

- **Changing any other module's migrations,** beyond the `V012` → `V010`
  renumbering. `appconfig`, `cellar`, `feed`, `profile` and `common` already
  create their schema directly.
- **Changing what the catalog stores or serves.** No column, constraint or row
  changes meaning; this is a restructuring of how the schema is created. The one
  visible difference is the third `CHECK`'s name.
- **Keeping the seeded beers' and breweries' ids fixed.** Nothing is deployed
  and nothing refers to a seeded id, so a regenerated `V004` or `V008` may mint
  different uuids. The comparison below excludes uuids for this reason.
- **A rule for after the first deployment.** [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md)
  already says the allowance ends when anything is deployed; this task does not
  touch that.

## Constraints

- **ADR-0036:** an applied migration may be edited before the first
  deployment, and a database that applied the old one is rebuilt with
  `docker compose down -v`. A Flyway checksum mismatch is the symptom of a
  database that was not.
- **ADR-0077 and ADR-0079** say `V004` is unchanged; this task reverses that,
  so both are amended
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)): the wording is
  changed in place with an `Amended:` line, and a new ADR is not written. The
  decision in each — the catalog is seeded once and owned by Kalia; a country
  is a code — stands.
- **ADR-0087:** `name_sort_key` is the name folded to the Java name order, and
  the application, the Wikidata generator and `V004` must agree on it. The
  generator's `sortKey(name)` must match the `Brewery` entity's key, and
  `V004`'s stored keys are held to it by a test.
- **`V008` is generated and never hand-edited.** It is regenerated with
  `node scripts/wikidata-migration.mjs`, and `make check` fails a committed
  copy that disagrees with the generator.
- **`scripts/wikidata/seed-matches.json`** names every seeded brewery and beer
  in `V004`, and a test fails if the two disagree. `V004` is edited here, so
  its rows must still match.
- **`scripts/check-no-untappd.mjs`** reads `V008` by path and line; it must
  still pass after regeneration.
- **A rule whose violation fails silently:** the `IT`s that build the schema
  with Flyway pass on a migration set that yields the right tables but a
  differently named constraint. Only the schema comparison below shows that
  nothing but the intended rename changed.
- **JDK 25** for Maven, or Lombok fails with an `EndPosTable` error naming
  neither (`backend/README.md`).
- **No cost, no new dependency.** `pg_dump` is run from the Postgres image the
  stack already uses.

**Decided at refinement, 2026-11-06** (product owner, in chat, on being shown
the analysis of the two causes: "Both A and B"):

- **Scope A and scope B are both done,** in this one task. Fixing only the
  iteration-10.5 drift and leaving `V008`'s fixups, or the reverse, was
  rejected.
- **The sequence is closed up:** `V012` becomes `V010` rather than leaving a
  hole at `V010`–`V013`.
  - *Derived:* only `notification/V012__notification_schema.sql` is renumbered.
    A grep finds no other file or document that names it by version.
- **A database that applied the old migrations is rebuilt:**
  `docker compose down -v`, per ADR-0036, is the stated procedure, and
  `backend/README.md` says so where it already says it for `V008`.

## Open questions

**None.**

## Acceptance criteria

- [ ] `grep -rniE '^\s*(ALTER|UPDATE|DROP)' backend/src/main/resources/db/migration`
      prints nothing, and `ls backend/src/main/resources/db/migration/catalog`
      lists no `V010`, `V011` or `V013`, and `notification/` holds
      `V010__notification_schema.sql` and no `V012`
- [ ] A test in `scripts/wikidata-migration.test.mjs` fails if any `name_sort_key`
      value in `V004` differs from the generator's `sortKey(name)` for that
      row's name, and was confirmed to fail on a hand-edited key
- [ ] The generator's tests assert that `V008` contains no `ALTER`, `UPDATE`
      or `SET DEFAULT`, and that the seed's country codes are read from `V004`
      (changing one there changes what the generator knows, with no mapping
      to edit); `node --test scripts/` is green
- [ ] `node scripts/wikidata-migration.mjs` run on the branch leaves
      `git diff` empty for `V008`, and `make check` passes, which includes
      `scripts/check-no-untappd.mjs` and the `seed-matches.json` test
- [ ] On the branch, `pg_dump --schema-only --schema=catalog` of a database
      migrated from scratch differs from the same dump on current `dev` in the
      name of one constraint (`beer_check2` → `beer_non_user_status_check`) and
      nothing else; the diff is recorded in the PR
- [ ] A dump of every catalog table's rows, ordered by name and with uuid
      columns omitted, is identical on `dev` and on the branch; the comparison
      is recorded in the PR
- [ ] `(cd backend && mvn clean test)` is green on JDK 25, with the
      catalog's `IT`s that exercise `review` and the moderation status check
      among those run
- [ ] After `docker compose down -v`, the stack boots and the backend reports
      healthy on its own migrations
- [ ] ADR-0077's "the existing seed stays" bullet and ADR-0079's matching
      consequence are amended with an `Amended:` line and no longer say `V004`
      is unchanged; `docs/architecture.md` and the `V008` section of
      `backend/README.md` describe `V003`, `V004` and `V008` as they now are,
      and `grep -rn "V011\|V013\|beer_check2" docs backend scripts` finds only
      history that is meant to stay (frozen task files and a dated ADR
      amendment)
- [ ] `make verify-fast` is green, and `make verify` is run and its result
      recorded in the PR

## Notes

Provenance: the product owner's decision of 2026-11-06 ("Both A and B"),
after reviewing an analysis of two causes — the iteration-10.5 `ALTER`s that
should have gone into `V003`, and `V008`'s fixups that exist only to keep
`V004` unchanged. Added to this iteration at the product owner's request, as
[task 21](21-a-failure-ci-would-report-is-caught-before-the-push.md) was, and
refined in its own pull request.

The comparison in the acceptance criteria is the proof that this is a
restructuring: Flyway's own validation cannot show it, because both migration
sets produce a schema that boots.
