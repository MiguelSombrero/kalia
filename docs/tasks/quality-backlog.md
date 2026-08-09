# Quality backlog

Findings from periodic `/quality-sweep` runs land here, grouped only by
severity — **MUST** / **SHOULD** / **COULD** (MoSCoW), never by sweep
date. A sweep is opened as its own PR and reviewed like any other change;
who may start one, and when, is in CLAUDE.md "Quality checks". Each
finding gets a permanent ID within
its category (`MUST-1`, `SHOULD-1`, ...) that is never reused, even after
the finding is resolved or lifted — retired IDs move to the "Retired"
section below rather than being deleted, so a later sweep never
double-lists an already-known issue and a later ID never collides with an
earlier one. Every finding carries a *(confirmed &lt;date&gt;)* — the most
recent sweep that independently reconfirmed it; a sweep that rediscovers
an existing finding updates that date (and the description, if details
changed) in place instead of adding a duplicate entry. An entry not
mentioned by a given sweep simply keeps its prior confirmed date — that
isn't staleness needing action, just "not independently re-verified this
time."

A `**[needs decision]**` tag means the finding needs product-owner input
before it's a well-scoped task; anything untagged is ready to implement as
written.

**Lifting a finding into an iteration.** The product owner reviews the
backlog and tells an AI agent which findings to promote — by ID (`MUST-1`,
`SHOULD-3`, ...), a range, or a one-off description for anything not yet
listed here. A `[needs decision]` finding is resolved in that conversation
before it is written up as a task, never silently guessed at. The lifted
task keeps a backreference to its origin (e.g. "(Quality backlog
SHOULD-3)") so the history survives leaving this file — IDs are permanent,
so the ID alone is enough without a date. In the same PR that adds the
task, the finding moves to "Retired" below noting where it went, rather
than being deleted: deleting it would let a later sweep reissue its ID for
an unrelated finding.

*The findings below predate this format (adopted 2026-07-28) and were
carried over from the last two dated sweeps (2026-07-23, 2026-07-27) under
fresh, undated IDs, with each entry's original sweep date kept as its
initial confirmed-date. Findings already retired before this format existed
keep their original sweep-dated labels in "Retired" below, unchanged, since
they're already cross-referenced from merged PRs and
`docs/tasks/iteration-4.md`.*

## MUST

- **MUST-2** *(confirmed 2026-08-09)* `docs/architecture.md:218` states that `app/api/auth/[...nextauth]` "is the app's one route handler", but a second one exists — `frontend/app/api/auth/backchannel-logout/route.ts`, an intentionally *unauthenticated* public endpoint. The same document's §6 describes it (`docs/architecture.md:302-308`), as does `frontend/README.md:147-155`, so §5 contradicts §6 and understates the app's public HTTP surface to anyone reading the frontend design section for it.

## SHOULD

- **SHOULD-1** *(confirmed 2026-08-09)* `backend/src/main/java/fi/kalia/catalog/domain/BeerSpecifications.java:24-48` vs. `V003__catalog_schema.sql:23-24` — the name filter uses a leading-wildcard `LIKE '%...%'` (never index-usable), style compares `lower(style)` against a plain (non-functional) `beer_style_idx`, and `brewery.country` has no index at all; invisible at current seed scale (~54 rows), will degrade as the catalog grows.
- **SHOULD-2** *(confirmed 2026-08-09)* `frontend/features/catalog/api.ts:32-48` — `searchBeers` has no direct unit test for its status check or numeric-string coercions; `features/catalog/api.test.ts` covers `buildBeerSearchParams` and `getBeer` only, leaving `searchBeers` reached solely through page-level tests.
- **SHOULD-4** *(confirmed 2026-08-09)* `docs/adr/0013-logging-conventions.md`'s 2026-07-27 Amended note says `backend/README.md` "keeps a summary and a link, not the restatement" of the logging conventions, but `backend/README.md:217-227` still fully restates them.
- **SHOULD-5** *(confirmed 2026-08-09)* `docs/roadmap.md:35-40` and `CLAUDE.md:175-181` restate the "Iteration DoD gate" rule near-verbatim in both places; `docs/roadmap.md` isn't one of ADR-0020's sanctioned homes for this kind of rule.
- **SHOULD-6** *(confirmed 2026-08-09)* `backend/README.md:144-148` (Lombok) and `:158-167` (bounded parameters) carry unlinked multi-line "why" rationale that, per ADR-0020, should have graduated to an ADR rather than living in the README.
- **SHOULD-8** *(confirmed 2026-08-07)* `frontend/lib/auth/valkeyAdapter.ts` — two simultaneous first-ever sign-ins by the same Keycloak subject each find no user (`getUserByAccount` → null) and each call `createUser`, leaving two `auth:user:*` records for one subject with `auth:account-index:*` resolving to whichever wrote last. Reproduced by flushing Valkey and running `frontend/e2e/sign-in-out.spec.ts` with Playwright's default parallelism: the key dump afterwards shows two user records for `testuser`. Narrow in practice — it needs concurrent sign-ins during a subject's very first authentication, and the duplicate is inert once the index settles — but the losing record is orphaned forever and any future per-user data written against it would be stranded. Auth.js's Adapter has no compare-and-set to lean on, so the fix is a Valkey `SET NX` on the account index (or on a short-lived lock) with the loser re-reading. *(Found while measuring whether ADR-0030 lets the E2E suite drop `mode: "serial"`; it is **not** the cause of those parallel failures, which reproduce with the user already present.)*
- **SHOULD-9** *(confirmed 2026-08-09)* **[needs decision]** [ADR-0016](../adr/0016-security-response-headers.md)'s own revisit trigger has fired and nothing has revisited it. The ADR accepts `script-src 'unsafe-inline'` (`frontend/next.config.ts:7`) explicitly "once Auth/Cellar land and there's real session/user data to protect, the `'unsafe-inline'` trade-off should be re-examined against nonce-based CSP (or Subresource Integrity, if it has stabilized by then)" — iteration 4 shipped authentication, and iteration 5 is building per-user data now. The ADR's original survey still holds on the *source* side (no `dangerouslySetInnerHTML`, no `innerHTML`, no `eval`, no inline `<script>` anywhere in `frontend/`, re-verified this sweep), so this is about the margin, not a live hole — but the condition the ADR itself named as the moment to re-decide has passed. Needs a call because there are three valid outcomes: adopt a nonce CSP via `proxy.ts` and give up static rendering of the locale root, adopt SRI if it has stabilized at this Next version, or re-affirm `'unsafe-inline'` and amend ADR-0016 with the new reasoning so the trigger stops reading as unaddressed.
- **SHOULD-10** *(confirmed 2026-08-09)* **[needs decision]** `backend/src/main/java/fi/kalia/cellar/application/CellarService.java:57-62` — removing a cellar entry's *last* bottle leaves the `cellar.entry` row behind with zero bottles, and nothing ever deletes it. `docs/architecture.md:141-154` defines quantity as `COUNT(*)` over bottles, so such an entry is a beer the cellar reports you own zero of. No test covers it: `CellarServiceIT.bulkAddingCreatesThatManyIndependentlyRemovableRows` removes 1 of 6, and `EntryTest` never empties an entry. Harmless as data (the `UNIQUE (user_id, beer_id)` constraint means a later add reuses the row), but it decides what task 02's list endpoint and task 03's page render. Needs a call: delete the entry when its last bottle goes, or keep it and filter empties out on read.
- **SHOULD-11** *(confirmed 2026-08-09)* **[needs decision]** `docs/tasks/iteration-5/01-cellar-module-and-schema.md:80-82` is ticked — "`cellar` exists as a Modulith module with `domain`/`application`/`web` packages" — but `backend/src/main/java/fi/kalia/cellar/` has only `domain/` and `application/`; there is no `web/` package, and `ArchitectureTest`/`ModularityTest` pass precisely because nothing there needs one yet. A checked criterion that isn't true is the failure mode the task-file format exists to prevent. Needs a call because CLAUDE.md freezes a completed task file apart from its status: either the criterion was over-specified and the correction goes in a note, or `cellar/web` (with its `package-info.java`) should land ahead of task 02.

## COULD

- **COULD-1** *(confirmed 2026-08-09)* `README.md` tech-stack table vs. `docs/adr/0008-tanstack-query.md` through `0012-orval-api-client.md` — dependency versions are duplicated between the README and each ADR, and the predicted drift has now happened: `docs/adr/0012-orval-api-client.md:27` names "orval 8.22.0" while `frontend/package.json:49` pins `^8.23.0` (the bump `README.md:181-186` describes). ADR-0008's "TanStack Query 5.101.3" still matches.
- **COULD-2** *(confirmed 2026-08-09)* WCAG 2.1 AA enforcement mechanism is described near-identically in three places: `frontend/README.md:171-177`, `docs/architecture.md:252-258` and the frontend-unit row of its §7 table.
- **COULD-3** *(confirmed 2026-08-09)* DDD-lite package-structure convention is restated in full in three places: `docs/adr/0007-backend-package-structure.md`, `docs/architecture.md` §3, and `backend/README.md:136-140`.
- **COULD-4** *(confirmed 2026-08-09)* `backend/src/main/java/fi/kalia/catalog/application/CatalogService.java:35-41` — `listBreweries()` loads and sorts the whole brewery table in Java on every call, with no pagination contract on `/api/v1/breweries`; fine at current scale (~20 rows).
- **COULD-5** *(confirmed 2026-08-09)* `frontend/features/i18n/LocaleSwitcher.tsx:18` — uses an unvalidated type assertion (`pathname.split("/")[1] as Locale`) instead of the `isLocale`/`toLocale` validation used elsewhere in the codebase.
- **COULD-6** *(confirmed 2026-08-09)* `backend/src/test/java/fi/kalia/catalog/web/CatalogApiIT.java` — no test sorts by `style`, even though it is one of the three properties `CatalogController.SORTABLE` accepts and one of the two that get `ignoreCase()`. *(The `minAbv > maxAbv` half of this finding is resolved: `invertedAbvRangeYieldsProblemJson400WithGuidance` and `equalAbvBoundsAreAccepted` now cover it.)*
- **COULD-7** *(confirmed 2026-08-09)* **[needs decision]** `backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:5,74` constructs the domain-layer `BeerSearchCriteria` directly from request parameters instead of going through an application-owned input type. Passes today's dependency-direction rules, but is a coupling shortcut worth closing (e.g. a rule requiring controllers depend only on `application` types) before `cellar` and the modules after it copy the same pattern.
- **COULD-8** *(confirmed 2026-08-09)* `backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:103-119` — the `sort` query parameter accepts trailing garbage (e.g. `sort=name,asc,extra`) instead of rejecting it: `parseSort` reads `parts[0]` and `parts[1]` and silently discards the rest.
- **COULD-9** *(confirmed 2026-08-09)* `backend/src/main/resources/application.properties:42-43` — the springdoc exposure default is verified fail-safe by inspection but by nothing automated: `backend/pom.xml:212-216` sets `springdoc.api-docs.enabled`/`springdoc.swagger-ui.enabled` to `true` for every failsafe run, so no test ever exercises the production default and an edit flipping it to `true` would pass CI. *(The Actuator half of this finding is resolved: `KaliaApplicationIT.unexposedActuatorEndpointsAreNotReachable` now pins the declared exposure with an authenticated request.)*
- **COULD-10** *(confirmed 2026-08-07)* **[needs decision]** `docs/architecture.md` §2 and §3 describe the backend module map by hand — a mermaid flowchart and a dependency table — and nothing detects them drifting from the actual modules. Spring Modulith's `Documenter` derives both from the code (C4 component diagram plus a per-module "canvas" listing dependencies, exposed types, events published and consumed), and `spring-modulith-docs` 2.1.0 is **already on the test classpath** via `spring-modulith-starter-test`, so this costs no new dependency. Fits this project's premise that docs and code must not drift, and gets more valuable as `identity`, `cellar`, `feed` and whatever follows multiply the edges a human has to keep in sync. Needs a call before it is a task, because `Documenter` emits **PlantUML/AsciiDoc, not mermaid**, so it cannot drop-in replace the §2 diagram: either (a) generated output supplements the hand-written diagram — two sources of truth, the drift problem partly intact; (b) it replaces §2/§3, which changes how `docs/architecture.md` reads and adds a rendering step; or (c) generate in a test and assert the *committed* diagram still matches, keeping mermaid but failing CI on drift. Also open: whether the output is committed or generated on demand, and whether a `Documenter` run belongs in the `mvn verify` path or in CI only.
- **COULD-11** *(confirmed 2026-08-09)* `backend/src/main/java/fi/kalia/catalog/CatalogApi.java:13` injects `BeerRepository` — a `domain` type — straight into the module-root inter-module API, skipping `CatalogService` and the `web → application → domain` direction every other class follows. Nothing objects, because `ArchitectureTest`'s `domainDependsOnNoOuterLayer`/`applicationDoesNotDependOnWeb` only constrain classes *inside* the three layer packages and the module root is in none of them. Same root cause as COULD-7 (the layer rules have gaps at the module edges) but a different remedy: a rule saying what a module's root-package API may depend on. Worth settling before `identity` gains its own root-package API for `cellar` (`identity/package-info.java` says it will).
- **COULD-12** *(confirmed 2026-08-09)* `docker-compose.yml:28-30` — the comment on the backend's published port still reads "the API stays unauthenticated until the auth iteration, so this must never be published beyond the dev machine". Iteration 4 shipped authentication; `docs/architecture.md:283-285` and `backend/README.md:11-14` already carry the current reasoning (loopback binding is defence in depth now, not the only defence).
- **COULD-13** *(confirmed 2026-08-09)* `docs/tasks/backlog.md:34-40` defers the "a failing token refresh is silent" item on the grounds that "the frontend has no logging convention at all and inventing one for a single call site is the wrong place to settle it" — but `frontend/lib/logger.ts` has existed since iteration 3, `frontend/README.md:94-98` makes it a convention, and ESLint's `no-console` enforces it. The deferral may still be right (structured logging is the real work), but its stated reason no longer holds.
- **COULD-14** *(confirmed 2026-08-09)* `docs/tasks/iteration-5/02-cellar-rest-api.md:62` points at "[task 01](01-cellar-module-and-schema.md) question 6", but task 01's `Open questions` reads `**None.**` — the questions were resolved into constraints and erased when it moved to `refined`, leaving a reference nobody can follow. `scripts/check-tasks.mjs` cannot catch this: it enforces that the section says `**None.**`, which is exactly what makes the reference dangle.
- **COULD-15** *(confirmed 2026-08-09)* `backend/src/main/java/fi/kalia/cellar/domain/Entry.java:69-75` — `addBottles` bounds `quantity` only from below (`quantity > 0`), so a bulk add of an arbitrarily large number materialises that many entities and rows in one transaction. No caller can reach it yet (there is no controller), but `backend/README.md:158-167`'s bounded-parameter convention governs the web layer only, so the domain-side cap has to be a deliberate choice in [task 02](iteration-5/02-cellar-rest-api.md) rather than something that convention supplies.

## Retired

Permanent, append-only record of resolved or lifted findings — kept so IDs
are never reused and history isn't lost once a finding leaves the live
lists above. Findings retired before this format existed (2026-07-28) keep
their original sweep-dated labels (e.g. `2026-07-23 SHOULD-1`); findings
retired from 2026-07-28 onward use the undated label straight from the
live section they came from.

- ~~2026-07-23 COULD-4~~ (LIKE-wildcard metacharacters unescaped) — superseded by 2026-07-27 SHOULD-2 (same finding, with a concrete repro), itself lifted below.
- ~~2026-07-23 COULD-8~~ (docker-compose backend healthcheck was a bare port-open probe) — resolved: now polls `/actuator/health`.
- ~~2026-07-27 MUST-1~~ (README status banner said iteration 3 was next) — resolved by PR #82.
- ~~2026-07-23 SHOULD-1~~ (hardcoded dev Postgres password, no warning) — lifted into `docs/tasks/iteration-4.md` task 7.
- ~~2026-07-23 SHOULD-6~~ (stale architecture.md banner + Keycloak version duplication) — lifted into iteration-4 task 5.
- ~~2026-07-27 SHOULD-2~~ (unescaped LIKE wildcards, with repro) — lifted into iteration-4 task 7.
- ~~2026-07-27 SHOULD-3~~ (no fixture proves ArchUnit/Modulith rules catch a violation) — lifted into iteration-4 task 6.
- ~~SHOULD-3~~ (V001 pre-creating `cart`/`ordering`/`payment` schemas biased the undecided store-model choice toward the own-store outcome) — decided 2026-08-08: the store left the vision, ADR-0004 and ADR-0005 are deprecated, and the schemas are dropped by [iteration-5 task 07](iteration-5/07-drop-store-schemas.md). The finding was right about the direction of the bias and understated it — those schemas were the only physical trace the store ever had.
- ~~2026-07-27 SHOULD-4~~ (module guard against a protected module landing before auth) — lifted into iteration-4 task 6.
- ~~2026-07-27 MUST-2~~ (react-i18next "not yet wired" stale claim) — lifted into iteration-4 task 5.
- ~~2026-07-27 COULD-10~~ (Redis/Valkey §8 wording) — lifted into iteration-4 task 5.
- ~~2026-07-27 COULD-11~~ (stale SearchFilters client-component example) — lifted into iteration-4 task 5.
- ~~MUST-1~~ (`app/api/*` route handlers described as an already-built BFF proxy layer when none existed) — resolved by iteration-4 task 2: `app/api/auth/[...nextauth]/route.ts` is now a real `app/api/*` route handler, and `docs/architecture.md` §5/§6 updated to describe what actually exists.
- ~~SHOULD-7~~ (backend runtime image's five `.trivyignore` waivers, all from Pebble in the Ubuntu 26.04 base, expire 2026-08-26) — lifted into [iteration-5 task 08](iteration-5/08-clear-backend-image-trivy-waivers.md). Its `[needs decision]` — `25-jre-noble` versus `26-jre` — was resolved by the product owner on 2026-08-08 in favour of `25-jre-noble` before the task was written, and is a constraint there rather than an open question.
