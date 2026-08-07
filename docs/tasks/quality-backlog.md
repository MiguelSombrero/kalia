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

_(none currently open)_

## SHOULD

- **SHOULD-1** *(confirmed 2026-07-27)* `backend/src/main/java/fi/kalia/catalog/domain/BeerSpecifications.java:17-29` vs. `V003__catalog_schema.sql:23-24` — the name filter uses a leading-wildcard `LIKE '%...%'` (never index-usable), and style/country filters compare `lower(column)` against a plain (non-functional) index; invisible at current seed scale (~54 rows), will degrade as the catalog grows.
- **SHOULD-2** *(confirmed 2026-07-23)* `frontend/features/catalog/api.ts:31-46` — `searchBeers` has no direct unit test for its status check or numeric-string coercions; only covered indirectly through page-level tests.
- **SHOULD-3** *(confirmed 2026-07-27)* **[needs decision]** `backend/src/main/resources/db/migration/common/V001__create_module_schemas.sql:4-6` pre-creates `cart`/`ordering`/`payment` schemas, which is itself the "own store" outcome of the store-model choice `docs/architecture.md` §9 calls deliberately undecided (ADR-0006). Not urgent — nothing is built on these schemas yet — but the empty schemas lower the path-of-least-resistance cost of building the own-store cart directly, ahead of the ADR §9 says is required first. Needs a call: rename/drop the schemas until the decision is made, or accept the bias as harmless per ADR-0006's rationale.
- **SHOULD-4** *(confirmed 2026-07-27)* `docs/adr/0013-logging-conventions.md`'s 2026-07-27 Amended note says `backend/README.md` "keeps a summary and a link, not the restatement" of the logging conventions, but `backend/README.md:173-183` still fully restates them.
- **SHOULD-5** *(confirmed 2026-07-27)* `docs/roadmap.md:23-28` and `CLAUDE.md:153-159` restate the "Iteration DoD gate" rule near-verbatim in both places; `docs/roadmap.md` isn't one of ADR-0020's sanctioned homes for this kind of rule.
- **SHOULD-6** *(confirmed 2026-07-27)* `backend/README.md`'s bounded-parameter and Lombok bullets carry unlinked multi-line "why" rationale that, per ADR-0020, should have graduated to an ADR rather than living in the README.
- **SHOULD-7** *(confirmed 2026-08-07)* **[needs decision]** `backend/Dockerfile:10` runs on `eclipse-temurin:25-jre`, whose Ubuntu 26.04 base ships Canonical's Pebble init tool — the sole source of all five remaining `.trivyignore` waivers (CVE-2026-25681, -27136, -33814, -39821 in `golang.org/x/net` v0.40.0; CVE-2026-39822 in `stdlib` v1.26.4), which **expire 2026-08-26** and will turn the scan red until someone revisits them. A base-image variant fixes it outright rather than re-dating the waivers. Measured 2026-08-07: `eclipse-temurin:25-jre` → 5 HIGH/CRITICAL; **`eclipse-temurin:25-jre-noble` → 0**, running the *same* Java 25.0.3 on Ubuntu 24.04 LTS with no Pebble binary; `eclipse-temurin:26-jre` → 0 but that is a JDK major bump; `25-jre-alpine` → 3 (libexpat, p11-kit). Adopting `-noble` would empty `.trivyignore` entirely. Needs a call because it trades Ubuntu 26.04 for 24.04 — older glibc and package set, supported to April 2029 — against `26-jre`, which moves forward instead but changes the JDK major and so touches `java.version` in `pom.xml`, the build-stage image and the README tech stack. Only the runtime stage matters for the scan; the `maven:3.9-eclipse-temurin-25` build stage is multi-stage and never shipped. *(Found while fixing the frontend image CVEs on PR #96, applying the same "prefer a version bump over a manual removal" preference to the backend — where, unlike the frontend, it works.)*

- **SHOULD-8** *(confirmed 2026-08-07)* `frontend/lib/auth/valkeyAdapter.ts` — two simultaneous first-ever sign-ins by the same Keycloak subject each find no user (`getUserByAccount` → null) and each call `createUser`, leaving two `auth:user:*` records for one subject with `auth:account-index:*` resolving to whichever wrote last. Reproduced by flushing Valkey and running `frontend/e2e/sign-in-out.spec.ts` with Playwright's default parallelism: the key dump afterwards shows two user records for `testuser`. Narrow in practice — it needs concurrent sign-ins during a subject's very first authentication, and the duplicate is inert once the index settles — but the losing record is orphaned forever and any future per-user data written against it would be stranded. Auth.js's Adapter has no compare-and-set to lean on, so the fix is a Valkey `SET NX` on the account index (or on a short-lived lock) with the loser re-reading. *(Found while measuring whether ADR-0030 lets the E2E suite drop `mode: "serial"`; it is **not** the cause of those parallel failures, which reproduce with the user already present.)*

## COULD

- **COULD-1** *(confirmed 2026-07-23)* `README.md` tech-stack table vs. `docs/adr/0008-tanstack-query.md` through `0012-orval-api-client.md` — dependency versions are duplicated between the README and each ADR; currently consistent, but a structural drift risk.
- **COULD-2** *(confirmed 2026-07-23)* WCAG 2.1 AA enforcement mechanism is described near-identically in three places: `frontend/README.md` and two sections of `docs/architecture.md`.
- **COULD-3** *(confirmed 2026-07-23)* DDD-lite package-structure convention is restated in full in three places: `docs/adr/0007-backend-package-structure.md`, `docs/architecture.md` §3, and `backend/README.md`.
- **COULD-4** *(confirmed 2026-07-23)* `backend/src/main/java/fi/kalia/catalog/application/CatalogService.java:35-40` — `listBreweries()` loads and sorts the whole brewery table in Java on every call, with no pagination contract on `/api/v1/breweries`; fine at current scale (~20 rows).
- **COULD-5** *(confirmed 2026-07-23)* `frontend/features/i18n/LocaleSwitcher.tsx:21` — uses an unvalidated type assertion (`pathname.split("/")[1] as Locale`) instead of the `isLocale`/`toLocale` validation used elsewhere in the codebase.
- **COULD-6** *(confirmed 2026-07-23)* `backend/src/test/java/fi/kalia/catalog/domain/BeerSpecificationsIT.java` / `CatalogApiIT` — missing coverage for `minAbv > maxAbv` (contradictory range) and for sorting by `style`.
- **COULD-7** *(confirmed 2026-07-27)* **[needs decision]** `backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:5,74` constructs the domain-layer `BeerSearchCriteria` directly from request parameters instead of going through an application-owned input type. Passes today's dependency-direction rules, but is a coupling shortcut worth closing (e.g. a rule requiring controllers depend only on `application` types) before `cellar`/`cart` copy the same pattern.
- **COULD-8** *(confirmed 2026-07-27)* `backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:103` — the `sort` query parameter accepts trailing garbage (e.g. `sort=name,asc,extra`) instead of rejecting it.
- **COULD-9** *(confirmed 2026-07-27)* `backend/src/main/resources/application.properties:39` — Actuator/Swagger exposure defaults are verified fail-safe today, but nothing automated guards that a future edit keeps them so.
- **COULD-10** *(confirmed 2026-08-07)* **[needs decision]** `docs/architecture.md` §2 and §3 describe the backend module map by hand — a mermaid flowchart and a dependency table — and nothing detects them drifting from the actual modules. Spring Modulith's `Documenter` derives both from the code (C4 component diagram plus a per-module "canvas" listing dependencies, exposed types, events published and consumed), and `spring-modulith-docs` 2.1.0 is **already on the test classpath** via `spring-modulith-starter-test`, so this costs no new dependency. Fits this project's premise that docs and code must not drift, and gets more valuable as `identity`, `cellar` and any store modules multiply the edges a human has to keep in sync. Needs a call before it is a task, because `Documenter` emits **PlantUML/AsciiDoc, not mermaid**, so it cannot drop-in replace the §2 diagram: either (a) generated output supplements the hand-written diagram — two sources of truth, the drift problem partly intact; (b) it replaces §2/§3, which changes how `docs/architecture.md` reads and adds a rendering step; or (c) generate in a test and assert the *committed* diagram still matches, keeping mermaid but failing CI on drift. Also open: whether the output is committed or generated on demand, and whether a `Documenter` run belongs in the `mvn verify` path or in CI only.

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
- ~~2026-07-27 SHOULD-4~~ (module guard against a protected module landing before auth) — lifted into iteration-4 task 6.
- ~~2026-07-27 MUST-2~~ (react-i18next "not yet wired" stale claim) — lifted into iteration-4 task 5.
- ~~2026-07-27 COULD-10~~ (Redis/Valkey §8 wording) — lifted into iteration-4 task 5.
- ~~2026-07-27 COULD-11~~ (stale SearchFilters client-component example) — lifted into iteration-4 task 5.
- ~~MUST-1~~ (`app/api/*` route handlers described as an already-built BFF proxy layer when none existed) — resolved by iteration-4 task 2: `app/api/auth/[...nextauth]/route.ts` is now a real `app/api/*` route handler, and `docs/architecture.md` §5/§6 updated to describe what actually exists.
