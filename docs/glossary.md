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
  exists; it runs in CI (the `glossary-check` job) and under `make check`,
  with a fixture self-test (`scripts/check-glossary.test.mjs`) because nothing
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

Beers, breweries and styles, plus search and filtering. Depends on no other
module. Its data is public by nature — a beer's price is catalog data a
signed-out visitor may read.

### Domain types (`fi.kalia.catalog.domain`)

| Type | Meaning in this module | Why |
|---|---|---|
| `Beer` | A **brand**: a product a brewery makes (AleSmith IPA), with a name, style, ABV, price and description. Not a physical object and not something a user owns — the cellar references it by id only. | [ADR-0034](adr/0034-cellar-two-level-bottle-model.md) |
| `Brewery` | The maker of beers, with a country and optional city. | [ADR-0007](adr/0007-backend-package-structure.md) |
| `Money` | A value object: an integer amount in minor units (cents) plus a 3-letter ISO-4217 currency code. Never floating point. | [architecture.md §3](architecture.md#3-backend-modules) |
| `BeerSearchCriteria` | A value object bundling the catalog search and filter inputs (free-text query, style, brewery, country, ABV range). | [ADR-0044](adr/0044-catalog-search-indexes.md) |
| `BeerSpecifications` | A factory of JPA `Specification<Beer>` predicates built from a `BeerSearchCriteria`, with `LIKE` wildcards escaped. | [ADR-0044](adr/0044-catalog-search-indexes.md) |
| `BeerRepository` | Persistence for the `Beer` entity: paged specification search and by-id lookup, both eager-loading `Brewery`. | [ADR-0007](adr/0007-backend-package-structure.md) |
| `BreweryRepository` | Persistence for the `Brewery` entity. | [ADR-0007](adr/0007-backend-package-structure.md) |

## identity

The security filter chain, bearer-token validation, and resolving the current
caller from the token's `sub`. Deliberately narrow: it is about tokens, not
about what a user looks like to other users — that is `profile`.

### Domain types (`fi.kalia.identity.domain`)

| Type | Meaning in this module | Why |
|---|---|---|
| `CurrentUser` | The authenticated caller behind the bearer token. `id` is the identity provider's `sub` (the stable per-user key); `username` is `preferred_username`, display-only and **never** a key. | [ADR-0028](adr/0028-resource-server-and-current-user.md) |

## profile

Who a user is to *other* users: a username copied once from the identity
provider, plus whether their cellar is public. A leaf module — depends on
nothing. Its rows are public data an anonymous request may read.

### Domain types (`fi.kalia.profile.domain`)

| Type | Meaning in this module | Why |
|---|---|---|
| `Profile` | A user's public identity, keyed by the Keycloak `sub` itself (no separate generated id), created lazily the first time anything needs one. Carries `username` (copied from `preferred_username` at creation, immutable in Kalia thereafter) and `cellarPublic` (defaults `false`). | [ADR-0049](adr/0049-profile-module-and-public-identity.md) |
| `ProfileRepository` | Persistence for `Profile`. Looks a profile up by username with `findFirst…OrderByCreatedAtDesc` because a Keycloak `sub` change can leave two rows sharing one username. | [ADR-0033](adr/0033-keycloak-account-relinking.md) |

## cellar

The signed-in user's owned bottles, grouped by catalog beer; plus a public
read of a cellar its owner has made public. Reads `catalog` (beer existence),
`identity` (current user) and `profile` (public-cellar visibility).

### Domain types (`fi.kalia.cellar.domain`)

| Type | Meaning in this module | Why |
|---|---|---|
| `Entry` | The **aggregate root**: one row per `(user, catalog beer)`, owning the individual `Bottle`s beneath it. A pure grouping, not something a user keeps — it is deleted when its last bottle is removed, so no reader ever sees a zero-quantity entry. `quantity()` is `COUNT(*)` over its bottles, never stored. | [ADR-0034](adr/0034-cellar-two-level-bottle-model.md), [ADR-0052](adr/0052-cellar-aggregate-owns-its-writes.md) |
| `Bottle` | One **physical container** a user owns, with its own brewed and best-before dates and a `ContainerType`. A non-root entity: written only through its `Entry`, no repository of its own. May be a can or a keg — "bottle" here is the general word for the owned unit, not the container kind. | [ADR-0034](adr/0034-cellar-two-level-bottle-model.md), [ADR-0052](adr/0052-cellar-aggregate-owns-its-writes.md) |
| `ContainerType` | The kind of container a `Bottle` is: `BOTTLE`, `CAN` or `KEG`. `BOTTLE` is one value of this enum; a `Bottle` whose `ContainerType` is `CAN` is still a `Bottle`. | [ADR-0034](adr/0034-cellar-two-level-bottle-model.md) |
| `EntrySummary` | A read-model projection: one `Entry` with its derived `quantity`, for a list that must not load every bottle just to count them. | [architecture.md §4](architecture.md#4-api-design) |
| `EntryRepository` | Persistence for the `Entry` aggregate. Every lookup is keyed on an already-resolved owner id, so another user's entry and a missing one are indistinguishable. | [ADR-0050](adr/0050-public-cellar-addressing.md) |
| `InvalidBottleException` | A domain exception for bottle data that cannot be accepted: a future brewed date, a best-before date not after the brewed date, a non-positive add quantity. | [ADR-0014](adr/0014-shared-exception-handling.md) |

---

## Words that mean two things across modules

| Word | In one module | In another |
|---|---|---|
| **beer** | `catalog.Beer` — a brand/product the catalog holds. | In `cellar` there is no `Beer` type at all: an entry carries a `beerId`, a cross-module reference by id. Informally, UI copy says "beer" for the brand *and* loosely for the bottles owned of it. |
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
| `/cellar/entries/{entryId}/bottles` | One entry's bottles. Elsewhere a bottle is addressed by its own id, never nested under its entry. |
| `/cellar/bottles`, `/cellar/bottles/{id}` | Add / update / remove a bottle. `POST` answers with an array — it creates `quantity` independently editable rows, never a stored count. |
| `/profile/visibility` | Change whether the caller's cellar is public. |

### JSON field names

| Field | Meaning |
|---|---|
| `beerId` | A cross-module reference to `catalog.Beer` by id. Cellar responses never embed a `Beer` object. |
| `quantity` | On `EntryDto` / `PublicCellarEntryDto`: the derived bottle count (`COUNT(*)`). It maps to no database column and no stored domain field — it exists only at the API boundary. On `AddBottleRequestDto`: how many identical bottles to create (1–24). |
| `cellarPublic` | The wire name for cellar visibility, on `ProfileDto` and `ChangeVisibilityRequestDto`. |
| `containerType` | A `ContainerType` on the wire: the string `BOTTLE`, `CAN` or `KEG`. |
| `content`, `totalElements`, `totalPages`, `page` | The pagination envelope (`PageDto`), on `/beers` and `/breweries`. |

### Generated TypeScript types

`orval` turns each backend DTO into a PascalCase interface in a camelCase file
(`EntryDto` in `entryDto.ts`). It also **extracts each enum-typed field into
its own type** — `BottleDtoContainerType`, `AddBottleRequestDtoContainerType`
— which have no backend counterpart; they are all the `ContainerType` enum.
`frontend/lib/api/generated` is regenerated, never hand-edited
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
