# Kalia — Ubiquitous language

The vocabulary each backend module owns, what each term means *inside that
module*, and every case where one English word deliberately means something
different next door. One word legitimately meaning two things in two contexts
is normal Domain-Driven Design; what has to be readable somewhere is which
meaning belongs where, and until this file existed that was readable only in
the code.

This project has a specific exposure to vocabulary drift: every line is
written by an agent whose context is discarded between sessions
([README.md](../README.md) roles), so consistency has no carrier except a
document. See [ADR-0020](adr/0020-documentation-roles.md) for why a glossary
entry is a meaning and a link, never a restatement of the reasoning that lives
in an ADR.

## How this file is kept current

- **Every type in a backend `domain` package has a row** in its module's
  *Domain types* table below. `scripts/check-glossary.mjs` fails the build
  when one does not, and fails when a table lists a type that no longer
  exists; it runs under `make check`, hence CI's static-checks job, with a
  fixture self-test (`scripts/check-glossary.test.mjs`) because nothing
  in the real tree would otherwise trip it. Add the row in the same pull
  request as the type.
- **The other sections are review-maintained.** Cross-module collisions, the
  published vocabulary, dropped terms and term rules are a reviewer's call,
  the same advisory tier `scripts/check-comments.mjs` draws — a checker that
  judged them would be guessing.
- **This file is not an ADR and does not earn one.** It documents decisions
  already made ([ADR-0032](adr/0032-when-a-decision-earns-an-adr.md)); each
  entry links the ADR that decided it.

## Not covered here: the en/fi user-facing strings

The English and Finnish UI copy is out of scope. The two languages need not
split a concept the same way — Finnish partitive plurals and grammatical
number already make that true for counts — so how a domain term surfaces to a
reader is a translation-policy question belonging with
[ADR-0011](adr/0011-i18next-localization.md), not a glossary entry.

---

## catalog

Beers, breweries and styles, plus search and filtering, and a signed-in user
adding a beer the catalog lacks. Its dependencies are in
[architecture.md §3](architecture.md#3-backend-modules). Its data is public by nature — a beer's attributes are
catalog data a signed-out visitor may read; the contributor is never served.

### Domain types (`fi.kalia.catalog.domain`)

| Type | Meaning in this module | Why |
|---|---|---|
| `Beer` | A **brand**: a product a brewery makes (AleSmith IPA), with a name, style and ABV. Not a physical object and not something a user owns — the cellar references it by id and reads a few of its facts through the catalog's API ([ADR-0083](adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)). One a user adds (`addedBy`) records its **contributor**. | [ADR-0034](adr/0034-cellar-two-level-bottle-model.md), [ADR-0077](adr/0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md) |
| `Brewery` | The maker of beers, with a country and optional city. One a user adds records its contributor too and waits for an operator's review like a beer. | [ADR-0007](adr/0007-backend-package-structure.md) |
| `ModerationStatus` | Who may see a catalog beer or brewery: `PENDING` (its contributor alone), `APPROVED` (everyone), `REJECTED` or `REMOVED` (hidden from search and lists, row kept). An operator moves rows between them. | [ADR-0091](adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md) |
| `Country` | The countries a brewery can be in: `Country.CODES` lists every ISO 3166-1 alpha-2 code, the only form of a country the catalog stores. A new brewery's country is one of them. | [ADR-0079](adr/0079-a-brewerys-country-is-an-iso-code-named-in-the-readers-language-by-the-runtime.md) |
| `BrewerySortKey` | A brewery name folded the way `String.CASE_INSENSITIVE_ORDER` folds it, stored as `name_sort_key` so the database can order the brewery list in the Java order. | [ADR-0087](adr/0087-the-brewery-list-is-cut-in-sql-by-a-stored-key-in-the-java-name-order.md) |
| `BeerSearchCriteria` | A value object bundling the catalog search and filter inputs (free-text query, style, brewery, country, ABV range). | [ADR-0044](adr/0044-catalog-search-indexes.md) |
| `BeerSpecifications` | A factory of JPA `Specification<Beer>` predicates built from a `BeerSearchCriteria`, with `LIKE` wildcards escaped. | [ADR-0044](adr/0044-catalog-search-indexes.md) |
| `BeerRepository` | Persistence for the `Beer` entity: paged specification search and by-id lookup, both eager-loading `Brewery`; the catalog's distinct styles; and the same-name duplicate check within a brewery. | [ADR-0007](adr/0007-backend-package-structure.md) |
| `BreweryRepository` | Persistence for the `Brewery` entity, including the sort-key-ordered page of breweries and the name search over it, the same-name-and-country duplicate check and the codes of the countries breweries are in. | [ADR-0007](adr/0007-backend-package-structure.md) |

## identity

The security filter chain, bearer-token validation, and resolving the current
caller from the token's `sub`. Deliberately narrow: it is about tokens, not
about what a user looks like to other users — that is `profile`. Its
dependencies are in [architecture.md §3](architecture.md#3-backend-modules).

### Domain types (`fi.kalia.identity.domain`)

| Type | Meaning in this module | Why |
|---|---|---|
| `CurrentUser` | The authenticated caller behind the bearer token. `id` is the identity provider's `sub` (the stable per-user key); `username` is `preferred_username`, display-only and **never** a key. | [ADR-0028](adr/0028-resource-server-and-current-user.md) |

## profile

Who a user is to *other* users: a username copied once from the identity
provider, plus whether their cellar is public. Its
dependencies are in [architecture.md §3](architecture.md#3-backend-modules). Its rows are public data an anonymous request may read.

### Domain types (`fi.kalia.profile.domain`)

| Type | Meaning in this module | Why |
|---|---|---|
| `Profile` | A user's public identity, keyed by the Keycloak `sub` itself (no separate generated id), created lazily the first time anything needs one. Carries `username` (copied from `preferred_username` at creation, immutable in Kalia thereafter) and `cellarPublic` (defaults `false`). | [ADR-0049](adr/0049-profile-module-and-public-identity.md) |
| `ProfileRepository` | Persistence for `Profile`. Looks a profile up by username with `findByUsernameIgnoringCase`, which matches regardless of case: a username is unique that way and never reused, so at most one row answers. | [ADR-0080](adr/0080-a-username-is-unique-regardless-of-case-and-never-reused.md) |

## cellar

The signed-in user's owned bottles, grouped by catalog beer; plus a public
read of a cellar its owner has made public. Its dependencies are in
[architecture.md §3](architecture.md#3-backend-modules).

### Domain types (`fi.kalia.cellar.domain`)

| Type | Meaning in this module | Why |
|---|---|---|
| `Entry` | The **aggregate root**: one row per `(user, catalog beer)`, owning the individual `Bottle`s beneath it. A pure grouping, not something a user keeps — it is deleted when its last bottle is removed, so no reader ever sees a zero-quantity entry. `quantity()` is `COUNT(*)` over its bottles, never stored. | [ADR-0034](adr/0034-cellar-two-level-bottle-model.md), [ADR-0052](adr/0052-cellar-aggregate-owns-its-writes.md) |
| `Bottle` | One **physical container** a user owns, with its own brewed and best-before dates and a `ContainerType`. A non-root entity: written only through its `Entry`, no repository of its own. May be a can or a keg — "bottle" here is the general word for the owned unit, not the container kind. | [ADR-0034](adr/0034-cellar-two-level-bottle-model.md), [ADR-0052](adr/0052-cellar-aggregate-owns-its-writes.md) |
| `ContainerType` | The kind of container a `Bottle` is: `BOTTLE`, `CAN` or `KEG`. `BOTTLE` is one value of this enum; a `Bottle` whose `ContainerType` is `CAN` is still a `Bottle`. | [ADR-0034](adr/0034-cellar-two-level-bottle-model.md) |
| `EntryRepository` | Persistence for the `Entry` aggregate. Every lookup is keyed on an already-resolved owner id, so another user's entry and a missing one are indistinguishable. | [ADR-0050](adr/0050-public-cellar-addressing.md) |
| `BottleCount` | How many bottles one entry holds: the read model of a public cellar page, which lists at most a capped number of an entry's bottles and reports the rest as a count. | [ADR-0083](adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md) |
| `BottleListing` | One bottle as a public cellar page lists it: its own fields and its entry's id, read without loading the entry, since an owned entity has no repository of its own. | [ADR-0052](adr/0052-cellar-aggregate-owns-its-writes.md) |
| `BottleTotals` | Every bottle one user holds and when the newest was added: what a public cellar page reports about the whole cellar it shows (beers that are not approved left out), since a client holding one page cannot count it. | [ADR-0083](adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md) |
| `InvalidBottleException` | A domain exception for bottle data that cannot be accepted: a future brewed date, a best-before date not after the brewed date, a non-positive add quantity. | [ADR-0014](adr/0014-shared-exception-handling.md) |

## feed

A record of things that happened — currently, a bottle added to a cellar. Its
dependencies are in [architecture.md §3](architecture.md#3-backend-modules).
**"Feed", "event" and "activity" already mean something else in this codebase** — a
Spring application event, a Spring Modulith `event_publication` row — so a
type here is never named with any of those three words on its own; `FeedLine`
is deliberately explicit rather than the bare `Line` the module-scoping
convention would otherwise suggest.

### Domain types (`fi.kalia.feed.domain`)

| Type | Meaning in this module | Why |
|---|---|---|
| `FeedLine` | A record of one act — a bulk-add of bottles to a cellar entry. Freezes `quantity` and `brewedDate` from the `cellar.BottleAdded` event that created it forever; never updated afterwards. | [ADR-0053](adr/0053-cellar-domain-events-on-the-aggregate-root.md), [ADR-0058](adr/0058-feed-event-recording-model.md) |
| `FeedLineRepository` | Persistence for `FeedLine`, including the `existsByEventId` idempotency check a redelivered event relies on. | [ADR-0058](adr/0058-feed-event-recording-model.md) |

---

## Words that mean two things across modules

| Word | In one module | In another |
|---|---|---|
| **beer** | `catalog.Beer` — a brand/product the catalog holds. | In `cellar` there is no `Beer` type at all: an entry's `beer` is a `CellarBeerDto`, the few catalog facts the cellar pages show, joined in by the backend ([ADR-0083](adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)). Informally, UI copy says "beer" for the brand *and* loosely for the bottles owned of it. |
| **bottle** | `cellar.Bottle` — the owned physical unit, whatever its container kind. | `cellar.ContainerType.BOTTLE` — one container kind, as against `CAN` and `KEG`. Same word, one level apart, in the same module. A rename to remove the overlap was weighed and dropped (below). |
| **username** | `profile.Profile.username` — copied once from `preferred_username`, immutable in Kalia, the user's whole public identity and the `/cellars/{username}` URL segment. | `identity.CurrentUser.username` — the live `preferred_username` claim off the current token, display-only, refreshed every request, never persisted. |
| **id** | `profile.Profile.id` — the Keycloak `sub` itself; there is exactly one profile row per subject and no generated key. | `Beer.id`, `Brewery.id`, `Entry.id`, `Bottle.id` — generated `UUID`s with no external meaning. |
| **entry** | `cellar.Entry` — the `(user, beer)` grouping aggregate. | Not reused elsewhere; listed so a future module does not quietly take the word for something else. |

## Published vocabulary — the terms a client actually meets

REST path segments, JSON field names and the generated TypeScript types
([ADR-0012](adr/0012-orval-api-client.md)) are the vocabulary a client meets,
and they drift from the Java names that produced them.

### REST path segments

| Segment | Meaning |
|---|---|
| `/cellar` (singular) | The **caller's own** cellar — the user is implied by the bearer token ([ADR-0028](adr/0028-resource-server-and-current-user.md)). |
| `/cellars/{username}` (plural) | **Someone's** cellar, addressed by name; the one cellar route a signed-out caller may reach, and only when its owner has made it public ([ADR-0050](adr/0050-public-cellar-addressing.md)). |
| `/cellar/bottles`, `/cellar/bottles/{id}` | Add / update / remove a bottle, addressed by its own id, never nested under its entry. `POST` answers with an array — it creates `quantity` independently editable rows, never a stored count. |
| `/profile/visibility` | Change whether the caller's cellar is public. |
| `/styles`, `/countries` | The vocabularies a beer is added with: every style a catalog beer has, and every country a brewery can be in. Public reads. |
| `/breweries/countries` | The countries the catalog has breweries in, which the catalog's country filter offers. A public read. |
| `/feed` | Recent activity from cellars currently public, newest first; identical for every caller, signed in or out ([task 09](tasks/iteration-7/09-feed-and-private-cellars.md)). |

### JSON field names

| Field | Meaning |
|---|---|
| `beer` | On `EntryDto` and `PublicCellarEntryDto`: a `CellarBeerDto` — the beer's `id`, `name`, `brewery` (its name), `style` and `abv` as the catalog describes them now. Both entry shapes carry the same one, so a field added to it reaches a signed-out reader too ([ADR-0083](adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)). |
| `beerId` | A cross-module reference to `catalog.Beer` by id, on a request that names a beer (`AddBottleRequestDto`) and inside the cellar domain. A cellar *response* carries `beer`, never a bare `beerId`. |
| `quantity` | On `EntryDto` / `PublicCellarEntryDto`: the derived bottle count (`COUNT(*)`). It maps to no database column and no stored domain field — it exists only at the API boundary. On `AddBottleRequestDto`: how many identical bottles to create (1–24). On `FeedLineDto`: the count frozen on one bulk-add act at the moment it happened — never recomputed, and unrelated to what the cellar holds now. |
| `cellarPublic` | The wire name for cellar visibility, on `ProfileDto` and `ChangeVisibilityRequestDto`. |
| `containerType` | A `ContainerType` on the wire: the string `BOTTLE`, `CAN` or `KEG`. |
| `existingBeerId`, `existingBreweryId` | On a `409` from `POST /beers`: the row the catalog already holds, which the refused beer or brewery duplicates. A duplicate brewery's `409` also carries `existingBreweryName` and `existingBreweryCountryCode`, spelled as the catalog holds them. |
| `similarTo` | On `GET /beers`, with `breweryId`: the beers of that brewery whose name contains any word of this text — the add-beer form's similar-beers hint ([ADR-0082](adr/0082-a-beer-is-added-over-the-search-that-missed-it-and-a-pending-button-stays-legible.md)). |
| `newBrewery` | On `AddBeerRequestDto`: a brewery added together with the beer, given instead of `breweryId`. |
| `countryCode` | A brewery's country as its ISO 3166-1 alpha-2 code, on `BreweryDto` and `NewBreweryRequestDto` and as the `/beers` filter. A client names it in its reader's language ([ADR-0079](adr/0079-a-brewerys-country-is-an-iso-code-named-in-the-readers-language-by-the-runtime.md)). |
| `content`, `totalElements`, `totalPages`, `page` | The pagination envelope (`PageDto`), on `/beers` and `/breweries`; `PublicCellarDto` carries the same four, with `username`, `totalBottles` and `lastBottleAddedAt` beside them. |
| `content`, `nextCursor`, `startOver` | The cursor-form pagination envelope (`FeedPageDto`), on `/feed`. `nextCursor` is opaque, round-tripped rather than parsed, and `null` once a page reaches the end of the served window. `startOver` is `true` when a `since` cursor is older than that window ([architecture.md §4](architecture.md#4-api-design) says what a caller does then). |

### Generated TypeScript types

`orval` turns each backend DTO into a PascalCase interface in a camelCase file
(`EntryDto` in `entryDto.ts`). It also **extracts each enum-typed field into
its own type** — `BottleDtoContainerType`, `AddBottleRequestDtoContainerType`
— which have no backend counterpart; they are all the `ContainerType` enum.
`packages/api/src/generated` is regenerated, never hand-edited
([ADR-0012](adr/0012-orval-api-client.md)).

## Term rules

| Rule | Statement | Why |
|---|---|---|
| Domain event naming | Past participle on the thing whose state changed, never repeating the module name: `BottleAdded` (not `CellarBottleAddedEvent`) — the package `fi.kalia.cellar` already carries the module. Yields `BottleRemoved`, `EntryEmptied`, `CellarVisibilityChanged`. | [ADR-0053](adr/0053-cellar-domain-events-on-the-aggregate-root.md) |
| Aggregate writes | A non-root entity (`Bottle`) is created, changed and removed only through its aggregate root (`Entry`), which is the only object in the aggregate with a repository. | [ADR-0052](adr/0052-cellar-aggregate-owns-its-writes.md) |
| Timestamp columns | Every new table carries `created_at` and `updated_at`. `catalog.beer` predates the convention and has only `created_at`. | [architecture.md §3](architecture.md#3-backend-modules) |

## Terms weighed and dropped

Recorded so a later session does not re-propose them.

| Term | Verdict |
|---|---|
| Renaming `cellar.Bottle` | Proposed (iteration 5 [task 09](tasks/iteration-5/09-bottle-beer-naming.md)) to remove the `Bottle` / `ContainerType.BOTTLE` overlap and the looser `Beer` / `Bottle` echo. **Dropped 2026-08-15**: the churn through REST paths, the OpenAPI schema and the generated frontend types was judged not worth it. The pair of meanings is the live convention. |
| A separate handle + editable display name | Rejected in [ADR-0049](adr/0049-profile-module-and-public-identity.md). Kalia has one immutable `username` and no rename path; revisit when someone actually asks to be called something else. |
| An opaque profile `UUID` as the public-cellar URL segment | Rejected in [ADR-0049](adr/0049-profile-module-and-public-identity.md) / [ADR-0050](adr/0050-public-cellar-addressing.md): a link has to tell its recipient whose cellar it is. `username` is the segment. |
| A "drunk" / "consumed" bottle state | Not rejected, deferred: a bottle is removed by deleting its row, with no lifecycle state yet ([architecture.md §3](architecture.md#3-backend-modules)). Listed so the absence is known to be deliberate. |
| `Beer.price` / `catalog.domain.Money` | Removed (iteration 6.5 [task 10](tasks/iteration-6.5/10-remove-beer-price.md)): price is not a property of a beer — one beer has many shop prices, and Kalia has no shop integration. A leftover from the deprecated "sell beer" vision ([ADR-0004](adr/0004-backend-cart.md), [ADR-0005](adr/0005-defer-auth-mock-payments.md)). Not a rejected rename — a dropped concept, listed so it is not re-added without a fresh design. |
