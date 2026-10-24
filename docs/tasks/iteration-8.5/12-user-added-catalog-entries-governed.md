# Task 12: Contributed catalog entries are reviewed, never deleted, and named cleanly

- **Status:** refined
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

**Anyone signed in can fill the shared catalog.** `POST /api/v1/beers`
(`CatalogController.java:125-153`, authenticated only) →
`ContributionService.java:26-35` puts a new beer into anonymous search and a
new brewery into the public list at once. The duplicate key is folded name
plus country, so a script inventing names is never refused. `contributor_id`
is stored (V003), but nothing uses it, so the only remedy for junk or
offensive names is SQL by hand.

**There is no policy for a catalog beer that goes away.** The deliberate
no-cross-schema-foreign-keys rule leaves it handled only by dropping the row
on read: `CellarService.java:78-93` drops with a WARN, `FeedService.java:132-144`
silently. The entry and its bottles stay forever, invisible to their owner,
with no cleanup and no test. The backend's defence is the assumption that
"nothing deletes catalog beers" (`CellarService.java:106-107`), while
`docs/architecture.md:226-227` says every Wikidata row can be "found, or
removed, in one statement". A removal path for user-added entries makes that
assumption false by design.

**Names may carry invisible and bidi characters.** `AddBeerRequestDto.java:36-42`'s
`\P{Cc}*` rejects only control characters, so `Cf` (U+200B, U+202E,
U+2066–2069) passes. `catalog.fold_name` (`V003__catalog_schema.sql:10-12`)
applies no NFKC, while the Wikidata generator does
(`scripts/wikidata-migration.mjs:38`), so the two tiers fold differently. A
"Guinness" with a zero-width space, or a fullwidth "Ｇuinness", passes the 409
as a visually identical twin; a right-to-left override can display a spoofed
name. React escapes output, so this is spoofing, not XSS.

## Scope

A contribution reaches anyone but its contributor only once an operator has
approved it, and one account's waiting contributions are bounded. A rejected
or removed entry is hidden, never deleted, so cellars and feed lines that
point at it keep working — a stated, tested policy. A name that looks like an existing one is caught as a
duplicate, and invisible or bidi control characters are refused.

## Non-goals

- Editing a catalog beer — [backlog](../backlog.md) "Editing a catalog beer".
- An admin UI or roles — [backlog](../backlog.md).
- Rate limiting requests — [task 10](10-unauthenticated-edges-throttled.md).

## Constraints

- [ADR-0077](../../adr/0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md):
  Kalia owns the catalog; the import only ever adds rows.
- [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md): the
  `fold_name` change goes into the migration it belongs to, and its index is
  rebuilt there.
- What deleting an account does to a beer it added was decided in
  [iteration-8 task 02](../iteration-8/02-add-beer-api.md).
- No cross-schema foreign keys (`docs/architecture.md` §3).

**Decided at refinement, 2026-10-24** (product owner):

- **A moderation queue.** A contributed beer or brewery is visible to its contributor at once — they can find it and cellar it straight away, keeping iteration 8's promise — and to nobody else until approved. Their public cellar shows it only after approval, and its feed line is held until then. A per-contributor quota on its own was rejected in favour of review.
- **At most a fixed number of entries may wait per contributor** (about 20, set in the ADR); past it an add answers 429 `problem+json` until some are approved or rejected.
- **Approval is an operator command** (a script or `make` target) that approves, rejects, or removes everything one contributor added. An approver role and page stay in the backlog's "Admin UI + role-based access" item.
- **Catalog beers are never hard-deleted.** Rejecting or removing an entry hides it from search and lists; its row stays, so cellars and feed lines that point at it keep showing it. A tested invariant, stated in §8. A deletion event cleaning up cellars and accepted orphans were both rejected.
- **Recorded in a new ADR** for moderation and the no-hard-delete invariant.

## Open questions

**None.**

## Acceptance criteria

- [ ] A pending contribution is found and cellared by its contributor, and is
      absent from everyone else's search, lists and the anonymous feed, and
      from the contributor's public cellar until approved — integration tests
      across `catalog`, `cellar` and `feed`
- [ ] A contributor at the pending cap is refused with a documented 429
      `problem+json` — an integration test
- [ ] The operator command approves, rejects, and removes everything one
      contributor added — covered by a test, and documented in
      `backend/README.md`
- [ ] A rejected or removed beer is hidden but its row stays, and a cellar
      entry and feed line pointing at it still render — an integration test
      pins the never-hard-deleted invariant
- [ ] A name containing a `Cf` character is refused, and a fullwidth or
      zero-width twin of an existing name answers the duplicate 409 — unit and
      integration tests
- [ ] §8 states the orphan policy, and `make verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-67, SHOULD-16 and
COULD-63. Merged because a removal path is what forces SHOULD-16's policy, and
all three concern what a contributor can put in a catalog everyone shares.
