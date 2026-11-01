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

**Findings deferred from a review.** A `/code-review` finding marked *new
task* is filed here in the pull request that defers it, as an entry with its
own ID in the right category, and the PR description names that ID
(`implement-task` step 8; `scripts/check-pr-body.mjs` fails a body that
defers a finding without one). The *(confirmed &lt;date&gt;)* is then the date
it was filed. A bare "follow-up" in a PR body is how six findings from
#452 and the ones from #398, #400 and #425 were lost (SHOULD-90).

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

*None open — every MUST from the 2026-10-27 sweep was lifted into
[iteration 9](iteration-9.md).*

## SHOULD

Every other SHOULD filed up to 2026-10-31 was lifted into
[iteration 10](iteration-10.md).

- **SHOULD-80** *(confirmed 2026-10-27)* **[needs decision]** — moderation is
  `scripts/moderate-contributor.sql`, run through `docker compose exec`
  (`Makefile:19-21`): it acts on all of a contributor's rows at once
  (removing one bad beer also removes their approved ones), writes `catalog`
  tables around the domain, reads `profile.profile` cross-schema, and has no
  deployment story; rejected rows leave the pending count
  (`ContributionService.java:72-75`), so a rejected contributor can resubmit
  20 more at once, indefinitely. Iteration 9+ mobile with open registration
  grows the queue before ADR-0091's trigger fires. Per-row actions with
  rejections counted toward a cooldown, or an operator-role backend endpoint.
  *Kept out of iteration 10 by the product owner (2026-11-01): an admin page
  planned for a later iteration replaces the SQL script, and this is fixed
  there.*
- **SHOULD-97** *(confirmed 2026-11-01)* — while Keycloak is slow rather than
  down, every API call of a signed-in user waits out its own refresh attempt
  (the 10 s timeout in `keycloakClient.ts`) before the transport sends it
  without a token, because a transient failure is not remembered and the next
  call starts a fresh refresh; the Catalog tab works but each request is 10 s
  late (found reviewing iteration 10 task 8). Remember the failure for a short
  window so calls inside it skip the attempt.

- **SHOULD-97** *(confirmed 2026-11-01)* — the change filter in `ci.yml`
  runs every job on a push to `dev` or `main` ("fails open on purpose"), so a
  docs-only merge pays for the whole suite: the Android end-to-end job alone
  is 13–19 minutes (median 17 over 19 green runs), and docs-only merges to
  `dev` have run it and gone red on an emulator fault with no code involved.
  Pull-request pushes are already filtered. Diff a push to `dev` against
  `github.event.before` instead and keep "everything" for the cases the filter
  cannot classify (a shared root file, a first push, a forced push where
  `before` is unreachable). The job's `ci-passed` gate already counts a skipped
  job as a pass. Found in iteration 10 task 07, which left it alone because it
  changes the safety policy of every job, not only that one.

## COULD

- **COULD-26** *(confirmed 2026-10-11)* — Keycloak's password-reset page
  marks its username field `autocomplete="off"`, so a browser or password
  manager will not offer the username it already holds. Not a WCAG 2.2
  failure — the page asks for nothing to be recalled that 3.3.8 protects, and
  the login and registration fields carry proper `autocomplete` values — but
  it is stock `keycloak.v2` markup the theme does not touch
  ([ADR-0056](../adr/0056-branded-bilingual-keycloak-pages.md)).

- **COULD-75** *(confirmed 2026-10-27)* **[needs decision]** — the backend's
  10 r/s per-address zone does not bound anonymous backend load: the BFF
  calls `backend:8080` directly, so SSR pages and public Server Actions under
  the 150 r/s web zone (`edge/nginx.conf:40-44`, `:89-92`) drive about
  15 times that, against ADR-0090:106-108's "a bound a script cannot step
  around". Tighten the web zone for actions, limit in the backend by
  forwarded address, or correct the ADR.
- **COULD-77** *(confirmed 2026-10-27)* **[needs decision]** — after an empty
  first feed page, `FeedList.tsx:60` polls with `since=""`, the backend treats
  it as no cursor and returns a backward `nextCursor`
  (`FeedController.java:83-94`, `FeedService.java:92`, `:100`), and
  `FeedList.tsx:107-108` adopts it as the forward one, walking deep history
  and delaying new public lines past ADR-0060's 60 s. Ignore the cursor on a
  cursor-less poll, or return a forward cursor for a since-less read.
- **COULD-79** *(confirmed 2026-10-27)* — domain timestamps still bypass the
  injected `Clock` after 8.5 task 20 (which took COULD-60): `Instant.now()`
  in `catalog/domain/Beer.java:56`, `Brewery.java:48` and
  `EventPublicationResubmission.java:66`, and Hibernate VM timestamps in
  `Profile.java:35-39` and `FeedLine.java:57-61`.
- **COULD-81** *(confirmed 2026-10-27)* **[needs decision]** — `ProfileApi`
  publishes usernames only through cellar visibility
  (`ProfileApi.java:25-37`, `ProfileService.java:25-44`), which the feed
  uses as its only actor lookup (`FeedService.java:139-151`); any future
  event not about a cellar cannot name a private-cellar user without
  reshaping the API. Record it as a constraint on new event types, or split
  a username lookup from a visibility predicate first.
- **COULD-83** *(confirmed 2026-10-27)* **[needs decision]** — never-delete
  decisions are stacking up ahead of account deletion: usernames (ADR-0080),
  `contributor_id` (ADR-0091) and `feed.line.user_id` (ADR-0058) are kept
  forever by design, while `docs/tasks/backlog.md` lists GDPR account
  deletion as needed before store release. Record a tombstone or
  pseudonymisation strategy now, or accept the rework when deletion lands.
- **COULD-95** *(confirmed 2026-10-30)* — the 409 a second lost cellar write
  answers (ADR-0057, `CellarService.addBottles`/`updateBottle`/`removeBottle`)
  reaches the user as the generic failure: `features/cellar/api.ts` throws
  for every status but the success one, and no cellar string or test mentions
  a conflict. Offer "someone changed this cellar, reload and try again" once
  iteration 12's replayed writes make it ordinary. Deferred in PR #398.
- **COULD-97** *(confirmed 2026-10-30)* — a `415`/`406` is Boot's
  `problem+json` but no operation lists it, though `ApiErrorDocumentationIT`
  fails an operation that lists none of its others, so the generated client
  cannot type it. List it on body-taking operations, or record why the
  contract leaves it out. Deferred in PR #425.
- **COULD-98** *(confirmed 2026-10-30)* — the duplicate-brewery path reads
  the brewery twice: `ContributionService.newBrewery` finds the id with
  `findIdBySameNameAndCountryCode`, then loads the row with `findById` for
  the name and country the 409 carries. A projection returning those fields
  does it in one query. Deferred in PR #425.
- **COULD-99** *(confirmed 2026-10-30)* — `make moderate` has no way to look
  before it acts: `scripts/moderate-contributor.sql` runs in one transaction
  and commits, over every row a contributor added, so a mistyped `WHO` or
  `ACTION` is only undone by a second run. A `DRY_RUN=1` that rolls back and
  prints the same counts. Related to SHOULD-80. Deferred in PR #452.
  *Kept out of iteration 10 by the product owner (2026-11-01): an admin page
  planned for a later iteration replaces the SQL script, and this is fixed
  there.*
- **COULD-100** *(confirmed 2026-10-30)* — three small gaps around the
  committed spec. `backend/openapi.json` carries the OAuth URLs built from the
  Keycloak issuer setting, so a developer whose environment overrides it fails
  `CommittedOpenApiSpecIT` without a contract change: drop or normalise
  `components.securitySchemes.oauth2.flows` in the IT's canonical form. The IT
  reads `openapi.json` relative to the working directory, which is `backend/`
  only under Maven: resolve it from the module root. And CI's change filter
  does not select `api-breaking-change` when only
  `scripts/check-api-breaking.mjs` changes, so a broken wrapper is found on the
  next spec change: add the script to the backend filter. Deferred in the
  iteration 9 task 09 pull request.
- **COULD-106** *(confirmed 2026-11-01)* — the Android end-to-end job's build
  step is 8–12 minutes whatever Gradle's cache holds. Its dependency
  resolution and daemon start are about two of them and the Gradle cache
  restores in 14 s without moving the total beyond the run-to-run spread (7:51
  and 12:27 cold, 9:17 and 9:43 with the cache). About six minutes are CMake
  configuring and compiling React Native's native libraries once per module
  (screens, worklets, reanimated, gesture-handler, expo-modules-core, then the
  app), and Gradle's build cache does not cover those tasks. Candidates: ccache
  keyed on the native sources, or caching the `.cxx` directories with Gradle's
  task history. Either is new tooling with a stale-build risk, so it needs an
  ADR-sized look before a task. Found in iteration 10 task 07.

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
- ~~MUST-2~~ (`docs/architecture.md` §5 claimed one route handler when a second, intentionally unauthenticated one exists) — lifted into [iteration-5.5 task 01](iteration-5.5/01-documentation-accuracy-sweep.md).
- ~~SHOULD-1~~ (catalog search: leading-wildcard name search and non-functional style/country indexes) — lifted into [iteration-5.5 task 04](iteration-5.5/04-catalog-search-usable-indexes.md).
- ~~SHOULD-2~~ (`searchBeers` has no direct unit test) — lifted into [iteration-5.5 task 05](iteration-5.5/05-catalog-search-test-gaps.md).
- ~~SHOULD-4~~ (`backend/README.md` fully restates the logging conventions ADR-0013 says it should only summarize) — lifted into [iteration-5.5 task 01](iteration-5.5/01-documentation-accuracy-sweep.md).
- ~~SHOULD-5~~ (Iteration DoD gate restated near-verbatim in `docs/roadmap.md` and CLAUDE.md) — lifted into [iteration-5.5 task 01](iteration-5.5/01-documentation-accuracy-sweep.md).
- ~~SHOULD-6~~ (`backend/README.md` bounded-parameters bullet carries unlinked multi-line "why" rationale) — lifted into [iteration-5.5 task 01](iteration-5.5/01-documentation-accuracy-sweep.md). Confirmed 2026-08-23: this finding's Lombok half is already resolved (that bullet is now one line); only the bounded-parameters half survived into the task.
- ~~SHOULD-8~~ (concurrent first-ever sign-in can create two user records for one Keycloak subject) — lifted into [iteration-5.5 task 03](iteration-5.5/03-fix-concurrent-first-sign-in-race.md).
- ~~SHOULD-9~~ (ADR-0016's CSP `unsafe-inline` revisit trigger fired and nothing revisited it) — `[needs decision]` resolved by the product owner on 2026-08-23: re-affirm `'unsafe-inline'` rather than adopt nonce-based CSP or SRI. Lifted into [iteration-5.5 task 02](iteration-5.5/02-amend-csp-unsafe-inline-adr.md).
- ~~SHOULD-10~~ (removing a cellar entry's last bottle leaves a zero-bottle row behind forever) — **not** lifted into iteration 5.5: confirmed 2026-08-23 that [iteration-6 task 06](iteration-6/06-entry-with-no-bottles.md), already drafted, covers this more thoroughly and correctly ties it to that iteration's public-cellar-read work. Superseded by that task rather than duplicated.
- ~~SHOULD-11~~ (task 01's `cellar/web` checkbox was ticked before the package existed) — resolved: confirmed 2026-08-23 that `backend/src/main/java/fi/kalia/cellar/web/` now exists (created by iteration-5 task 02's implementation), so the checked criterion is now true. No task needed.
- ~~COULD-1~~ (orval version duplicated and drifted between `README.md`, ADR-0012 and `package.json`) — lifted into [iteration-5.5 task 01](iteration-5.5/01-documentation-accuracy-sweep.md). Confirmed 2026-08-23: the drift widened further (README/package.json now at 8.24, ADR-0012 still 8.22.0).
- ~~COULD-2~~ (WCAG 2.1 AA enforcement described in three places) — lifted into [iteration-5.5 task 01](iteration-5.5/01-documentation-accuracy-sweep.md).
- ~~COULD-3~~ (DDD-lite package structure restated in three places) — lifted into [iteration-5.5 task 01](iteration-5.5/01-documentation-accuracy-sweep.md).
- ~~COULD-4~~ (`listBreweries()` unpaginated, loads and sorts the full table) — lifted into [iteration-5.5 task 07](iteration-5.5/07-catalog-api-hardening.md).
- ~~COULD-5~~ (`LocaleSwitcher` uses an unvalidated `as Locale` assertion) — lifted into [iteration-5.5 task 09](iteration-5.5/09-validate-locale-switcher-input.md).
- ~~COULD-6~~ (`CatalogApiIT` has no sort-by-`style` test) — lifted into [iteration-5.5 task 05](iteration-5.5/05-catalog-search-test-gaps.md).
- ~~COULD-7~~ (`CatalogController` constructs the domain-layer `BeerSearchCriteria` directly) — `[needs decision]` resolved by the product owner on 2026-08-23: fix now, together with COULD-11, rather than defer. Lifted into [iteration-5.5 task 06](iteration-5.5/06-catalog-module-edge-layering.md).
- ~~COULD-8~~ (`sort` query parameter accepts and silently truncates trailing garbage) — lifted into [iteration-5.5 task 07](iteration-5.5/07-catalog-api-hardening.md).
- ~~COULD-9~~ (springdoc production-exposure default untested) — lifted into [iteration-5.5 task 08](iteration-5.5/08-pin-springdoc-exposure-default.md).
- ~~COULD-10~~ (`docs/architecture.md`'s hand-maintained module diagram has no drift detection) — `[needs decision]` resolved by the product owner on 2026-08-23: generate-and-assert in a test, keeping the hand-written mermaid diagram as the document readers see. Lifted into [iteration-5.5 task 10](iteration-5.5/10-detect-module-diagram-drift.md).
- ~~COULD-11~~ (`CatalogApi` injects the domain-layer `BeerRepository` directly into the module's public API) — lifted into [iteration-5.5 task 06](iteration-5.5/06-catalog-module-edge-layering.md), together with COULD-7.
- ~~COULD-12~~ (`docker-compose.yml`'s backend port comment still says the API is unauthenticated) — lifted into [iteration-5.5 task 01](iteration-5.5/01-documentation-accuracy-sweep.md).
- ~~COULD-13~~ (`docs/tasks/backlog.md` defers a logging item on a reason that stopped being true in iteration 3) — lifted into [iteration-5.5 task 01](iteration-5.5/01-documentation-accuracy-sweep.md).
- ~~COULD-14~~ (task 02 pointed at a "task 01 question 6" that no longer exists) — resolved: confirmed 2026-08-23 that the dangling reference has already been reworded away in a later PR. No task needed.
- ~~COULD-15~~ (`Entry.addBottles` had no upper bound on bulk-add quantity) — resolved: confirmed 2026-08-23 that `AddBottleRequestDto` already bounds `quantity` with `@Min(1)`/`@Max(24)`. No task needed.
- ~~MUST-3~~ (the `CurrentUserService`-injection convention in `backend/README.md` has zero production instances and every cross-module consumer does the opposite) — lifted into [iteration-6.5 task 13](iteration-6.5/13-align-current-user-service-convention.md). `[needs decision]` resolved by the product owner on 2026-09-04: rewrite the convention to match the code, not the reverse.
- ~~MUST-5~~ (`docs/architecture.md` §4 says the frontend "may later" generate its API client while §5 documents that it already does, committed and drift-checked) — lifted into [iteration-6.5 task 14](iteration-6.5/14-fix-api-client-doc-contradiction.md).
- ~~MUST-7~~ (price listed as a *built* search filter in `docs/architecture.md` §1 and `README.md` though the API has no price parameter) — retired into [iteration-6.5 task 10](iteration-6.5/10-remove-beer-price.md): that task removes price entirely and its doc sweep now names both locations explicitly. Superseded by that task rather than lifted separately, the same way SHOULD-10 was.
- ~~MUST-8~~ (two concurrent "add bottle" requests for the same beer end in a 500 with no bottles persisted, the `entryFor` read-then-insert racing the `UNIQUE (user_id, beer_id)` constraint) — lifted into [iteration-6.5 task 11](iteration-6.5/11-concurrent-add-bottle-race.md). `[needs decision]` resolved by the product owner on 2026-09-04: catch-and-refetch via Spring Retry, not a 409 and not a Postgres `ON CONFLICT` upsert.
- ~~MUST-9~~ ("brewed in the future" judged against the UTC date while the date picker offers the user's local date, blocking a user east of UTC from recording today's bottle in the early hours) — lifted into [iteration-6.5 task 12](iteration-6.5/12-bottle-future-date-uses-local-day.md). `[needs decision]` resolved by the product owner on 2026-09-04: "today" is the client's local day.
- ~~SHOULD-13~~ (per-module `@RestControllerAdvice`s are bare and therefore application-global, so catalog's advice is live on every module's endpoints) — lifted into [iteration-7 task 12](iteration-7/12-scope-exception-advices.md). Re-confirmed 2026-09-12 and lifted then rather than at a later sweep because iteration 7 adds `feed`, the third module to register one.
- ~~SHOULD-14~~ ("DTOs at the API boundary" is the one §3/§4 layering rule with no ArchUnit guard, in an architecture that deliberately hands domain entities outward) — lifted into [iteration-7 task 13](iteration-7/13-guard-dtos-at-the-api-boundary.md). Re-confirmed 2026-09-12; lifted ahead of iteration 7 task 02, the first public endpoint returning many users' data.
- ~~SHOULD-22~~ (search predicates lowercase with the JVM default locale, so `?style=IPA` returns zero rows under a Turkish or Azeri default) — lifted into [iteration-7 task 14](iteration-7/14-catalog-silent-failures.md), merged with SHOULD-23 and COULD-16 at the product owner's instruction to combine similar small findings: all three are in `catalog`, and two of them live in the functions the third says are untested.
- ~~SHOULD-23~~ (a misspelled sort *direction* falls through to `ASC`, so `?sort=abv,dsc` returns 200 sorted the wrong way) — lifted into [iteration-7 task 14](iteration-7/14-catalog-silent-failures.md), merged as above.
- ~~SHOULD-24~~ (the session-cookie lookup prefers the unprefixed name over `__Secure-`, the opposite of Auth.js; once TLS lands, an attacker who can write but not read cookies for the registrable domain makes every backend call carry *their* bearer token) — lifted into [iteration-7 task 15](iteration-7/15-session-cookie-prefers-secure-prefix.md). Re-confirmed 2026-09-12: `SESSION_COOKIE_NAMES` still lists the unprefixed name first.
- ~~COULD-16~~ (the catalog module has no `*Test` files at all, so `mvn test` covers none of its three pieces of pure, framework-free logic) — lifted into [iteration-7 task 14](iteration-7/14-catalog-silent-failures.md), merged as above.
- ~~MUST-4~~ (the root README called `@radix-ui/react-dialog` the one UI dependency while `@radix-ui/react-toast` was a second) — resolved: confirmed 2026-10-14 that `README.md:208-212` names both as "the only two UI dependencies", consistent with `docs/architecture.md` and `web/README.md`. The rationale duplication around them stays open as SHOULD-20.
- ~~MUST-6~~ (the ADR index labelled ADR-0045's link "ADR-0046") — resolved: confirmed 2026-10-14 that `docs/adr/README.md:114` labels it ADR-0045 and a scan of every `[ADR-NNNN]` link across the docs, `CLAUDE.md`, the READMEs and `.claude/` finds no label/target mismatch.
- ~~SHOULD-21~~ (the root README's roadmap-order feature list skipped iteration 6.5) — resolved: confirmed 2026-10-14 that `README.md:132-133` lists iteration 6.5. The same class of gap recurs for iterations 9–14 as SHOULD-53.
- ~~MUST-10~~ (the feed's documented at-least-once delivery was never configured, so a failed listener lost its line and `event_publication` grew forever) — lifted into [iteration-8 task 06](iteration-8/06-feed-events-delivered-at-least-once.md). `[needs decision]` resolved by the product owner on 2026-10-14: republish on restart, scheduled resubmission of stale publications, and a completion mode that prunes.
- ~~MUST-11~~ (`docs/architecture.md` §2's diagram drew a route-handler hop that does not exist and one of seven inter-module edges, and its test checked nodes only) — lifted into [iteration-8 task 14](iteration-8/14-boundary-guards-catch-what-the-docs-claim.md).
- ~~MUST-12~~ (brewery listed as a built search filter that the UI never offered) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~MUST-13~~ (the anonymous-route list stated three times, none matching `SecurityConfig`) — lifted into [iteration-8 task 12](iteration-8/12-public-routes-one-list-pinned-by-a-test.md). Merged with COULD-29.
- ~~MUST-14~~ (iteration 9 scheduled `/breweries` pagination that already exists) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~MUST-15~~ (`docs/ci-playbook.md` told agents to keep versions in the README table, against ADR-0020) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~MUST-16~~ (`backend/README.md`'s hot-reload recipe started the backend container on the port the native run needs) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~SHOULD-12~~ (`docs/architecture.md` named iteration 6.5 as in progress and listed nothing built since) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md). The recurrence cause stays open as SHOULD-59.
- ~~SHOULD-15~~ (`features/cellar` importing the catalog's generated client, invisible to the boundary rule) — lifted into [iteration-8 task 10](iteration-8/10-cellar-reads-joined-in-the-backend.md). Its `[needs decision]` needs no separate answer: moving the join to the backend (SHOULD-35's decision) removes the import.
- ~~SHOULD-17~~ (the two-level bottle model cited to ADR-0006 instead of ADR-0034) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~SHOULD-18~~ (two broken quality-backlog links in the iteration-5.5 index) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~SHOULD-19~~ (§7's testing table omitting `ArchitectureDocumentationTest`) — lifted into [iteration-8 task 14](iteration-8/14-boundary-guards-catch-what-the-docs-claim.md).
- ~~SHOULD-32~~ (in-app links to a public cellar carrying no locale) — lifted into [iteration-8 task 13](iteration-8/13-in-app-links-keep-the-readers-language.md). `[needs decision]` resolved by the product owner on 2026-10-14: in-app links carry the current locale; the copied address stays locale-less (an ADR-0050 amendment).
- ~~SHOULD-33~~ (the front page's feed showing "Nothing here yet" while public lines exist) — lifted into [iteration-8 task 07](iteration-8/07-front-page-feed-reaches-public-lines.md). `[needs decision]` resolved by the product owner on 2026-10-14: the backend fills the page.
- ~~SHOULD-34~~ (the anonymous public cellar making one `getBeer` call per entry) — lifted into [iteration-8 task 10](iteration-8/10-cellar-reads-joined-in-the-backend.md).
- ~~SHOULD-35~~ (the cellar↔catalog join living in the frontend, so every client would re-implement it) — lifted into [iteration-8 task 10](iteration-8/10-cellar-reads-joined-in-the-backend.md). `[needs decision]` resolved by the product owner on 2026-10-14: the backend returns the joined cellar through `CatalogApi`.
- ~~SHOULD-36~~ (the catalog search form sending values the API answers with a 400) — lifted into [iteration-8 task 08](iteration-8/08-catalog-search-bounded-end-to-end.md).
- ~~SHOULD-37~~ (the username lookup on an anonymous route unindexed and its path variable unbounded) — lifted into [iteration-8 task 09](iteration-8/09-a-username-is-a-permanent-address.md).
- ~~SHOULD-38~~ (usernames not unique, so a reclaimed name redirects old feed links to a new person) — lifted into [iteration-8 task 09](iteration-8/09-a-username-is-a-permanent-address.md). `[needs decision]` resolved by the product owner on 2026-10-14: unique, and a deleted account's username is never reused.
- ~~SHOULD-39~~ (the cellar sign-in open-redirect guard untested) — lifted into [iteration-8 task 11](iteration-8/11-the-bff-forwards-only-what-it-checked.md).
- ~~SHOULD-41~~ (ADR-0053 never amended for `BottleAdded` carrying the editable `brewedDate`) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~SHOULD-42~~ (`moduleRootReachesDomainThroughApplication` passing a root that reaches `domain` directly alongside `application`) — lifted into [iteration-8 task 14](iteration-8/14-boundary-guards-catch-what-the-docs-claim.md).
- ~~SHOULD-43~~ (`profile`'s retries enabled only by a configuration class inside `cellar`) — lifted into [iteration-8 task 15](iteration-8/15-backend-services-own-their-cross-cutting-setup.md).
- ~~SHOULD-44~~ (the feed's `MAX_SIZE` tied to two private batch caps by a comment) — lifted into [iteration-8 task 07](iteration-8/07-front-page-feed-reaches-public-lines.md).
- ~~SHOULD-46~~ (cellar and beer route strings built separately in several features) — lifted into [iteration-8 task 13](iteration-8/13-in-app-links-keep-the-readers-language.md).
- ~~SHOULD-48~~ (the frontend import-boundary rules having no violating fixture) — lifted into [iteration-8 task 14](iteration-8/14-boundary-guards-catch-what-the-docs-claim.md).
- ~~SHOULD-49~~ (feed-line fields and `startOver` missing from `docs/architecture.md` and the glossary) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~SHOULD-50~~ (the backend module list restated and drifted across three READMEs) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~SHOULD-51~~ ("JUnit 5" where Jupiter 6 runs) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~SHOULD-52~~ (wrong rule counts and fixture scope for `ArchitectureRulesRejectViolationsTest`) — lifted into [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md).
- ~~COULD-17~~ (`MAX_PAGE` × `MAX_PAGE_SIZE` allowing an anonymous `OFFSET 1_000_000`) — lifted into [iteration-8 task 08](iteration-8/08-catalog-search-bounded-end-to-end.md). `[needs decision]` resolved by the product owner on 2026-10-14: lower `MAX_PAGE`.
- ~~COULD-19~~ (an access token with no recorded expiry treated as fresh forever) — lifted into [iteration-8 task 11](iteration-8/11-the-bff-forwards-only-what-it-checked.md).
- ~~COULD-28~~ (generated-client path parameters interpolated unencoded, with the caller's token attached) — lifted into [iteration-8 task 11](iteration-8/11-the-bff-forwards-only-what-it-checked.md).
- ~~COULD-29~~ (no test pinning which routes are reachable without a token) — lifted into [iteration-8 task 12](iteration-8/12-public-routes-one-list-pinned-by-a-test.md).
- ~~COULD-31~~ (the "no empty entry" rule re-checked inconsistently across tiers) — lifted into [iteration-8 task 10](iteration-8/10-cellar-reads-joined-in-the-backend.md).
- ~~COULD-32~~ (`ProfileService.isCellarPublic` referenced only by tests) — lifted into [iteration-8 task 15](iteration-8/15-backend-services-own-their-cross-cutting-setup.md).
- ~~COULD-33~~ (read methods of `CellarService` and `ProfileService` opening read-write transactions) — lifted into [iteration-8 task 15](iteration-8/15-backend-services-own-their-cross-cutting-setup.md).
- ~~COULD-34~~ (the future-date check reading the JVM's default clock and zone) — lifted into [iteration-8 task 15](iteration-8/15-backend-services-own-their-cross-cutting-setup.md).
- ~~COULD-37~~ (switching language dropping the current search) — lifted into [iteration-8 task 13](iteration-8/13-in-app-links-keep-the-readers-language.md).
- ~~SHOULD-28~~ (the Trivy action's pinned SHA said to mismatch its `v0.36.0` comment) — no longer reproduces, and never did: confirmed 2026-10-24 with `git ls-remote` that `v0.36.0` is an annotated tag whose object is `a9c7b0f…` and whose commit is `ed142fd…`, the SHA the workflow pins. The inaccuracy is in ADR-0024's record, kept open as COULD-57.
- ~~COULD-35~~ (the front and profile pages counting bottles through the catalog-joining read) — no longer reproduces: since ADR-0083 `listCellarEntries` and `heldBottlesByBeer` share one backend-joined `readEntries()` call (`web/features/cellar/api.ts:14-30`), so the two cost the same and cannot disagree. Confirmed 2026-10-24.
- ~~MUST-17~~ (the glossary contradicting iteration 8's cellar and profile shapes) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~MUST-18~~ (the sign-up limiter able to create a counter with no expiry) — lifted into [iteration-8.5 task 09](iteration-8.5/09-sign-up-limiter-cannot-lock-forever.md).
- ~~SHOULD-16~~ (no policy for a catalog beer that disappears from under cellar entries) — lifted into [iteration-8.5 task 12](iteration-8.5/12-user-added-catalog-entries-governed.md).
- ~~SHOULD-20~~ (the Radix rationale stated in four disagreeing places) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~SHOULD-25~~ (the dev compose and realm files doubling as the only deployment definition) — lifted into [iteration-8.5 task 13](iteration-8.5/13-sessions-and-stack-credentials-hardened.md).
- ~~SHOULD-26~~ (Valkey holding every session unauthenticated) — lifted into [iteration-8.5 task 13](iteration-8.5/13-sessions-and-stack-credentials-hardened.md).
- ~~SHOULD-27~~ (the unauthenticated edges, registration included, unthrottled and unbounded) — lifted into [iteration-8.5 task 10](iteration-8.5/10-unauthenticated-edges-throttled.md).
- ~~SHOULD-29~~ (`CatalogController`'s GET handlers documenting no response codes) — lifted into [iteration-8.5 task 01](iteration-8.5/01-api-errors-complete-and-typed.md).
- ~~SHOULD-30~~ (`HttpBoundaryTest` not seeing advice methods) — lifted into [iteration-8.5 task 01](iteration-8.5/01-api-errors-complete-and-typed.md).
- ~~SHOULD-31~~ (CLAUDE.md over its 200-line budget) — lifted into [iteration-8.5 task 08](iteration-8.5/08-claude-md-within-its-budget.md).
- ~~SHOULD-40~~ (`profile` decoding the token itself) — lifted into [iteration-8.5 task 07](iteration-8.5/07-identity-owns-the-caller.md).
- ~~SHOULD-45~~ (the public-cellar visibility rule in the web layer) — lifted into [iteration-8.5 task 07](iteration-8.5/07-identity-owns-the-caller.md).
- ~~SHOULD-47~~ (the feed cursor's per-process signing key) — lifted into [iteration-8.5 task 04](iteration-8.5/04-no-silent-single-instance-assumptions.md).
- ~~SHOULD-53~~ (the README's feature list omitting iterations 10–14) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~SHOULD-54~~ (`--wait` with `keycloak-config` contradicting the playbook) — lifted into [iteration-8.5 task 18](iteration-8.5/18-process-records-and-skills-match-practice.md).
- ~~SHOULD-55~~ (the per-issue Definition of Done stated twice) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~SHOULD-56~~ (no CI check blocking a merge) — lifted into [iteration-8.5 task 17](iteration-8.5/17-ci-enforces-the-gate.md).
- ~~SHOULD-57~~ (fixed host ports leaving the Docker gate unrun) — lifted into [iteration-8.5 task 17](iteration-8.5/17-ci-enforces-the-gate.md).
- ~~SHOULD-58~~ (gate verdicts with no slot in the PR template) — lifted into [iteration-8.5 task 18](iteration-8.5/18-process-records-and-skills-match-practice.md).
- ~~SHOULD-59~~ (the iteration-close checklist naming only the roadmap) — lifted into [iteration-8.5 task 18](iteration-8.5/18-process-records-and-skills-match-practice.md).
- ~~SHOULD-60~~ (CLAUDE.md stating only ADR-0032's first test) — lifted into [iteration-8.5 task 08](iteration-8.5/08-claude-md-within-its-budget.md).
- ~~SHOULD-61~~ (the brewery list sorting the whole table in Java) — lifted into [iteration-8.5 task 15](iteration-8.5/15-catalog-reads-hold-at-imported-size.md).
- ~~SHOULD-62~~ (the glossary restating module dependencies) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~SHOULD-63~~ (error bodies not matching the spec, and the field-error DTO defined twice) — lifted into [iteration-8.5 task 01](iteration-8.5/01-api-errors-complete-and-typed.md).
- ~~SHOULD-64~~ (`GET /beers/batch` with no consumer) — lifted into [iteration-8.5 task 02](iteration-8.5/02-api-contract-pruned-before-it-freezes.md).
- ~~SHOULD-65~~ (an unlisted country code showing the error page) — lifted into [iteration-8.5 task 20](iteration-8.5/20-small-correctness-fixes.md).
- ~~SHOULD-66~~ (the public-cellar read unbounded by what one account stores) — lifted into [iteration-8.5 task 11](iteration-8.5/11-one-account-cannot-inflate-an-anonymous-read.md).
- ~~SHOULD-67~~ (user-added catalog entries with no limit, review or removal) — lifted into [iteration-8.5 task 12](iteration-8.5/12-user-added-catalog-entries-governed.md).
- ~~COULD-18~~ (`nosniff` missing and `X-Powered-By` sent) — lifted into [iteration-8.5 task 10](iteration-8.5/10-unauthenticated-edges-throttled.md).
- ~~COULD-20~~ (a caller-supplied `Authorization` header overriding the session's) — lifted into [iteration-8.5 task 06](iteration-8.5/06-generated-client-ready-to-share.md).
- ~~COULD-21~~ (`.trivyignore` expiries Trivy cannot enforce) — lifted into [iteration-8.5 task 14](iteration-8.5/14-cve-gate-and-updates-trustworthy.md).
- ~~COULD-22~~ (`jose` missing from the README's tech stack) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-23~~ (the README's "planned" repository layout) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-24~~ (the ADR index's stale ADR-0021 gloss) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-25~~ (the ADR index's stale auth-group count) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-27~~ (a one-off `document-title` axe report on the profile page) — lifted into [iteration-8.5 task 17](iteration-8.5/17-ci-enforces-the-gate.md).
- ~~COULD-30~~ (a concurrent add lost to the last-bottle delete's cascade) — lifted into [iteration-8.5 task 03](iteration-8.5/03-concurrent-bottle-writes-lose-nothing.md).
- ~~COULD-36~~ (feed timestamps never updating) — lifted into [iteration-8.5 task 20](iteration-8.5/20-small-correctness-fixes.md).
- ~~COULD-38~~ (accepted ADRs citing the removed store and false compose facts) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-39~~ (§5's "`kaliaFetch` directly" and the front page's markup in its route) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-40~~ (`GET /me` returning email and name with no consumer) — lifted into [iteration-8.5 task 02](iteration-8.5/02-api-contract-pruned-before-it-freezes.md).
- ~~COULD-41~~ (orval generating hooks nothing may use, and no `server-only` marker — the client switch was declined at refinement; the marker is in the task) — lifted into [iteration-8.5 task 06](iteration-8.5/06-generated-client-ready-to-share.md).
- ~~COULD-42~~ (the ADR index citing `useCellarBottles`) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-43~~ (the README's stale Next.js re-test note) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-44~~ (the README restating base-image tags and Gmail quotas) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-45~~ (the README's "CI on every push") — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-46~~ ("five" `AUTH_*` values where there are six) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-47~~ (stale counts in the 7.5 and 6.5 indexes) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-48~~ (stale items in `docs/tasks/backlog.md`) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-49~~ (the PR template's stale examples and doc-sync list) — lifted into [iteration-8.5 task 18](iteration-8.5/18-process-records-and-skills-match-practice.md).
- ~~COULD-50~~ (the sign-up limit stated four times) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-51~~ (the worktree skill not installing `node_modules`) — lifted into [iteration-8.5 task 18](iteration-8.5/18-process-records-and-skills-match-practice.md).
- ~~COULD-52~~ (`make verify` claiming to run the Trivy scan) — lifted into [iteration-8.5 task 14](iteration-8.5/14-cve-gate-and-updates-trustworthy.md).
- ~~COULD-53~~ (the refinement skills' missing CVE-fix carve-out) — lifted into [iteration-8.5 task 18](iteration-8.5/18-process-records-and-skills-match-practice.md).
- ~~COULD-54~~ (no playbook entry for the profile-visibility flake) — lifted into [iteration-8.5 task 17](iteration-8.5/17-ci-enforces-the-gate.md).
- ~~COULD-55~~ (three process citations pointing at nothing) — lifted into [iteration-8.5 task 18](iteration-8.5/18-process-records-and-skills-match-practice.md).
- ~~COULD-56~~ (merged worktrees never removed) — lifted into [iteration-8.5 task 18](iteration-8.5/18-process-records-and-skills-match-practice.md).
- ~~COULD-57~~ (ADR-0024 recording the Trivy tag object's SHA) — lifted into [iteration-8.5 task 14](iteration-8.5/14-cve-gate-and-updates-trustworthy.md).
- ~~COULD-58~~ (any feature able to import any tag's generated models) — lifted into [iteration-8.5 task 06](iteration-8.5/06-generated-client-ready-to-share.md).
- ~~COULD-59~~ (redundant indexes on `feed.line` and `cellar.entry`) — lifted into [iteration-8.5 task 15](iteration-8.5/15-catalog-reads-hold-at-imported-size.md).
- ~~COULD-60~~ (domain timestamps bypassing the injected `Clock`) — lifted into [iteration-8.5 task 20](iteration-8.5/20-small-correctness-fixes.md).
- ~~COULD-62~~ (`GET /styles` scanning every beer) — lifted into [iteration-8.5 task 15](iteration-8.5/15-catalog-reads-hold-at-imported-size.md).
- ~~COULD-63~~ (invisible and bidi characters in names, and no NFKC in `fold_name`) — lifted into [iteration-8.5 task 12](iteration-8.5/12-user-added-catalog-entries-governed.md).
- ~~COULD-64~~ (signing in while signed in keeping the previous user's tokens) — lifted into [iteration-8.5 task 13](iteration-8.5/13-sessions-and-stack-credentials-hardened.md).
- ~~COULD-65~~ (an access token outliving sign-out by up to its lifespan) — accepted as an [architecture §8](../architecture.md#8-trade-offs-made-explicit) trade-off by [ADR-0095](../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md), decided in [iteration-9 task 05](iteration-9/05-decision-mobile-authentication.md).
- ~~COULD-66~~ (Dependabot not covering Docker images) — lifted into [iteration-8.5 task 14](iteration-8.5/14-cve-gate-and-updates-trustworthy.md).
- ~~COULD-67~~ (a quay.io pull failure turning E2E red with no retry) — lifted into [iteration-8.5 task 17](iteration-8.5/17-ci-enforces-the-gate.md).
- ~~COULD-68~~ (CLAUDE.md calling the sweep four-dimension) — lifted into [iteration-8.5 task 08](iteration-8.5/08-claude-md-within-its-budget.md).
- ~~COULD-69~~ (the CI playbook restating fixes and miscounting containers) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-70~~ (`postgres:18.4` pinned in `docs/architecture.md` prose) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-71~~ (the catalog's size stated three times) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-72~~ (the ADR index's ordering) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~MUST-19~~ (frontend route-handler list omits the metrics route) — lifted into [iteration-9 task 18](iteration-9/18-docs-match-iteration-8-5.md).
- ~~MUST-20~~ (`web/README.md` generate step starts the wrong services) — lifted into [iteration-9 task 18](iteration-9/18-docs-match-iteration-8-5.md).
- ~~MUST-21~~ (query strings and an ID token reach the edge, Keycloak and mutator logs) — lifted into [iteration-9 task 20](iteration-9/20-no-token-or-query-string-in-a-log.md).
- ~~MUST-22~~ (text-blocks rule has no checker and keeps being broken) — lifted into [iteration-9 task 19](iteration-9/19-review-feedback-outlives-its-pr.md). Its `[needs decision]` is the task's open question 1, settled at refinement.
- ~~MUST-23~~ (concurrent first profile reads race the username reservation) — lifted into [iteration-9 task 16](iteration-9/16-first-profile-reads-never-race.md).
- ~~SHOULD-79~~ (public cellar paged and totalled before withholding pending beers) — lifted into [iteration-9 task 21](iteration-9/21-public-cellar-response-settled-before-the-freeze.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-81~~ (§9 files ADR-0087–0090 under the wrong subject) — lifted into [iteration-9 task 18](iteration-9/18-docs-match-iteration-8-5.md).
- ~~SHOULD-82~~ (docs say `docker-compose.yml` pins images it no longer pins) — lifted into [iteration-9 task 18](iteration-9/18-docs-match-iteration-8-5.md).
- ~~SHOULD-83~~ (root README omits iteration 8.5's pieces) — lifted into [iteration-9 task 18](iteration-9/18-docs-match-iteration-8-5.md).
- ~~SHOULD-85~~ (public cellar breaks the one pagination envelope) — lifted into [iteration-9 task 21](iteration-9/21-public-cellar-response-settled-before-the-freeze.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-86~~ (ADR-0028 still states `GET /api/v1/me` as current) — lifted into [iteration-9 task 18](iteration-9/18-docs-match-iteration-8-5.md).
- ~~SHOULD-88~~ (red `dev` runs after a merge are never logged) — lifted into [iteration-9 task 17](iteration-9/17-dev-stays-green-and-its-failures-are-logged.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-89~~ (PRs merge without CI against the current `dev`) — lifted into [iteration-9 task 17](iteration-9/17-dev-stays-green-and-its-failures-are-logged.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-90~~ (a `/code-review` "new task" finding has no home) — lifted into [iteration-9 task 19](iteration-9/19-review-feedback-outlives-its-pr.md).
- ~~SHOULD-68~~ (any signed-in user reading `/actuator/prometheus`) — lifted into [iteration-10 task 10](iteration-10/10-the-edge-serves-only-what-a-client-needs.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-69~~ (Keycloak's master realm served on the public edge) — lifted into [iteration-10 task 10](iteration-10/10-the-edge-serves-only-what-a-client-needs.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-70~~ (Mailpit, SMTP defaults and loopback ports in the deployable base) — lifted into [iteration-10 task 11](iteration-10/11-the-deployable-stack-carries-no-dev-convenience.md).
- ~~SHOULD-71~~ (the Keycloak and pulled images never scanned) — lifted into [iteration-10 task 12](iteration-10/12-every-image-the-stack-runs-is-scanned.md).
- ~~SHOULD-72~~ (another contributor's pending beer blocking an identical one) — lifted into [iteration-10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-73~~ (the pending-cap 429 shown as a generic failure) — lifted into [iteration-10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
- ~~SHOULD-74~~ (a concurrent bottle remove or update answering 500) — lifted into [iteration-10 task 13](iteration-10/13-cellar-survives-a-concurrent-change.md).
- ~~SHOULD-75~~ (holders adding bottles to a rejected or removed beer) — lifted into [iteration-10 task 15](iteration-10/15-a-withheld-beer-is-withheld-consistently.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-76~~ (rejection publishing what review withheld) — lifted into [iteration-10 task 15](iteration-10/15-a-withheld-beer-is-withheld-consistently.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-77~~ (the backend and Keycloak sharing the Postgres superuser) — lifted into [iteration-10 task 11](iteration-10/11-the-deployable-stack-carries-no-dev-convenience.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-78~~ (the unbounded owner cellar read loaded on every signed-in page) — lifted into [iteration-10 task 14](iteration-10/14-the-owner-cellar-read-is-bounded.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-84~~ (the README's architecture diagram restating §2) — lifted into [iteration-10 task 18](iteration-10/18-each-fact-kept-once.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-87~~ (the feature list kept four times) — lifted into [iteration-10 task 18](iteration-10/18-each-fact-kept-once.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-91~~ (the worktree skill's teardown steps not running) — lifted into [iteration-10 task 20](iteration-10/20-process-records-match-practice.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-92~~ (a withheld beer's details link 404ing) — lifted into [iteration-10 task 15](iteration-10/15-a-withheld-beer-is-withheld-consistently.md).
- ~~SHOULD-93~~ (the add-beer flow calling a pending beer public) — lifted into [iteration-10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
- ~~SHOULD-94~~ (the code-comment policy not reaching `mobile/`) — lifted into [iteration-10 task 09](iteration-10/09-the-checks-reach-mobile.md).
- ~~SHOULD-95~~ (anonymous app calls failing with a failed refresh) — lifted into [iteration-10 task 08](iteration-10/08-the-app-survives-a-token-it-cannot-use.md).
- ~~SHOULD-96~~ (the Android end-to-end check failing on a sick emulator) — lifted into [iteration-10 task 07](iteration-10/07-mobile-e2e-fails-only-when-the-app-does.md).
- ~~COULD-61~~ (`AddBeerDialog` holding five concerns) — lifted into [iteration-10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
- ~~COULD-73~~ (a cross-site callback link signing the visitor out) — lifted into [iteration-10 task 17](iteration-10/17-web-sign-in-is-one-helper.md).
- ~~COULD-74~~ (the back-channel logout endpoint published on the edge) — lifted into [iteration-10 task 10](iteration-10/10-the-edge-serves-only-what-a-client-needs.md).
- ~~COULD-76~~ (the public cellar's two reads racing a last-bottle delete) — lifted into [iteration-10 task 13](iteration-10/13-cellar-survives-a-concurrent-change.md).
- ~~COULD-78~~ (the feed actions' stale cursor-key comment) — lifted into [iteration-10 task 19](iteration-10/19-docs-and-comments-say-what-is-true.md).
- ~~COULD-80~~ (the client accepting `\p{Cf}` the server refuses) — lifted into [iteration-10 task 16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md).
- ~~COULD-82~~ (sign-in implemented four times) — lifted into [iteration-10 task 17](iteration-10/17-web-sign-in-is-one-helper.md).
- ~~COULD-84~~ (§3 understating what `fi.kalia.web` holds) — lifted into [iteration-10 task 19](iteration-10/19-docs-and-comments-say-what-is-true.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-85~~ (§5 omitting the cellar's `public-cellar` tag exception) — lifted into [iteration-10 task 19](iteration-10/19-docs-and-comments-say-what-is-true.md).
- ~~COULD-86~~ (the cellar action building its route by hand) — lifted into [iteration-10 task 17](iteration-10/17-web-sign-in-is-one-helper.md).
- ~~COULD-87~~ (ADR-0007 citing dropped store modules) — lifted into [iteration-10 task 19](iteration-10/19-docs-and-comments-say-what-is-true.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-88~~ (smaller doc staleness) — lifted into [iteration-10 task 19](iteration-10/19-docs-and-comments-say-what-is-true.md).
- ~~COULD-89~~ (the edge rate and pending cap restated outside their homes) — lifted into [iteration-10 task 18](iteration-10/18-each-fact-kept-once.md).
- ~~COULD-90~~ (the PR template's unfillable required-checks clause) — lifted into [iteration-10 task 20](iteration-10/20-process-records-match-practice.md).
- ~~COULD-91~~ (PRs that only tick after-merge criteria) — lifted into [iteration-10 task 20](iteration-10/20-process-records-match-practice.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-92~~ (no playbook entry for Trivy's Java DB mirror 404) — lifted into [iteration-10 task 12](iteration-10/12-every-image-the-stack-runs-is-scanned.md).
- ~~COULD-93~~ (`CLAUDE.md` at 199 of 200 lines) — closed by [iteration-10 task 20](iteration-10/20-process-records-match-practice.md): waiting. `CLAUDE.md` is at 197 of 200 lines, and [ADR-0048](../adr/0048-what-survives-a-claude-md-bullet.md) reopens the checker question on its third overrun, which has not happened.
- ~~COULD-94~~ (the Copilot review rule that never runs) — lifted into [iteration-10 task 20](iteration-10/20-process-records-match-practice.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-96~~ (bottles added together reading back in no fixed order) — lifted into [iteration-10 task 13](iteration-10/13-cellar-survives-a-concurrent-change.md).
- ~~COULD-101~~ (Dependabot bumping Expo-managed packages one at a time) — lifted into [iteration-10 task 09](iteration-10/09-the-checks-reach-mobile.md).
- ~~COULD-102~~ (the app never reacting to a `401`) — lifted into [iteration-10 task 08](iteration-10/08-the-app-survives-a-token-it-cannot-use.md).
- ~~COULD-104~~ (no cache for Maestro or Gradle in the Android job) — lifted into [iteration-10 task 07](iteration-10/07-mobile-e2e-fails-only-when-the-app-does.md).
- ~~COULD-105~~ (the Catalog flow naming a beer that happens to sort first) — lifted into [iteration-10 task 07](iteration-10/07-mobile-e2e-fails-only-when-the-app-does.md).
