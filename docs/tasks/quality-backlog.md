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

- **MUST-10** *(confirmed 2026-10-14)* **[needs decision]** — the feed's
  at-least-once delivery is documented but not configured.
  `docs/architecture.md:229-231`, ADR-0058:35-41 and the comment at
  `backend/src/main/java/fi/kalia/feed/application/FeedService.java:42-44`
  rely on Spring Modulith redelivering a failed publication, but
  `backend/src/main/resources/application.properties` sets no
  `spring.modulith.events.*` key (`republish-outstanding-events-on-restart`
  defaults to `false`) and nothing uses `IncompleteEventPublications`. One
  failed `FeedEventListener.on` (`feed/application/FeedEventListener.java:17-21`),
  for example on a database hiccup, loses that feed line for good, and the
  `existsByEventId` idempotency guard defends against a redelivery that never
  comes. With the default completion mode, `event_publication` also grows
  without bound. Remediations: republish on restart, a scheduled resubmission
  of stale publications, a completion mode that prunes, or rewording the docs
  to at-most-once.
- **MUST-11** *(confirmed 2026-10-14)* — `docs/architecture.md` §2's diagram
  (lines 58-75) routes every backend call Browser → UI → `RH[Route handlers
  /api/*]` → API, but the only route handlers are the two auth ones (§5,
  `docs/architecture.md:392-399`); backend calls go from server components and
  Server Actions. It also draws no `API --> FED` edge though `/api/v1/feed`
  exists (`:73`), and only one (`FED --> CEL`, `:74`) of the seven
  inter-module edges §3's table lists. `ArchitectureDocumentationTest.java:119-142`
  parses only §2's node set, never its edges, so it passes — the same class of
  drift as retired MUST-1.
- **MUST-12** *(confirmed 2026-10-14)* — brewery is listed as a built search
  filter in `README.md:124` and `docs/architecture.md:26`, but the UI has
  never offered one: `frontend/features/catalog/api.ts`'s `PARAM_KEYS` and
  `SearchFilters.tsx` have no brewery field, and `BeerSpecifications.java:28-31`
  matches `query` against the beer name only. ADR-0069:169 treats a brewery
  filter as future work. Same class as retired MUST-7.
- **MUST-13** *(confirmed 2026-10-14)* — the list of routes reachable without
  a token is stated three times and none matches `SecurityConfig.java:46-59`:
  `docs/architecture.md:356-358` omits `GET /api/v1/cellars/*`;
  `docs/architecture.md:542-545` omits the feed; `backend/README.md:232-234`
  omits both. `FeedController.java:25` cites ADR-0028 for being public, and
  ADR-0028 never mentions the feed. A reviewer checking a new `permitAll`
  against the docs works from an incomplete list. One home, pointers from the
  others (ADR-0020).
- **MUST-14** *(confirmed 2026-10-14)* — iteration 9 plans work that is
  already done: `docs/tasks/iteration-9.md:69-70` schedules "`/breweries`
  paginated (quality backlog COULD-4)", and `docs/tasks/backlog.md:292-294`
  says `/api/v1/breweries` "returns the whole table unpaginated". It
  paginates (`CatalogController.java:100-107`, ADR-0045); COULD-4 was retired
  into iteration-5.5 task 07.
- **MUST-15** *(confirmed 2026-10-14)* — `docs/ci-playbook.md:180-182` ("When
  you bump a pinned version, the table is part of the change") and `:13-15`
  tell an agent to keep versions in the README tech-stack table, the opposite
  of ADR-0020's 2026-09-11 amendment that made it "an inventory, not a version
  list" (`README.md:175-184`, `CLAUDE.md` "New dependencies").
- **MUST-16** *(confirmed 2026-10-14)* — `backend/README.md:18-22`'s
  hot-reload recipe runs a bare `docker compose up -d` and then
  `mvn spring-boot:run`; the bare `up` also starts the `backend` container on
  `127.0.0.1:8080` (`docker-compose.yml:31-37`), so the native run fails on a
  taken port. The recipe should name only the services it needs.

## SHOULD

- **SHOULD-12** *(confirmed 2026-10-14)* — `docs/architecture.md` names a
  finished iteration as the one under construction: "Next (iteration 6.5, in
  progress)" at lines 37-38, a "Built:" list (`:24-35`) with nothing from
  iterations 7 or 7.5, and "Last updated: 2026-09-05" at line 3 — though 6.5,
  7 and 7.5 are all done (`docs/roadmap.md:66-68`). The iteration tags in the
  module table (`:129-131`) and "The cellar's endpoints (iteration 5)"
  (`:263`) remain. The document's own contract at lines 3-4 is "describes
  **what is built**, plus the iteration currently being built".
  `ArchitectureDocumentationTest` guards the module set but nothing guards
  this prose; SHOULD-59 is why it keeps recurring.
- **SHOULD-15** *(confirmed 2026-10-14)* **[needs decision]** —
  `features/cellar` depends on the catalog subdomain invisibly to the boundary
  rule documented as enforcing exactly this: `frontend/features/cellar/api.ts:3`
  imports the catalog's `getBeer` and `getBeersByIds` because
  `eslint.config.mjs:150-153` lets any feature's `api.ts` import the *whole*
  generated client. The cost is already visible as 404-handling at
  `frontend/features/cellar/api.ts:135-151` re-implementing
  `frontend/features/catalog/api.ts:66-79`, and
  `docs/architecture.md:387-391` claims these boundaries are "enforced rather than
  agreed". Three valid paths: let `app/` compose the join, permit a declared
  feature→feature edge, or narrow the `generated-api` policy to a feature's own
  tag. [iteration-6 task 09](iteration-6/09-batch-beer-lookup-for-cellar.md)
  changes the transport but keeps this import direction, so it does not resolve
  it.
- **SHOULD-16** *(confirmed 2026-10-14)* **[needs decision]** — the deliberate
  no-cross-schema-foreign-keys rule (`docs/architecture.md:118`) leaves a
  catalog beer's disappearance handled only by silently dropping the row —
  now in three places across two tiers
  (`frontend/features/cellar/api.ts:95-97` and `:142-144`,
  `backend/src/main/java/fi/kalia/feed/application/FeedService.java:111-123`) —
  so the entry and its bottles stay in the database permanently, invisible to
  their owner, with no log, no cleanup and no test. The backend's sole
  defence is the assumption that "nothing deletes catalog beers"
  (`backend/src/main/java/fi/kalia/cellar/application/CellarService.java:70-71`),
  which iteration 8 removes. §8's "Trade-offs made explicit" does not list this
  cost. Competing remediations: a catalog deletion event driving cellar
  cleanup, a stated-and-tested no-hard-delete invariant, or accepting orphans
  and moving the drop logic server-side before iteration 6 adds a second
  consumer.
- **SHOULD-17** *(confirmed 2026-10-14)* — the two-level bottle model is cited
  to ADR-0006 ("Cellar first — store flow deferred to backlog"), whose own
  2026-08-08 amendment supersedes its cellar-shape description; the decision is
  ADR-0034. `docs/architecture.md:266-269`.
- **SHOULD-18** *(confirmed 2026-10-14)* — both quality-backlog links in the
  iteration-5.5 index are broken: `docs/tasks/iteration-5.5.md:3` and `:11`
  link `tasks/quality-backlog.md` from inside `docs/tasks/`, resolving to
  `docs/tasks/tasks/quality-backlog.md`. These are the only two broken relative
  links in the whole doc set.
- **SHOULD-19** *(confirmed 2026-10-14)* — `docs/architecture.md` §7's testing
  table (lines 667-681) omits `ArchitectureDocumentationTest`, the test that
  parses §2's mermaid block and §3's table and fails the build when they
  disagree with Spring Modulith's own view. It is the mechanism that makes
  §2/§3 trustworthy, §7 is its "shape" home, and a reader editing §3's table
  gets no warning from `docs/` that a test will fail.
  `backend/README.md:153-158` documents it.
- **SHOULD-20** *(confirmed 2026-10-14)* **[needs decision]** — the rationale
  for taking on the two Radix dependencies is stated at length in four places
  and the copies already disagree: `README.md:208-212` cites the 2026-08-22/23
  amendments, `frontend/README.md:286-295` adds 2026-09-04 and says the toast
  serves only "the removal outcome toast" though
  `features/profile/VisibilityControl.tsx` uses it too (as
  `docs/architecture.md:516` says), and `docs/architecture.md:469-473` and
  ADR-0021 carry their own. The version-pin half of the original finding is
  resolved — only ADR-0021:120/138 keep numbers, matching `package.json`.
  Neither ADR-0020 exception applies; which home wins is a product-owner call.
- **SHOULD-25** *(confirmed 2026-10-14)* **[needs decision]** —
  `keycloak/realm-export.json` and `docker-compose.yml` are simultaneously the
  dev setup and the repo's only deployment definition. [Iteration
  6.5](iteration-6.5.md) tasks 01 and 02 took the confidential-client secret
  out of the realm file and made `sslRequired` environment-supplied
  ([ADR-0054](../adr/0054-keycloak-config-cli-realm-management.md)), but the
  seeded password did not go away — it moved: the `keycloak-seed` service
  (`docker-compose.yml:210-228`) runs by default and
  `scripts/seed-keycloak-account.mjs:70-75` resets `testuser` to a known,
  non-temporary, email-verified password on *every* `up`, so an operator who
  changes it gets it back on the next restart. Alongside it the file ships
  `AUTH_SECRET: ${AUTH_SECRET:-kalia-dev-auth-secret}` (`:60`), which
  `verifyRequiredConfiguration` (`frontend/lib/config/requiredConfiguration.ts:18`)
  accepts because it checks only presence and `README.md:98-105` does not list
  among the dev-only values; Keycloak admin `admin/admin` (`:118-119`); and
  `KEYCLOAK_SSL_REQUIRED:-none` (`:188`). A deployment that sets only the two
  `:?` secrets the file demands inherits all four. What softens it:
  `KC_HOSTNAME` and the issuer are hard-coded to localhost, so the file cannot
  be deployed unedited. Harden the shared definition, or split a dev stack
  from a deployable one, is still an open decision.
  **The missing `bruteForceProtected` half of this finding was lifted
  2026-09-12 into
  [iteration-7 task 11](iteration-7/11-keycloak-brute-force-protection.md)**
  and is no longer part of what remains here.
- **SHOULD-26** *(confirmed 2026-10-14)* **[needs decision]** — Valkey holds
  every session's refresh and ID tokens in plaintext JSON with no
  authentication and no TLS: the URL is `redis://` with no credentials
  (`frontend/lib/auth/valkeyClient.ts:6`) and the service sets no `requirepass`
  and no ACL (`docker-compose.yml:230-239`). Anything reaching port 6379 can
  enumerate `auth:session:*` — and each key name *is* the session cookie value
  (`frontend/lib/auth/valkeyAdapter.ts:18`), so that alone hijacks every live
  session through the frontend, with no client secret needed (the refresh
  tokens additionally need the client secret, no longer committed since
  SHOULD-25's partial fix). Loopback-bound and single-host today. ADR-0025
  and ADR-0030 decide where tokens live, not how the store is protected.
- **SHOULD-27** *(confirmed 2026-10-14)* **[needs decision]** — narrowed:
  Keycloak brute-force lockout (`keycloak/realm-export.json:21-28`, ADR-0061)
  now answers password grinding, and `/sign-up` has a Valkey-backed limiter
  (`frontend/features/auth/signUpRateLimit.ts:27-35`). What remains is the
  backend API and the unauthenticated
  `frontend/app/api/auth/backchannel-logout/route.ts:18-28`, which has no
  throttle and parses an unbounded form body before it verifies anything — a
  loop of garbage POSTs costs body parsing and an RS256 verification each on
  the single Node process that serves every user's pages.
  `docs/tasks/backlog.md` tracks "TLS, rate limiting" under mobile/native
  future work, not as a deployment gate. Where the limiter belongs — route
  handler or a reverse proxy that does not exist yet — is an architecture
  choice.
- **SHOULD-28** *(confirmed 2026-10-14)* — the Trivy action's pinned SHA no
  longer matches its own version comment or ADR-0024's record: all three steps
  pin `ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0`
  (`.github/workflows/vulnerability-scan.yml:29`, `:43`, `:51`) while the
  `v0.36.0` tag resolves to `a9c7b0f06e461e9d4b4d1711f154ee024b8d7ab8`, as
  ADR-0024 records (`docs/adr/0024-dependency-vulnerability-scanning.md:122`,
  `:152`); a Dependabot
  bump changed the SHA and left the comment. The comment is the only thing a
  reviewer reads to know what is running, which is the review step SHA-pinning
  exists to enable, and the whole CVE gate runs on that action.
- **SHOULD-29** *(confirmed 2026-10-14)* — `CatalogController` documents no
  response codes at all — none of its four handlers (`:56-108`) carries one — though `backend/README.md`'s SpringDoc convention says
  "Document each handler's response codes with `@ApiResponse`/`@ApiResponses`"
  and calls undocumented API surface "a gap, not a later task."
  `searchBeers` (`backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:56`)
  has several bounded `@RequestParam`s, each capable of a 400, and none
  documented; `getBeer` (`:83`) throws `BeerNotFoundException` — a 404 via
  `CatalogExceptionHandler` — with no `@ApiResponse` either.
  `PublicCellarController` follows the convention correctly for its own 404.
  This is not hypothetical cost: it was the (wrong) precedent an agent copied
  when writing a new controller for
  [iteration-7 task 02](iteration-7/02-feed-api.md), reproducing the same gap,
  caught only in that PR's human review.
- **SHOULD-30** *(confirmed 2026-10-14)* **[needs decision]** — `HttpBoundaryTest`'s
  guard against JPA entities crossing the HTTP boundary only recognizes a
  `@RestController` method annotated (or meta-annotated) with `@RequestMapping`
  (`A_CONTROLLER_HANDLER_METHOD`,
  `backend/src/test/java/fi/kalia/HttpBoundaryTest.java:41-48`), so it does not
  see an `@ExceptionHandler` method on a `@RestControllerAdvice` class —
  `fi.kalia.web.GlobalExceptionHandler`, `fi.kalia.catalog.web.CatalogExceptionHandler`,
  `fi.kalia.cellar.web.CellarExceptionHandler` and, since iteration 7,
  `FeedExceptionHandler` carry neither annotation.
  Every advice method returns bare `ProblemDetail` today, so nothing currently
  violates, but that shape is convention, not enforcement: ADR-0014 calls it
  "maintained by discipline — Spring does not enforce it"
  (`docs/adr/0014-shared-exception-handling.md:66`), the same
  unenforced-by-design gap [task 13](iteration-7/13-guard-dtos-at-the-api-boundary.md)
  exists to close for ordinary controllers. A future handler embedding an
  entity in a `ProblemDetail.setProperty(...)` extension would slip past both
  the ArchUnit rule and ADR-0014's discipline, silently. Task 13 scoped the
  rule to "a controller method" literally and never raised advice classes.
  Two remediations: widen `A_CONTROLLER_HANDLER_METHOD` (or add a parallel
  predicate) to also match `@ExceptionHandler` methods on
  `@RestControllerAdvice` classes, with its own archfixture fixture proving it
  fires, mirroring `HttpBoundaryRulesRejectViolationsTest`'s existing pattern;
  or leave it to ADR-0014's "only two exception types, always `ProblemDetail`"
  contract and add a one-line comment on `A_CONTROLLER_HANDLER_METHOD` naming
  the exclusion as deliberate. Spending a second ArchUnit rule and fixture on
  a class of method that has never actually leaked an entity is a
  product-owner call.
- **SHOULD-31** *(confirmed 2026-10-14)* **[needs decision]** — `CLAUDE.md` is
  260 lines against the 200-line budget it states about itself
  ([ADR-0048](../adr/0048-what-survives-a-claude-md-bullet.md)), and that
  ADR's revisit trigger ("if `CLAUDE.md` passes 200 lines again") has fired.
  It has grown since the trim ADR-0048's 2026-09-29 amendment recorded at 252
  (253 at 1fddbc3, 259 at 79c5c3f, 260 at 8b07bbf), and the screenshot bullet
  added after it (`CLAUDE.md:131-137`) carries rationale already held by
  `.claude/rules/no-screenshots.md` and ADR-0062 — the kind ADR-0048 says a
  bullet may not keep.
  Found closing [iteration 7.5 task 01](iteration-7.5/01-how-a-design-task-runs.md),
  which needed a line added to it: a pass that trimmed only rationale, history
  and descriptive prose took the file from 270 to 252 and no further, so the
  remaining ~53 lines are rules, not prose. ADR-0048 already names the one
  option that reaches 200 — moving whole gates (doc-sync, code-review,
  iteration DoD) into `implement-task` — and rejects it "for now" as "its own
  decision rather than smuggling it into a compaction pass"; the other live
  option is its `check-claude-md.mjs`, advisory first. Deciding between them
  is a product-owner call and an ADR, not a trim.

- **SHOULD-32** *(confirmed 2026-10-11)* **[needs decision]** — the app's own
  links to a public cellar carry no locale, so a visitor reading `/fi` whose
  browser asks for English lands on the English cellar page: the feed's
  username link (`frontend/features/feed/FeedLineRow.tsx`), the profile's
  "Open" link (`frontend/features/profile/VisibilityControl.tsx`) and the
  cellar's "View" link (`frontend/features/cellar/CellarView.tsx`).
  [ADR-0050](../adr/0050-public-cellar-addressing.md) makes the locale-less
  address the one offered for copying and given to external consumers; it
  does not say whether links *inside* the app should use it too. Prefixing
  the in-app links with the current locale while keeping the copied address
  locale-less is two-line work per link once decided. Found by the bilingual
  keyboard walk of [iteration 7.5 task 13](iteration-7.5/13-accessibility-and-contrast-reverified.md),
  whose Finnish flows now run with a Finnish browser language.

- **SHOULD-33** *(confirmed 2026-10-14)* **[needs decision]** — the front
  page's feed can show "Nothing here yet" while public events exist.
  `FeedService.readRecent` (`backend/src/main/java/fi/kalia/feed/application/FeedService.java:56-62`)
  reads `size+1` rows and only then drops lines from private cellars
  (`:114-124`); cellars are private by default, so when the newest 21 lines
  are all private the first page is empty but carries a `nextCursor`.
  `frontend/features/feed/FeedList.tsx:134` sets `canLoadMore` only when
  `lines.length > 0`, and `:174-177` renders the empty state — no way to reach
  the older public lines. ADR-0059 accepts short pages, not this all-empty
  one. Fill the page on the backend, or fetch the next page on the frontend.
- **SHOULD-34** *(confirmed 2026-10-14)* — the anonymous public cellar page
  makes one `getBeer` call per entry in an unbounded `Promise.all`
  (`frontend/features/cellar/api.ts:126-162`), while the owner's cellar
  already uses the chunked batch lookup (`:63-89`). One unauthenticated page
  view fans out to N backend requests. Iteration-6 tasks 09 and 14 both
  scoped this out as "a separate task" that was never written.
- **SHOULD-35** *(confirmed 2026-10-14)* **[needs decision]** — the
  cellar↔catalog join, the orphan drop and the sort live in the frontend
  (`frontend/features/cellar/api.ts:15-32`, `:126-162`) under the
  "client-agnostic resources" rule (`docs/architecture.md:349-355`). From
  iteration 9 mobile is the primary UI and iteration 12 adds an offline cellar
  (`docs/roadmap.md:27-31`), so every client would re-implement the join. The
  backend `cellar` module already depends on catalog through `CatalogApi`,
  whose `getBeerSummaries` serves feed's server-side join. Related to
  SHOULD-15, SHOULD-16 and SHOULD-34.
- **SHOULD-36** *(confirmed 2026-10-14)* — the catalog's own search form can
  produce a 400 and the generic error page: the ABV inputs
  (`frontend/features/catalog/SearchFilters.tsx:89-112`) have no `max` and no
  min ≤ max check, the query input (`:36-42`) has no `maxLength`, and
  `frontend/features/catalog/api.ts:44-54` normalizes only `sort`. Min 8 /
  max 5, an ABV over 100, a query over 100 characters, or a hand-edited `page`,
  `size` or non-numeric ABV reaches `CatalogController.java:68-70,77,111-116`
  as a 400 and lands on `app/[locale]/error.tsx`, whose Retry fails again.
  Iteration-7 task 16 skipped these parameters for want of evidence; this is it.
- **SHOULD-37** *(confirmed 2026-10-14)* — every anonymous
  `GET /api/v1/cellars/{username}` runs
  `ProfileRepository.findFirstByUsernameOrderByCreatedAtDesc`
  (`profile/domain/ProfileRepository.java:12`) as a full scan and sort —
  `V006__profile_schema.sql:8-14` has no index on `username` — and the path
  variable has no `@Size` (`cellar/web/PublicCellarController.java:49`) on a
  `permitAll` route, against ADR-0042's bounded-parameter rule.
- **SHOULD-38** *(confirmed 2026-10-14)* **[needs decision]** — a username is
  the public cellar address and the owner check, but it is not unique: `V006`
  has no `UNIQUE` constraint and `ProfileRepository.java:9-12` picks the
  newest match; the feed resolves names by user id but links by username
  (`frontend/features/feed/FeedLineRow.tsx:32`), and
  `app/[locale]/cellars/[username]/page.tsx:57` decides `isOwner` by comparing
  usernames. With open self-registration (ADR-0055), a deleted account's
  username claimed by someone else points the old owner's feed lines at the
  new person's cellar, though ADR-0049:100-101 says the URL "can never break".
- **SHOULD-39** *(confirmed 2026-10-14)* — the cellar sign-in open-redirect
  guard has no test: `beerReturnPath` and `UUID_PATTERN`
  (`frontend/features/cellar/actions.ts:34-49`) stop a caller-supplied value
  reaching `signIn`'s `redirectTo`, but the only tests that touch them mock
  `./actions` (`features/cellar/AddToCellarButton.test.tsx:5`,
  `SignInPrompt.test.tsx`).
- **SHOULD-40** *(confirmed 2026-10-14)* **[needs decision]** — `profile`
  resolves the caller from the token itself:
  `profile/web/ProfileController.java:60-74` re-decodes the JWT, duplicating
  `identity/application/CurrentUserService.java:35-60` without its UUID-parse
  guard, so a non-UUID `sub` is a bare `IllegalArgumentException` (500) rather
  than the explained failure. `docs/architecture.md:128` and `:539-541` say
  `identity` owns that mapping; `ArchitectureTest.java:130-137` guards only
  `CurrentUserService`, and the exception is documented only in
  `backend/README.md:238-240`. Root cause: `IdentityApi.java:15-17` exposes
  only the id, and ADR-0049:52 keeps `profile` a leaf. Widen `IdentityApi` and
  allow the edge, or keep the exception, document it in §3 and guard `Jwt`
  use with ArchUnit.
- **SHOULD-41** *(confirmed 2026-10-14)* — ADR-0053:46-49 says an event
  carries "ids and `occurredAt`, never a copy of anything that can change",
  but `cellar/BottleAdded.java:14-15` carries `quantity` and `brewedDate`, and
  `brewedDate` is editable (`cellar/domain/Bottle.java:72-79`). ADR-0058
  adopted the opposite; ADR-0053 was never amended, against ADR-0019's "amend,
  do not rewrite".
- **SHOULD-42** *(confirmed 2026-10-14)* — `moduleRootReachesDomainThroughApplication`
  (`backend/src/test/java/fi/kalia/ArchitectureTest.java:205-213`) only
  requires a module-root class that touches `domain` to *also* touch
  `application`, so a root API injecting both `CatalogService` and
  `BeerRepository` passes — the case `docs/architecture.md:116-118` and
  ADR-0007 say is enforced. The fixture
  `archfixture/badmodule/ModuleRootReachingIntoDomain.java` covers only the
  no-application case.
- **SHOULD-43** *(confirmed 2026-10-14)* — `profile`'s retry protection
  depends on a configuration class inside `cellar`: the only
  `@EnableResilientMethods` is `cellar/application/RetryConfig.java:6-9`, and
  `profile/application/ProfileService.java:50` and `:59` rely on it for
  ADR-0057's race protection. An `@ApplicationModuleTest` of `profile`, or
  moving cellar's config, silently drops the retries; Modulith cannot see the
  dependency. Belongs in application-level configuration.
- **SHOULD-44** *(confirmed 2026-10-14)* — `feed/web/FeedController.java:34-38`
  sets `MAX_SIZE = 99` from the private `MAX_BATCH_IDS` in `CatalogApi.java:19`
  and `ProfileApi.java:19`, tied only by a comment (also
  `FeedService.java:51-54`); lowering either cap turns the anonymous feed into
  a 500 via `Assert.isTrue`. The frontend mirrors `CatalogController.java:52`
  the same way (`features/cellar/api.ts:56-58`). Publish the caps on the module
  APIs, or have the APIs chunk.
- **SHOULD-45** *(confirmed 2026-10-14)* **[needs decision]** — the
  public-cellar visibility rule lives in the web layer:
  `PublicCellarController.java:49-52` resolves visibility and throws, while
  `CellarService.readPublicCellar` (`CellarService.java:31-35`) loads any
  user's cellar by id unchecked. `feed` enforces the same rule in its
  application layer (`FeedService.java:114-123`). Moving it conflicts with
  `backend/README.md:237-238` ("a public read takes a resolved owner id").
- **SHOULD-46** *(confirmed 2026-10-14)* — route knowledge is duplicated
  across features: `/cellars/${username}` is built in `FeedLineRow.tsx:32`,
  `VisibilityControl.tsx:31` and `CellarView.tsx:39`; `/${locale}/beers/${id}`
  in `FeedLineRow.tsx:50`, `CellarBeerList.tsx:109` and `cellar/actions.ts:48`,
  while `features/catalog/links.ts:17` owns `beerHref`. This breaks
  `frontend/README.md:145-146` ("moves to lib once a second feature uses it")
  and makes SHOULD-32's fix N separate edits.
- **SHOULD-47** *(confirmed 2026-10-14)* **[needs decision]** — the feed
  cursor's signing key is generated per process, in memory
  (`feed/application/FeedCursorCodec.java:12-35`), contradicting "must not
  prevent horizontal scaling" (`docs/architecture.md:44`), with no ADR or §8
  entry recording the choice. Every restart invalidates every cursor; with two
  instances, a `since` poll landing on the other one gets a 400 that
  `frontend/features/feed/actions.ts:37-52` turns into `startOver` and
  `FeedList.tsx:79-83` into `window.location.reload()` — every 15 s. A mobile
  offline cache would hold dead cursors.
- **SHOULD-48** *(confirmed 2026-10-14)* — the frontend import-boundary rules
  `docs/architecture.md:388-391` presents as the counterpart of Modulith
  verification have no violating fixture, so a silent no-op goes unnoticed —
  SHOULD-15 shows the config already lets a cross-subdomain edge through.
  Iteration 9's workspaces change (`docs/tasks/backlog.md:146`, `:237-240`)
  rewrites the element patterns, which is when that is likeliest. Parked in
  `docs/tasks/backlog.md:109-120` but never listed here.
- **SHOULD-49** *(confirmed 2026-10-14)* — `docs/architecture.md:297-302`
  says a feed line carries "username, beer name, brewery, bottle count,
  vintage, the instant and … cursor", but `FeedLineDto.java:12-27` also carries
  `beerId`, `style` and `abv` (iteration-7.5 task 15). `docs/glossary.md:105-106`
  says feed reads only "a beer's name and brewery", and `:158` omits
  `FeedPageDto.startOver`.
- **SHOULD-50** *(confirmed 2026-10-14)* — the backend module list is
  restated and has drifted: `backend/README.md:3-4` names "`catalog`,
  `identity`, and `cellar` from iteration 5" (no `profile`, no `feed`) and
  pins "Spring Boot 4.1" in prose; `README.md:165-167` still uses future tense
  ("as iteration 6 adds it", "as iteration 7 adds it"), and `README.md:280-286`
  and `docs/architecture.md` §3 carry their own copies. One home, pointers
  from the others.
- **SHOULD-51** *(confirmed 2026-10-14)* — `README.md:190` and
  `docs/architecture.md:671` say "JUnit 5", but Spring Boot 4.1.1
  (`backend/pom.xml:8`) manages `junit-jupiter` 6.0.3 — a major version the
  README's own rule keeps "where the number is the point".
- **SHOULD-52** *(confirmed 2026-10-14)* — `backend/README.md:131` says
  `ArchitectureRulesRejectViolationsTest` "runs four of those rules"; it runs
  eight (`ArchitectureRulesRejectViolationsTest.java:19-61`). And
  `docs/architecture.md:676` says the fixture covers "noClasses() rules — and
  only those", though `classes().should()` rules are fixtured too, as
  `backend/README.md:135-137` itself says.
- **SHOULD-53** *(confirmed 2026-10-14)* — the root README's "in roadmap
  order" feature list (`README.md:122-146`) never mentions iterations 9–14,
  which make mobile Kalia's primary UI (`docs/roadmap.md:27-36`, `:70-75`) —
  the biggest planned change of direction. Same class as retired SHOULD-21.
- **SHOULD-54** *(confirmed 2026-10-14)* **[needs decision]** —
  `docs/ci-playbook.md:184-188` says `docker compose up --wait` on a one-shot
  service (`keycloak-config`) exits 1 and to "name only long-running
  services", but `README.md:112`, ADR-0054:65,
  `scripts/check-keycloak-realm-config.mjs:267` and `Makefile:76` all pass
  `--wait` with `keycloak-config`. One side is wrong; local Compose is now
  v5.5.1, so the playbook entry may no longer hold.
- **SHOULD-55** *(confirmed 2026-10-14)* — the per-issue Definition of Done
  is stated twice and the copies differ: the full list at
  `docs/roadmap.md:38-48`, a three-item subset at `docs/architecture.md:699-700`
  (also out of place in a "shape" document). Retired SHOULD-5 covered the
  *iteration* DoD, not this.
- **SHOULD-56** *(confirmed 2026-10-14)* **[needs decision]** — no CI check
  blocks a merge: the repository's one ruleset has no
  `required_status_checks` and `dev` has no legacy branch protection. PRs
  #233, #234 and #240 merged with E2E red on their head commit, #248 merged
  while E2E was still running and went red ten minutes later, and #240 left
  `dev` red until #241. #343 asked for "Heading check" to be made required and
  nothing changed. ADR-0046 and the `make verify` gate treat CI as the
  backstop, but GitHub enforces none of it. The ruleset is the product
  owner's; jobs the `changes` filter skips must still count as passing.
- **SHOULD-57** *(confirmed 2026-10-14)* **[needs decision]** — fixed host
  ports (`docker-compose.yml:39, 78, 98, 145, 234, 252`) plus one worktree per
  session mean the Docker half of `make verify` is routinely not run: #211,
  #224, #226, #245, #250, #256 and #268 skipped or were blocked on it because
  another stack held the ports, #295 waited ~30 minutes and shipped without
  `api-drift`, `keycloak-check` or E2E, and in #315 the product owner had to
  stop another stack. `implement-task` (`SKILL.md:110`) already lets
  `verify-fast` stand in, contradicting `CLAUDE.md`'s "`make verify` green
  before a PR". Options: per-worktree port overrides, a stack lock, or making
  CI the Docker gate officially — which only works with SHOULD-56.
- **SHOULD-58** *(confirmed 2026-10-14)* — gate verdicts have no slot in the
  PR template, so the durable record shows the code-review gate skipped in
  roughly a third of code PRs. `implement-task`'s Gates section
  (`SKILL.md:95-117`) and ADR-0046 require the `pwd`/range lines and a verdict
  per gate ("a gate with no verdict counts as skipped"), but
  `docs/PULL_REQUEST_TEMPLATE.md:45-67` has no section for them, and "or the
  final message" lets the report vanish with the session. No `/code-review`
  verdict appears in #212, #217, #219, #229, #237, #241, #244, #247, #256,
  #263, #266, #273, #275, #283–#287, #293, #319 or #353; the `pwd`/range lines
  only in #311–#314, #336, #338 and #342.
- **SHOULD-59** *(confirmed 2026-10-14)* — the iteration-close checklist
  (`CLAUDE.md` "Iteration DoD gate", `implement-task` step 11,
  `SKILL.md:86-91`) names only `docs/roadmap.md`'s Status, so the README
  status and feature list and `docs/architecture.md`'s "Next" line drift at
  every close: #196 (product owner: "Update status in README.md"), #231 and
  #306 were each follow-up doc-sync PRs for iterations 5.5, 6 and 7, and
  SHOULD-12 is the drift still standing after 7 and 7.5.
- **SHOULD-60** *(confirmed 2026-10-14)* — `CLAUDE.md`'s "A decision earns an
  ADR" bullet states only ADR-0032's first test, not its 2026-08-08 and
  2026-09-04 amendments (the task file or another existing home is enough;
  ADR-0032:114-131). The product owner has had to have an over-eager draft
  ADR dropped twice before merge: a bottle-removal ADR in #218 (57f5cef), which
  produced the amendment, and a worktree-isolation ADR in #248 (91cf5eb,
  "environment notes would be enough") a week later — both numbers since
  reissued to other decisions. A same-length rewording fixes it, which matters under SHOULD-31.

## COULD

- **COULD-17** *(confirmed 2026-10-14)* **[needs decision]** — `MAX_PAGE`
  10,000 combined with `MAX_PAGE_SIZE` 100 admits `OFFSET 1_000_000` on an
  endpoint `SecurityConfig` makes `permitAll()`
  (`backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:48-49`).
  The Javadoc's justification — past this index a request cannot land on real
  data — holds only while the catalog has fewer than ~10,001 beers, which
  iteration 8 changes. Each such request makes Postgres run the trigram match,
  produce a `COUNT(*)`, then discard a million rows. Lowering `MAX_PAGE`,
  keyset pagination and rate limiting answer different concerns.
- **COULD-18** *(confirmed 2026-10-14)* — `X-Content-Type-Options: nosniff` is
  the one standard header missing from ADR-0016's otherwise deliberate set
  (CSP, `X-Frame-Options`, `Referrer-Policy`, HSTS, `Permissions-Policy`), and
  the ADR does not record it as considered-and-rejected.
  `frontend/next.config.ts:24`. Hardening rather than a hole — nothing serves
  sniffable content today — but with `script-src 'unsafe-inline'` accepted, the
  CSP would not stop a sniffed-into-HTML response.
- **COULD-19** *(confirmed 2026-10-14)* — an access token with no recorded
  expiry is treated as fresh forever: `hasExpired` returns `false` unless
  `expires_at` is a number, so a stored account missing that field never
  triggers `renew()` and the BFF sends a dead token indefinitely — every
  backend call 401s, the user sees an empty cellar, and ADR-0029's refresh path
  is silently dead for that session. `frontend/lib/api/accessToken.ts:68-70`. The
  behaviour is documented and deliberate; the deliberate choice is the
  fail-open direction.
- **COULD-20** *(confirmed 2026-10-14)* **[needs decision]** — a
  caller-supplied `Authorization` header silently overrides the session's
  token: `withAccessToken` returns `options` untouched when one is already set
  (`frontend/lib/api/mutator.ts:81-88`). No call site sets one today, so it is not
  exploitable now; it becomes exploitable the first time any header value
  derives from request input, at which point the BFF forwards a
  caller-chosen bearer token verbatim. The comment argues an override is easier
  to diagnose than a silent overwrite — diagnosability against a hard "session
  token always wins" invariant is a judgement call.
- **COULD-21** *(confirmed 2026-10-14)* — the waiver policy `.trivyignore`
  states ("a reason and a 30-day expiry … expiring forces a revisit") cannot be
  enforced by the file format it is written in: Trivy honours `expired_at` only
  in the structured `.trivyignore.yaml`, so in the plain format an expiry is a
  comment Trivy ignores and a waiver stays suppressed forever. `.trivyignore:2`.
  Latent, not live — the file currently holds zero waiver entries.
- **COULD-22** *(confirmed 2026-10-14)* — `jose` is a direct runtime
  dependency verifying back-channel logout tokens
  (`frontend/lib/auth/backchannelLogoutToken.ts`) that appears nowhere in the
  root README's tech-stack inventory, which CLAUDE.md requires. The i18next
  half of the original finding is resolved (531c5dc took the version out of
  the README).
- **COULD-23** *(confirmed 2026-10-14)* — the root README's "Repository layout
  (planned)" heading describes a layout that is built, and still annotates
  `cellar/` as "(iteration 5)"; the tree also omits `docs/ci-playbook.md`,
  `docs/PULL_REQUEST_TEMPLATE.md`, `docs/design.md`, `docs/glossary.md`,
  `keycloak/`, `scripts/` and the `Makefile`. `README.md:276-294`.
- **COULD-24** *(confirmed 2026-10-14)* — the ADR index's gloss for ADR-0021
  repeats a claim the ADR has amended away twice: "three shared primitives, no
  new dependency" (`docs/adr/README.md:133-135`) against seven primitives in
  `frontend/components/ui/` and two Radix dependencies. The frozen ADR *title*
  legitimately keeps the original wording, but `docs/adr/README.md:16` states
  this file carries "a one-line gloss rather than a second copy of these
  titles", so the gloss is free to describe current reality.
- **COULD-25** *(confirmed 2026-10-14)* — the ADR index's auth group says
  "Seven independent decisions" over a list that has since grown to eleven
  (ADR-0025, 0028, 0029, 0030, 0031, 0033, 0043, 0055, 0056, 0061, 0074); each
  addition left the count behind. `docs/adr/README.md:186`. Dropping the
  number would stop the recurrence.

- **COULD-26** *(confirmed 2026-10-11)* — Keycloak's password-reset page
  marks its username field `autocomplete="off"`, so a browser or password
  manager will not offer the username it already holds. Not a WCAG 2.2
  failure — the page asks for nothing to be recalled that 3.3.8 protects, and
  the login and registration fields carry proper `autocomplete` values — but
  it is stock `keycloak.v2` markup the theme does not touch
  ([ADR-0056](../adr/0056-branded-bilingual-keycloak-pages.md)).
- **COULD-27** *(confirmed 2026-10-11)* — one run of
  `frontend/e2e/keyboard-flows.spec.ts`, started seconds after the frontend
  container was rebuilt, had axe report `document-title` on the profile page
  after a save: the document briefly had no `<title>`. Twelve repeats of the
  same flow and a MutationObserver watching for an empty title across the
  save did not reproduce it. Worth a look if it recurs, starting from how
  Next.js streams metadata on a cold server.

- **COULD-28** *(confirmed 2026-10-14)* — the generated client interpolates
  path parameters into URLs unencoded (`` `/api/v1/cellars/${username}` `` at
  `frontend/lib/api/generated/public-cellar/public-cellar.ts:73`; likewise
  `cellar/cellar.ts:202,305` and `catalog/catalog.ts:311`), and
  `lib/api/mutator.ts:23-27` attaches the caller's bearer token to whatever URL
  results. The public-cellar page passes the raw route parameter
  (`app/[locale]/cellars/[username]/page.tsx:15,45`) and the bottle actions
  pass client-supplied ids unvalidated (`features/cellar/actions.ts:60-72`);
  only `features/catalog/api.ts:67` checks its id. A crafted path can steer the
  BFF to a different backend route with the visitor's token. No data crosses
  users today — the backend authorizes by token — but it is a confused-deputy
  primitive a future route inherits. Verified in code, not against a live stack.
- **COULD-29** *(confirmed 2026-10-14)* — no test pins which routes are
  reachable without a token: nothing compares the handler mappings with an
  allow-list, and `ArchitectureTest.onlyIdentityConfiguresWebSecurity` checks
  where the chain lives, not what it permits. `/api/v1/beers/*` and
  `/api/v1/cellars/*` are single-segment wildcards (`SecurityConfig.java:46,52`)
  whose comment guards against sub-resources only, so a future
  `GET /api/v1/cellars/mine` would be anonymous with no failing test —
  `/api/v1/beers/batch` is already public this way, intentionally.
- **COULD-30** *(confirmed 2026-10-14)* **[needs decision]** — removing a
  beer's last bottle deletes the entry (`CellarService.java:55-63`), `Entry`
  has no `@Version`, and `bottle.entry_id` is `ON DELETE CASCADE`
  (`V005__cellar_schema.sql:23`). If a concurrent `addBottles` for the same
  beer (`:40-45`) commits first, the delete cascades over the bottle just
  added — a request that already returned 201, whose `BottleAdded` feed line
  stays. Only the owner can trigger it (two tabs), but the loss is silent.
- **COULD-31** *(confirmed 2026-10-14)* — the "no empty entry" rule
  (ADR-0034) is re-checked inconsistently: `CellarService.listEntries` filters
  empty entries (`CellarService.java:27-29`) but `readPublicCellar` does not
  (`:33-35`), and the frontend filters again at `features/cellar/api.ts:30`,
  `:44` and `:131` under a comment about a "left join" query that no longer
  exists. The duplicated row mapping in `toRow` (`:91-107`) and
  `toPublicCellarBeer` (`:135-162`) adds to the drift.
- **COULD-32** *(confirmed 2026-10-14)* — `ProfileService.isCellarPublic`
  (`profile/application/ProfileService.java:24-26`) is referenced only by tests.
- **COULD-33** *(confirmed 2026-10-14)* — `CellarService` (`:20`) and
  `ProfileService` (`:18`) put a class-level read-write `@Transactional` over
  their read methods, so the anonymous public-cellar path opens read-write
  transactions; `CatalogService` and `FeedService` mark their reads
  `readOnly = true`.
- **COULD-34** *(confirmed 2026-10-14)* — the "brewed in the future" check
  (`cellar/domain/Bottle.java:81-87`) calls `LocalDate.now()` in the JVM's
  default zone while its comment's "+14:00 max offset" argument assumes UTC —
  true of the container today, never pinned — and with no injectable `Clock`
  the rule cannot be tested at a fixed instant.
- **COULD-35** *(confirmed 2026-10-14)* — the front page
  (`app/[locale]/(home)/page.tsx:43`) and the profile page
  (`app/[locale]/profile/page.tsx:32`) call `listCellarEntries()`, with its
  catalog batch lookups, only to count bottles, though `heldBottlesByBeer`
  (`features/cellar/api.ts:36-46`) skips that lookup. Switching changes the
  numbers when an entry points at a missing beer (SHOULD-16).
- **COULD-36** *(confirmed 2026-10-14)* — feed timestamps never update:
  `FeedList.tsx:36` freezes `renderedAt` once for every row (`:186`),
  including lines polled in later, and `formatRelativeInstant` clamps a
  negative age to zero (`lib/relativeInstant.ts:26`), so a line polled in
  three hours after load says "just now" and older lines never age.
- **COULD-37** *(confirmed 2026-10-14)* — switching language drops the
  current search: `features/i18n/LocaleSwitcher.tsx:7-15,23` builds its link
  from `usePathname()` only, so `/en/beers?query=ipa` becomes `/fi/beers`.
- **COULD-38** *(confirmed 2026-10-14)* — accepted ADRs still cite the
  removed store and false compose facts with no `Amended` note: ADR-0002:8 and
  :24-25, ADR-0003:15-16 and :21-23, and ADR-0007:59-60 cite cart, ordering and
  payment; ADR-0003 says "docker-compose publishes only Next.js" though the
  backend is published on `127.0.0.1:8080` (`docker-compose.yml:33-36`); and
  ADR-0007's ports-and-adapters deferral names only removed modules as its
  trigger.
- **COULD-39** *(confirmed 2026-10-14)* — `docs/architecture.md:402-404` says
  server components call `kaliaFetch` "directly"; none does — they go through
  the feature's `api.ts` and the generated client, as `:422-425` and
  `frontend/README.md:200-203` say. Nearby, `app/[locale]/(home)/page.tsx:47-127`
  holds the pitch and empty-state markup, against "`app/` route files stay thin
  and delegate" (`docs/architecture.md:386-387`).
- **COULD-40** *(confirmed 2026-10-14)* **[needs decision]** —
  `GET /api/v1/me` (`IdentityController.java:28-36`) has no production
  consumer — only e2e and a mutator test — yet returns email and full name
  (`CurrentUser.java:8`), though ADR-0071 says Kalia names people by username
  only. Remove it, or narrow what it returns.
- **COULD-41** *(confirmed 2026-10-14)* **[needs decision]** — ADR-0012 chose
  orval for its TanStack hooks (`:39-43`), but since ADR-0040 no component may
  use them, and `frontend/orval.config.ts:12` (`client: "react-query"`) still
  generates them unused; ADR-0040:107-112's complementary `server-only` marker
  was never added. Option: `client: "fetch"` and a `server-only` mutator.
- **COULD-42** *(confirmed 2026-10-14)* — the ADR index's gloss for ADR-0041
  cites `useCellarBottles` (`docs/adr/README.md:181`), which no longer exists;
  the hooks are `useAddBottle`/`useUpdateBottle`/`useRemoveBottle`
  (`features/cellar/hooks/useBottles.ts`).
- **COULD-43** *(confirmed 2026-10-14)* — `README.md:224-230` says "next
  16.3.3 declares fixed versions … now worth re-testing": next is 16.3.8, and
  both the version in prose and the open to-do have gone stale.
- **COULD-44** *(confirmed 2026-10-14)* **[needs decision]** —
  `README.md:262-268` restates the Dockerfiles' exact base-image tags and
  `README.md:250-259` the Gmail quota figures held in iteration-6.5 task 04,
  both against the "inventory, not a version list" rule.
- **COULD-45** *(confirmed 2026-10-14)* — `README.md:272` says CI builds and
  tests both apps "on every push", but `ci.yml:27-100` gates the backend,
  frontend, e2e and keycloak jobs on changed paths for non-`dev` branches.
- **COULD-46** *(confirmed 2026-10-14)* — `frontend/README.md:30` says "The
  five `AUTH_KEYCLOAK_*`/`AUTH_URL`/`VALKEY_URL` values"; there are six.
- **COULD-47** *(confirmed 2026-10-14)* — iteration indexes carry stale
  counts and claims: `docs/tasks/iteration-7.5.md:61` ("the other twelve";
  there are seventeen), `:100-102` (ADR-0021's "three primitives … today") and
  `:119-121` (the front page "today renders a static welcome");
  `docs/tasks/iteration-6.5.md:120` ("Four of the nine tasks"; there are
  seventeen).
- **COULD-48** *(confirmed 2026-10-14)* — `docs/tasks/backlog.md:17-18`
  parks likes and comments "once the feed (iteration 7) exists" — it exists —
  and `:188-189` says `app/api/` holds "only Auth.js's own routes", ignoring
  `backchannel-logout`.
- **COULD-49** *(confirmed 2026-10-14)* — `docs/PULL_REQUEST_TEMPLATE.md`'s
  Test-plan examples (`:48-49`: `mvn clean verify`, `npm test`,
  `node scripts/check-tasks.mjs`) predate `make verify` as the one gate
  (ADR-0046), and its Doc-sync list (`:61-63`) omits the iteration index the
  `CLAUDE.md` doc-sync gate requires.
- **COULD-50** *(confirmed 2026-10-14)* **[needs decision]** — the sign-up
  limit "20 attempts per 10 minutes" is stated in `frontend/README.md:122-124`,
  `docs/ci-playbook.md:97-99` and ADR-0055:73 as well as in
  `features/auth/signUpRateLimit.ts:10-11`. Consistent today; which copies
  stay is a call.
- **COULD-51** *(confirmed 2026-10-14)* — a fresh worktree has no
  `frontend/node_modules` and the `worktree` skill's Start steps
  (`.claude/skills/worktree/SKILL.md:15-35`) don't install it: #200, #202 and
  #255 each recorded `verify-fast` failing until `npm ci` ran, and
  `docs/ci-playbook.md:194-205` documents the stale variant. Meanwhile the
  edit hook silently skips ESLint without it
  (`scripts/hooks/post-edit-check.mjs:39`, `:48`) — since #353 moved the
  heading rule into ESLint, a silent gap at edit time.
- **COULD-52** *(confirmed 2026-10-14)* **[needs decision]** — `make verify`
  claims to run "every check CI runs" (`Makefile:1-5`, `:85`, `CLAUDE.md`
  "Commands", `implement-task` step 9) but leaves out the Trivy scan in
  `.github/workflows/vulnerability-scan.yml`, and ADR-0046 does not record the
  exclusion. CI reported the scan red only after the push on #243 (0b86530),
  #306 (ad80da6), #309 (8662580) and #327/#328. Add it, or correct the claim.
- **COULD-53** *(confirmed 2026-10-14)* — the refinement skills say
  "task-file edits only, no code" (`.claude/skills/refine-iteration/SKILL.md:59-62`,
  `refine-task/SKILL.md:51-53`) while `CLAUDE.md` requires an unrelated CVE to
  be fixed "in place … never a second PR"; refinement PR #309 carried a
  `backend/pom.xml` Jackson override (8662580). The skills need the carve-out
  stated.
- **COULD-54** *(confirmed 2026-10-14)* — `profile-visibility.spec.ts`
  failed or flaked in #228, #233, #234, #240, #244 and #273; #244 and #273
  blamed account contention "already tracked as iteration-6 task 11", which had
  merged on 2026-09-04 (#226), and #328 found the real cause on 2026-10-09 —
  the optimistic update confirms before the save's POST returns, so the reload
  races the save. Five weeks to recognise, and still no `docs/ci-playbook.md`
  entry.
- **COULD-55** *(confirmed 2026-10-14)* — three process citations point at
  nothing: `.claude/skills/worktree/SKILL.md:34-35` cites "`implement-task`
  step 0" (there is none; dangling since ab0809e);
  `docs/PULL_REQUEST_TEMPLATE.md:53-54` says a browser check is "required for
  UI changes per CLAUDE.md", which no version of `CLAUDE.md` since 1977ec2 has
  said; and `implement-task` step 10 (`SKILL.md:75-77`) says the template
  "already requires" it — circular.
- **COULD-56** *(confirmed 2026-10-14)* **[needs decision]** — the `worktree`
  skill's Finish steps (`.claude/skills/worktree/SKILL.md:37-48`) wait for the
  product owner's merge, which happens after the session that opened the PR
  has ended, so they are unreachable by design: three merged or detached
  worktrees from separate sessions hold ~3.1 GB under `.claude/worktrees/`,
  plus an empty `remove-beer-price-291b12` directory from 2026-09-11.

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
- ~~MUST-4~~ (the root README called `@radix-ui/react-dialog` the one UI dependency while `@radix-ui/react-toast` was a second) — resolved: confirmed 2026-10-14 that `README.md:208-212` names both as "the only two UI dependencies", consistent with `docs/architecture.md` and `frontend/README.md`. The rationale duplication around them stays open as SHOULD-20.
- ~~MUST-6~~ (the ADR index labelled ADR-0045's link "ADR-0046") — resolved: confirmed 2026-10-14 that `docs/adr/README.md:114` labels it ADR-0045 and a scan of every `[ADR-NNNN]` link across the docs, `CLAUDE.md`, the READMEs and `.claude/` finds no label/target mismatch.
- ~~SHOULD-21~~ (the root README's roadmap-order feature list skipped iteration 6.5) — resolved: confirmed 2026-10-14 that `README.md:132-133` lists iteration 6.5. The same class of gap recurs for iterations 9–14 as SHOULD-53.
