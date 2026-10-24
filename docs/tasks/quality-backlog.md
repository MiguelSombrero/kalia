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

- **MUST-17** *(confirmed 2026-10-24)* — the glossary describes two things
  iteration 8 replaced. Its `cellar` table says of `beerId` "Cellar responses
  never embed a `Beer` object" (`docs/glossary.md:157`), but `EntryDto`
  (`backend/src/main/java/fi/kalia/cellar/web/EntryDto.java:13`) and
  `PublicCellarEntryDto` (`:13`) carry a `CellarBeerDto beer` and no `beerId`
  ([ADR-0083](../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)),
  and the published-vocabulary tables (`:153-174`) never name `beer` or
  `CellarBeerDto`. Its `ProfileRepository` row (`:86`) explains a
  `findFirst…OrderByCreatedAtDesc` lookup "because a Keycloak `sub` change can
  leave two rows sharing one username", citing ADR-0033; the method is now
  `findByUsernameIgnoringCase` (`profile/domain/ProfileRepository.java:14`)
  over a case-insensitively unique username (`V006__profile_schema.sql:18`,
  ADR-0080). The glossary is the vocabulary a second client's author reads
  first, and both rows state the opposite of the wire and the schema.
- **MUST-18** *(confirmed 2026-10-24)* — the sign-up rate limiter can create
  its counter with no expiry, locking every future sign-up out until someone
  deletes the key by hand. `createSignUpRateLimiter`
  (`frontend/features/auth/signUpRateLimit.ts:29-30`) runs `SET NX EX` and,
  when the key already exists, a separate `INCR`; if the window's key expires
  between the two, `INCR` creates `auth:sign-up-rate` at 1 with no TTL, and
  after 20 more attempts every sign-up answers `rate-limited` for good. The
  comment above it (`:22-26`) claims exactly this failure is impossible, and
  ADR-0055:73 describes the mechanism as `INCR`+`EXPIRE`, which the code's
  comment says it rejects — the ADR and the code disagree with each other as
  well as with what is safe. Low odds per window, permanent effect. Fix: `INCR`
  then `EXPIRE … NX` (or one `MULTI`/Lua step), a test where the key expires
  between the two calls, and an ADR-0055 amendment.

## SHOULD

- **SHOULD-16** *(confirmed 2026-10-24)* **[needs decision]** — the deliberate
  no-cross-schema-foreign-keys rule leaves a catalog beer's disappearance
  handled only by dropping the row on read, so the entry and its bottles stay
  in the database permanently, invisible to their owner, with no cleanup and
  no test. [Iteration-8 task 10](iteration-8/10-cellar-reads-joined-in-the-backend.md)
  moved the cellar's drop server-side, where it now logs a WARN
  (`backend/src/main/java/fi/kalia/cellar/application/CellarService.java:78-93`);
  the feed still drops silently
  (`backend/src/main/java/fi/kalia/feed/application/FeedService.java:132-144`).
  The backend's sole defence is still the assumption that "nothing deletes
  catalog beers" (`CellarService.java:106-107`), while `docs/architecture.md:226-227`
  now says every Wikidata row can be "found, or removed, in one statement".
  §8's "Trade-offs made explicit" does not list this cost. What is open is the
  policy: a catalog deletion event driving cellar cleanup, a stated-and-tested
  no-hard-delete invariant, or accepted orphans written into §8. User-added
  beers (SHOULD-67) make a removal path more likely to be wanted.
- **SHOULD-20** *(confirmed 2026-10-24)* **[needs decision]** — the rationale
  for taking on the two Radix dependencies is stated at length in four places
  and the copies already disagree: `README.md:208-212` cites the 2026-08-22/23
  amendments, `frontend/README.md:286-295` adds 2026-09-04 and says the toast
  serves only "the removal outcome toast" though
  `features/profile/VisibilityControl.tsx` uses it too (as
  `docs/architecture.md:516` says), and `docs/architecture.md:469-473` and
  ADR-0021 carry their own. Reconfirmed 2026-10-24 at `README.md:212-216`,
  `frontend/README.md:294-303`, `docs/architecture.md:593-596` and `:638-641`;
  iteration 8's `features/catalog/JustAdded.tsx` is a third toast user, so the
  frontend README's copy is further off. The version-pin half of the original finding is
  resolved — only ADR-0021:120/138 keep numbers, matching `package.json`.
  Neither ADR-0020 exception applies; which home wins is a product-owner call.
- **SHOULD-25** *(confirmed 2026-10-24)* **[needs decision]** —
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
  from a deployable one, is still an open decision. Reconfirmed 2026-10-24
  (the reset is now `scripts/seed-keycloak-account.mjs:69-74`, admin/admin also
  at `docker-compose.yml:162-163` and `:221-222`). Same class, found
  2026-10-24: the realm file ships the `kalia-swagger` public client
  unconditionally (`keycloak/realm-export.json:75-101`, redirect hard-coded to
  `localhost:8080`), so every realm it configures lets any user mint
  `kalia-backend`-audience tokens outside the BFF's session lifecycle, though
  springdoc itself is off by default.
  **The missing `bruteForceProtected` half of this finding was lifted
  2026-09-12 into
  [iteration-7 task 11](iteration-7/11-keycloak-brute-force-protection.md)**
  and is no longer part of what remains here.
- **SHOULD-26** *(confirmed 2026-10-24)* **[needs decision]** — Valkey holds
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
  Widened 2026-10-24: `revokeRefreshToken: false` (`keycloak/realm-export.json:14`,
  relied on in `frontend/lib/api/accessToken.ts:31-33`) means a refresh token
  read out of Valkey replays alongside its legitimate holder for the whole
  SSO session with no reuse detection — the same question the mobile client's
  refresh design (iteration 9) has to answer for a token on a device.
- **SHOULD-27** *(confirmed 2026-10-24)* **[needs decision]** — narrowed:
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
  choice. Corrected 2026-10-24: the `/sign-up` limiter gates only Kalia's own
  button; a script posting straight to Keycloak's
  `/protocol/openid-connect/registrations` bypasses it, as ADR-0055:120-126
  records, so self-registration is unthrottled too — which is what makes
  SHOULD-66 and SHOULD-67 cheap to exploit. The back-channel route's body
  limit is not covered by `proxyClientMaxBodySize` either, because the proxy
  matcher excludes `api` (`frontend/proxy.ts:33`).
- **SHOULD-29** *(confirmed 2026-10-24)* — `CatalogController` documents no
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
  caught only in that PR's human review. Reconfirmed 2026-10-24: iteration 8's
  `POST /beers` (`CatalogController.java:125-153`) documents its codes, but
  the seven GET handlers, `searchBeers` (`:80`) and `getBeer` (`:108`)
  included, still document none.
- **SHOULD-30** *(confirmed 2026-10-24)* **[needs decision]** — `HttpBoundaryTest`'s
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
  product-owner call. Reframed 2026-10-24: there are now five advice classes
  (`profile/web/ProfileExceptionHandler.java` joined), and iteration 8 began
  using the exact path this finding warns about —
  `CatalogExceptionHandler.java:33,40,63` calls `ProblemDetail.setProperty(...)`,
  today with ids and DTOs. That weakens the first remediation: widening the
  predicate to `@ExceptionHandler` methods checks return types, which are
  always `ProblemDetail`, and would never see an entity passed to
  `setProperty(Object)`. The live options are a rule on `setProperty` call
  arguments, or accepting discipline with the comment. SHOULD-63 is the
  related question of declaring those extension properties at all.
- **SHOULD-31** *(confirmed 2026-10-24)* **[needs decision]** — `CLAUDE.md` is
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
  is a product-owner call and an ADR, not a trim. Reconfirmed 2026-10-24 at
  266 lines and still growing: 260 at 188893d, 262 after 620912a, 266 after
  ed31a16 (#391's ADR-0084 bullet); no PR since the last sweep removed a line,
  and iteration 9 plans to add the Expo warning and the no-new-costs rule.

- **SHOULD-40** *(confirmed 2026-10-24)* **[needs decision]** — `profile`
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
  use with ArchUnit. Reconfirmed 2026-10-24 at `ProfileController.java:70-84`:
  `currentUsername` (`:76-84`) is a copy of `CurrentUserService.java:40-46`
  down to the exception message, so the two can drift. A new `kalia-mobile`
  Keycloak client (iteration 9) is where an unexpected token shape would first
  arrive.
- **SHOULD-45** *(confirmed 2026-10-24)* **[needs decision]** — the
  public-cellar visibility rule lives in the web layer:
  `PublicCellarController.java:49-52` resolves visibility and throws, while
  `CellarService.readPublicCellar` (`CellarService.java:31-35`) loads any
  user's cellar by id unchecked. `feed` enforces the same rule in its
  application layer (`FeedService.java:114-123`). Moving it conflicts with
  `backend/README.md:237-238` ("a public read takes a resolved owner id").
- **SHOULD-47** *(confirmed 2026-10-24)* **[needs decision]** — the feed
  cursor's signing key is generated per process, in memory
  (`feed/application/FeedCursorCodec.java:12-35`), contradicting "must not
  prevent horizontal scaling" (`docs/architecture.md:44`), with no ADR or §8
  entry recording the choice. Every restart invalidates every cursor; with two
  instances, a `since` poll landing on the other one gets a 400 that
  `frontend/features/feed/actions.ts:37-52` turns into `startOver` and
  `FeedList.tsx:79-83` into `window.location.reload()` — every 15 s. A mobile
  offline cache would hold dead cursors. Widened 2026-10-24: ADR-0060 says a
  second backend instance "needs nothing extra"
  (`docs/adr/0060-feed-delivery-is-polling.md:77-79`) and lists it as a Good
  consequence (`:162-164`), which the cursor key makes false; ADR-0081:128-130
  separately accepts a single-instance assumption for event resubmission
  (`EventPublicationResubmission.java:47-51`). Neither appears in §8, while §1
  (`docs/architecture.md:52`) says the design must not prevent horizontal
  scaling — the fix should add an §8 entry naming both.
- **SHOULD-53** *(confirmed 2026-10-24)* — the root README's "in roadmap
  order" feature list (`README.md:122-146`) never mentions iterations 9–14,
  which make mobile Kalia's primary UI (`docs/roadmap.md:27-36`, `:70-75`) —
  the biggest planned change of direction. Same class as retired SHOULD-21.
  Narrowed 2026-10-24: `README.md:143-146` now lists iteration 9, but not
  10–14 or that mobile becomes the primary UI.
- **SHOULD-54** *(confirmed 2026-10-24)* **[needs decision]** —
  `docs/ci-playbook.md:184-188` says `docker compose up --wait` on a one-shot
  service (`keycloak-config`) exits 1 and to "name only long-running
  services", but `README.md:112`, ADR-0054:65,
  `scripts/check-keycloak-realm-config.mjs:267` and `Makefile:76` all pass
  `--wait` with `keycloak-config`. One side is wrong; local Compose is now
  v5.5.1, so the playbook entry may no longer hold. Reconfirmed 2026-10-24
  (`docs/ci-playbook.md:189-193`, `Makefile:79`), and the two gates now
  disagree on the same step: CI follows the playbook and leaves
  `keycloak-config` out of its `--wait` (`.github/workflows/ci.yml:239`).
- **SHOULD-55** *(confirmed 2026-10-24)* — the per-issue Definition of Done
  is stated twice and the copies differ: the full list at
  `docs/roadmap.md:38-48`, a three-item subset at `docs/architecture.md:699-700`
  (also out of place in a "shape" document). Retired SHOULD-5 covered the
  *iteration* DoD, not this.
- **SHOULD-56** *(confirmed 2026-10-24)* **[needs decision]** — no CI check
  blocks a merge: the repository's one ruleset has no
  `required_status_checks` and `dev` has no legacy branch protection. PRs
  #233, #234 and #240 merged with E2E red on their head commit, #248 merged
  while E2E was still running and went red ten minutes later, and #240 left
  `dev` red until #241. #343 asked for "Heading check" to be made required and
  nothing changed. ADR-0046 and the `make verify` gate treat CI as the
  backstop, but GitHub enforces none of it. The ruleset is the product
  owner's; jobs the `changes` filter skips must still count as passing.
  Reconfirmed 2026-10-24 with seven more: #371 and #373 merged with the CVE
  scan red on a CRITICAL Next.js RCE (GHSA-673q-mjm6-r5xr), #388 with it red
  on the zod CVE, #382 with E2E cancelled, and #386, #390 and #392 with E2E
  red; `dev` went red after #377 and #386. The ruleset (19027809) still has no
  `required_status_checks`.
- **SHOULD-57** *(confirmed 2026-10-24)* **[needs decision]** — fixed host
  ports (`docker-compose.yml:39, 78, 98, 145, 234, 252`) plus one worktree per
  session mean the Docker half of `make verify` is routinely not run: #211,
  #224, #226, #245, #250, #256 and #268 skipped or were blocked on it because
  another stack held the ports, #295 waited ~30 minutes and shipped without
  `api-drift`, `keycloak-check` or E2E, and in #315 the product owner had to
  stop another stack. `implement-task` (`SKILL.md:110`) already lets
  `verify-fast` stand in, contradicting `CLAUDE.md`'s "`make verify` green
  before a PR". Options: per-worktree port overrides, a stack lock, or making
  CI the Docker gate officially — which only works with SHOULD-56.
  Reconfirmed 2026-10-24 by five more: #362 (ports remapped by hand,
  `keycloak-check` and E2E not run), #381 (`api-drift` failed on a sibling's
  port 5432), #382 (waited for a sibling to release the ports), #384 (`make
  verify` run in parts) and #385 (E2E and `keycloak-check` not run).
- **SHOULD-58** *(confirmed 2026-10-24)* — gate verdicts have no slot in the
  PR template, so the durable record shows the code-review gate skipped in
  roughly a third of code PRs. `implement-task`'s Gates section
  (`SKILL.md:95-117`) and ADR-0046 require the `pwd`/range lines and a verdict
  per gate ("a gate with no verdict counts as skipped"), but
  `docs/PULL_REQUEST_TEMPLATE.md:45-67` has no section for them, and "or the
  final message" lets the report vanish with the session. No `/code-review`
  verdict appears in #212, #217, #219, #229, #237, #241, #244, #247, #256,
  #263, #266, #273, #275, #283–#287, #293, #319 or #353; the `pwd`/range lines
  only in #311–#314, #336, #338 and #342. Reconfirmed 2026-10-24: no
  `/code-review` verdict in #382 or #385, and the `pwd`/range lines in none of
  the 22 non-Dependabot PRs #358–#392.
- **SHOULD-59** *(confirmed 2026-10-24)* — the iteration-close checklist
  (`CLAUDE.md` "Iteration DoD gate", `implement-task` step 11,
  `SKILL.md:86-91`) names only `docs/roadmap.md`'s Status, so the README
  status and feature list and `docs/architecture.md`'s "Next" line drift at
  every close: #196 (product owner: "Update status in README.md"), #231 and
  #306 were each follow-up doc-sync PRs for iterations 5.5, 6 and 7, and
  SHOULD-12 was the drift still standing after 7 and 7.5 (lifted into
  [iteration-8 task 16](iteration-8/16-docs-describe-what-is-built.md), which
  fixes the drift but not this cause). Rechecked 2026-10-24: the iteration-8
  close (#392) updated README, `docs/architecture.md` and the roadmap together
  with no follow-up PR, because task 16 had cleared the drift first — but the
  checklist still names only the roadmap's Status, so the cause stands.
- **SHOULD-60** *(confirmed 2026-10-24)* — `CLAUDE.md`'s "A decision earns an
  ADR" bullet states only ADR-0032's first test, not its 2026-08-08 and
  2026-09-04 amendments (the task file or another existing home is enough;
  ADR-0032:114-131). The product owner has had to have an over-eager draft
  ADR dropped twice before merge: a bottle-removal ADR in #218 (57f5cef), which
  produced the amendment, and a worktree-isolation ADR in #248 (91cf5eb,
  "environment notes would be enough") a week later — both numbers since
  reissued to other decisions. A same-length rewording fixes it, which matters under SHOULD-31.
  Reconfirmed 2026-10-24 (`CLAUDE.md:198-201`); `docs/adr/README.md:10-14`
  does state the task-file test, so the two pointers now disagree with each
  other as well.
- **SHOULD-61** *(confirmed 2026-10-24)* **[needs decision]** —
  `CatalogService.listBreweries`
  (`backend/src/main/java/fi/kalia/catalog/application/CatalogService.java:45-52`)
  loads every brewery with `findAll()`, sorts them in Java with
  `String.CASE_INSENSITIVE_ORDER` and only then paginates, so a request for one
  page of 20 hydrates the whole table. Against the 20 seeded breweries that
  cost nothing; once [iteration-8 task 17](iteration-8/17-seed-the-catalog-from-wikidata.md)'s
  Wikidata import lands (PR #360) it is about 4,914 entities per
  `GET /api/v1/breweries`, which `SecurityConfig` serves anonymously, so every
  anonymous request pays it. [Task 08](iteration-8/08-catalog-search-bounded-end-to-end.md)'s
  10,000-row offset cap does not bound this: the cost is the table, not the
  page, and grows with every brewery added. [Task 02](iteration-8/02-add-beer-api.md)'s
  brewery lookup by name will lean on the same data. The sort is in Java
  deliberately — the code comment says DB collations disagree on punctuation
  (e.g. "d'Orval"), and the Java order keeps the API ordering the same in every
  environment — so the Java order is the contract any fix has to keep. Options,
  not ranked: an `ORDER BY` under an ICU or `"C"`-collated expression, with the
  page cut by the database; a stored sort key column (the normalised name,
  maintained by the import and by task 02's create flow) with an index, which
  makes the order independent of collation; or leaving the sort as is and
  accepting the cost, with the catalog's size stated as a limit. Each changes
  what "the order" means at the edges (accents, punctuation), which is the
  product owner's call. Widened 2026-10-24 (now `CatalogService.java:64-74`):
  the `query` branch does the same — `findByNameContainingIgnoreCase`
  (`BreweryRepository.java:11`) is an `upper(name) LIKE '%x%'` no index
  serves, hydrating every match before the page is cut — and the add-beer
  form's brewery field calls it on every debounced keystroke
  (`features/catalog/BreweryField.tsx:40-45`), so typing "b" loads and sorts
  thousands of breweries to show 8. ADR-0045's own revisit trigger
  (`docs/adr/0045-brewery-list-paginates-in-application.md:76-78`) has fired —
  `docs/architecture.md:54` records the brewery list over budget, at 1,112 ms
  p95 against a generated 54k breweries in ADR-0078's 2026-10-24 measurement —
  yet ADR-0045 is still `accepted`
  and `docs/architecture.md:452-454` still presents its approach as the
  convention.
- **SHOULD-62** *(confirmed 2026-10-24)* — the glossary restates each
  module's dependencies, and the copy has already drifted: its `cellar`
  section says `cellar` reads "`catalog` (beer existence)" (`docs/glossary.md:91-92`)
  while §3 now says "beer existence; name, brewery, style and strength"
  (`docs/architecture.md:143`), with the same per-module prose at `:47`, `:78`
  and `:107`. Only §2/§3 are guarded by `ArchitectureDocumentationTest`, so
  the second copy drifts unseen; replace it with a pointer to §3.
- **SHOULD-63** *(confirmed 2026-10-24)* **[needs decision]** — the error
  bodies the API sends are not what its OpenAPI spec describes. Every error
  response is declared as plain `ProblemDetail`
  (`backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:134-149`),
  whose generated type nests extra fields under `properties`
  (`frontend/lib/api/generated/models/problemDetail.ts:15`), while `errors`,
  `existingBeerId` and `existingBreweryId` arrive at the top level
  (`CatalogExceptionHandler.java:33,40,63`, `web/GlobalExceptionHandler.java:51`)
  and are named only in prose. The frontend hand-parses them
  (`frontend/features/catalog/api.ts:71-100`, whose comment says the generated
  type is wrong). The field-error item is also defined twice —
  `web/FieldErrorDto.java:3` and `catalog/web/FieldViolationDto.java:3-4`, the
  second only to avoid a `catalog` → `web` edge — with the "Validation
  failed" detail duplicated (`GlobalExceptionHandler.java:50`,
  `CatalogExceptionHandler.java:62`), so a catalog 400 and a Bean Validation
  400 can drift with no test noticing. Iteration 9 generates a second client
  from this spec and would inherit the wrong type and the hand-parsing.
  Options: declared problem schemas per error kind with one shared field-error
  type (making `fi.kalia.web` a shared Modulith module, or moving the type);
  or a springdoc customizer that lets `ProblemDetail` carry top-level extra
  fields, leaving them untyped but no longer wrong. Related to SHOULD-29
  (missing codes) and SHOULD-30 (`setProperty`), not the same.
- **SHOULD-64** *(confirmed 2026-10-24)* **[needs decision]** —
  `GET /api/v1/beers/batch` (`CatalogController.java:114-123`, anonymous via
  `PublicRoutesIT.java:33`) has no consumer left: the generated
  `getBeersByIds` has no caller outside generated code since ADR-0083 moved the
  cellar join into the backend. Yet `docs/architecture.md:338` and the
  operation's own description (`:115-118`) still present it as the endpoint
  "for a client enriching a list it holds (e.g. a cellar)", against ADR-0083
  and §5 (`docs/architecture.md:543-546`), which say no client rebuilds a join.
  It keeps a second beer-summary path alive (`CatalogService.getBeers`
  `:53-55` beside `getBeerSummaries` `:57-62`) and a batch cap duplicated in
  `CatalogApi.java:17-19`. Under iteration 9's additive-only policy an unused
  public endpoint becomes permanent once mobile v1 ships. Remove it first, or
  keep it as a deliberate enrichment resource and reconcile §4/§5 and
  ADR-0083. Same class as COULD-40.
- **SHOULD-65** *(confirmed 2026-10-24)* **[needs decision]** — a
  well-formed but unlisted `countryCode` in the catalog URL shows the error
  page instead of the "ignored filter" note iteration-8 task 08 promised.
  `frontend/features/catalog/searchParams.ts:10` and `:49` accept any
  `[A-Z]{2}`; the backend refuses an unlisted one with 400
  (`backend/src/main/java/fi/kalia/catalog/application/CatalogService.java:35-38`);
  `frontend/features/catalog/api.ts:36-37` throws, and `/en/beers?countryCode=ZZ`
  falls to `app/[locale]/error.tsx`. `e2e/search-bounds.spec.ts` tests only
  `countryCode=belgium`, which fails the format check first. Options: the
  normaliser checks against `GET /countries`; the page treats a search 400 as
  an ignored filter; or the backend answers an unlisted code with an empty
  page.
- **SHOULD-66** *(confirmed 2026-10-24)* **[needs decision]** — one account
  can make an anonymous read arbitrarily expensive. `AddBottleRequestDto.java:22-29`
  caps a request at 24 bottles, but nothing caps a user's entries or bottles,
  and both the owner's `GET /cellar` (`CellarController.java:51-55`, "Not
  paginated") and the anonymous `GET /api/v1/cellars/{username}`
  (`PublicCellarController.java:56-61` → `CellarService.java:45-48`) load every
  entry with every bottle (`EntryRepository.java:18-20`), then one catalog
  query per 100 beers (`CatalogApi.java:28-34`). An account that scripts adds
  (self-registration is unthrottled, SHOULD-27) and makes its cellar public
  turns that URL into a multi-megabyte anonymous response anyone can request
  in a loop, and floods the anonymous front-page feed with `BottleAdded` lines
  on the way. Against ADR-0042's "every request parameter bounded": ADR-0083
  bounded the call count, not the size. Options: paginate the public read, cap
  entries or bottles per cellar, collapse a single owner's feed lines, or
  accept it and state the limit.
- **SHOULD-67** *(confirmed 2026-10-24)* **[needs decision]** — user-added
  beers and breweries have no throttle, quota, moderation or removal path, and
  reach everyone at once. `POST /api/v1/beers` (`CatalogController.java:125-153`,
  authenticated only) → `ContributionService.java:26-35` puts a new beer into
  anonymous search and a new brewery into the public list immediately; the
  duplicate key is folded name plus country, so a script inventing names is
  never refused. `contributor_id` is stored (V003), but nothing uses it to
  clean up. One account can fill the shared catalog with junk or offensive
  names, and the only remedy is SQL by hand. Options: a per-contributor rate
  or quota, a moderation queue, or an admin delete-by-contributor — the last
  meets SHOULD-16's orphan policy.

## COULD

- **COULD-18** *(confirmed 2026-10-24)* — `X-Content-Type-Options: nosniff` is
  the one standard header missing from ADR-0016's otherwise deliberate set
  (CSP, `X-Frame-Options`, `Referrer-Policy`, HSTS, `Permissions-Policy`), and
  the ADR does not record it as considered-and-rejected.
  `frontend/next.config.ts:24`. Hardening rather than a hole — nothing serves
  sniffable content today — but with `script-src 'unsafe-inline'` accepted, the
  CSP would not stop a sniffed-into-HTML response. Reconfirmed 2026-10-24
  (`frontend/next.config.ts:14-27`); the same file also leaves
  `poweredByHeader` on, so every response still advertises `X-Powered-By:
  Next.js` — one `next.config.ts` change covers both.
- **COULD-20** *(confirmed 2026-10-24)* **[needs decision]** — a
  caller-supplied `Authorization` header silently overrides the session's
  token: `withAccessToken` returns `options` untouched when one is already set
  (`frontend/lib/api/mutator.ts:81-88`). No call site sets one today, so it is not
  exploitable now; it becomes exploitable the first time any header value
  derives from request input, at which point the BFF forwards a
  caller-chosen bearer token verbatim. The comment argues an override is easier
  to diagnose than a silent overwrite — diagnosability against a hard "session
  token always wins" invariant is a judgement call.
- **COULD-21** *(confirmed 2026-10-24)* — the waiver policy `.trivyignore`
  states ("a reason and a 30-day expiry … expiring forces a revisit") cannot be
  enforced by the file format it is written in: Trivy honours `expired_at` only
  in the structured `.trivyignore.yaml`, so in the plain format an expiry is a
  comment Trivy ignores and a waiver stays suppressed forever. `.trivyignore:2`.
  Latent, not live — the file currently holds zero waiver entries.
- **COULD-22** *(confirmed 2026-10-24)* — `jose` is a direct runtime
  dependency verifying back-channel logout tokens
  (`frontend/lib/auth/backchannelLogoutToken.ts`) that appears nowhere in the
  root README's tech-stack inventory, which CLAUDE.md requires. The i18next
  half of the original finding is resolved (531c5dc took the version out of
  the README).
- **COULD-23** *(confirmed 2026-10-24)* — the root README's "Repository layout
  (planned)" heading describes a layout that is built, and still annotates
  `cellar/` as "(iteration 5)"; the tree also omits `docs/ci-playbook.md`,
  `docs/PULL_REQUEST_TEMPLATE.md`, `docs/design.md`, `docs/glossary.md`,
  `keycloak/`, `scripts/` and the `Makefile`. `README.md:276-294`.
  Reconfirmed 2026-10-24 at `README.md:280-298`, which now also omits
  `docs/common-failures.md`, and whose per-module "(iteration N)" tags restate
  §3's module list.
- **COULD-24** *(confirmed 2026-10-24)* — the ADR index's gloss for ADR-0021
  repeats a claim the ADR has amended away twice: "three shared primitives, no
  new dependency" (`docs/adr/README.md:133-135`) against seven primitives in
  `frontend/components/ui/` and two Radix dependencies. The frozen ADR *title*
  legitimately keeps the original wording, but `docs/adr/README.md:16` states
  this file carries "a one-line gloss rather than a second copy of these
  titles", so the gloss is free to describe current reality.
- **COULD-25** *(confirmed 2026-10-24)* — the ADR index's auth group says
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

- **COULD-30** *(confirmed 2026-10-24)* **[needs decision]** — removing a
  beer's last bottle deletes the entry (`CellarService.java:55-63`), `Entry`
  has no `@Version`, and `bottle.entry_id` is `ON DELETE CASCADE`
  (`V005__cellar_schema.sql:23`). If a concurrent `addBottles` for the same
  beer (`:40-45`) commits first, the delete cascades over the bottle just
  added — a request that already returned 201, whose `BottleAdded` feed line
  stays. Only the owner can trigger it (two tabs), but the loss is silent.
- **COULD-36** *(confirmed 2026-10-24)* — feed timestamps never update:
  `FeedList.tsx:36` freezes `renderedAt` once for every row (`:186`),
  including lines polled in later, and `formatRelativeInstant` clamps a
  negative age to zero (`lib/relativeInstant.ts:26`), so a line polled in
  three hours after load says "just now" and older lines never age.
- **COULD-38** *(confirmed 2026-10-24)* — accepted ADRs still cite the
  removed store and false compose facts with no `Amended` note: ADR-0002:8 and
  :24-25, ADR-0003:15-16 and :21-23, and ADR-0007:59-60 cite cart, ordering and
  payment; ADR-0003 says "docker-compose publishes only Next.js" though the
  backend is published on `127.0.0.1:8080` (`docker-compose.yml:33-36`); and
  ADR-0007's ports-and-adapters deferral names only removed modules as its
  trigger.
- **COULD-39** *(confirmed 2026-10-24)* — `docs/architecture.md:402-404` says
  server components call `kaliaFetch` "directly"; none does — they go through
  the feature's `api.ts` and the generated client, as `:422-425` and
  `frontend/README.md:200-203` say. Nearby, `app/[locale]/(home)/page.tsx:47-127`
  holds the pitch and empty-state markup, against "`app/` route files stay thin
  and delegate" (`docs/architecture.md:386-387`).
- **COULD-40** *(confirmed 2026-10-24)* **[needs decision]** —
  `GET /api/v1/me` (`IdentityController.java:28-36`) has no production
  consumer — only e2e and a mutator test — yet returns email and full name
  (`CurrentUser.java:8`), though ADR-0071 says Kalia names people by username
  only. Remove it, or narrow what it returns.
- **COULD-41** *(confirmed 2026-10-24)* **[needs decision]** — ADR-0012 chose
  orval for its TanStack hooks (`:39-43`), but since ADR-0040 no component may
  use them, and `frontend/orval.config.ts:12` (`client: "react-query"`) still
  generates them unused; ADR-0040:107-112's complementary `server-only` marker
  was never added. Option: `client: "fetch"` and a `server-only` mutator.
- **COULD-42** *(confirmed 2026-10-24)* — the ADR index's gloss for ADR-0041
  cites `useCellarBottles` (`docs/adr/README.md:181`), which no longer exists;
  the hooks are `useAddBottle`/`useUpdateBottle`/`useRemoveBottle`
  (`features/cellar/hooks/useBottles.ts`).
- **COULD-43** *(confirmed 2026-10-24)* — `README.md:224-230` says "next
  16.3.3 declares fixed versions … now worth re-testing": next is 16.3.8, and
  both the version in prose and the open to-do have gone stale. Staler on
  2026-10-24: `README.md:228-234` still names 16.3.1 and 16.3.3 while
  `package.json` has next 16.4.1.
- **COULD-44** *(confirmed 2026-10-24)* **[needs decision]** —
  `README.md:262-268` restates the Dockerfiles' exact base-image tags and
  `README.md:250-259` the Gmail quota figures held in iteration-6.5 task 04,
  both against the "inventory, not a version list" rule.
- **COULD-45** *(confirmed 2026-10-24)* — `README.md:272` says CI builds and
  tests both apps "on every push", but `ci.yml:27-100` gates the backend,
  frontend, e2e and keycloak jobs on changed paths for non-`dev` branches.
- **COULD-46** *(confirmed 2026-10-24)* — `frontend/README.md:30` says "The
  five `AUTH_KEYCLOAK_*`/`AUTH_URL`/`VALKEY_URL` values"; there are six.
- **COULD-47** *(confirmed 2026-10-24)* — iteration indexes carry stale
  counts and claims: `docs/tasks/iteration-7.5.md:61` ("the other twelve";
  there are seventeen), `:100-102` (ADR-0021's "three primitives … today") and
  `:119-121` (the front page "today renders a static welcome");
  `docs/tasks/iteration-6.5.md:120` ("Four of the nine tasks"; there are
  seventeen).
- **COULD-48** *(confirmed 2026-10-24)* — `docs/tasks/backlog.md:17-18`
  parks likes and comments "once the feed (iteration 7) exists" — it exists —
  and `:188-189` says `app/api/` holds "only Auth.js's own routes", ignoring
  `backchannel-logout`. Widened 2026-10-24 — iteration 8 left four more of
  its items behind: "The frontend's import boundaries have no violating
  fixture" (`:120-131`) was delivered by iteration-8 task 14
  (`frontend/eslint-fixtures/boundaries/`, `eslint.config.test.ts`); "oldest
  vintage and last addition" (`:44-48`) is deferred because it "needs one
  request per beer", which ADR-0083's joined `GET /cellar` removed; the beer
  description item (`:59-64`) waits for iteration 8 to settle the data
  source, which it has (V008 inserts no description); and the mobile section
  (`:152-157`) says mobile is "planned after iteration 8" and that its
  decisions are being made "now, in iterations 5–8".
- **COULD-49** *(confirmed 2026-10-24)* — `docs/PULL_REQUEST_TEMPLATE.md`'s
  Test-plan examples (`:48-49`: `mvn clean verify`, `npm test`,
  `node scripts/check-tasks.mjs`) predate `make verify` as the one gate
  (ADR-0046), and its Doc-sync list (`:61-63`) omits the iteration index the
  `CLAUDE.md` doc-sync gate requires. Reconfirmed 2026-10-24: the list
  also adds "the two READMEs", which the gate (`CLAUDE.md:153-156`) does not
  name.
- **COULD-50** *(confirmed 2026-10-24)* **[needs decision]** — the sign-up
  limit "20 attempts per 10 minutes" is stated in `frontend/README.md:122-124`,
  `docs/ci-playbook.md:97-99` and ADR-0055:73 as well as in
  `features/auth/signUpRateLimit.ts:10-11`. Consistent today; which copies
  stay is a call.
- **COULD-51** *(confirmed 2026-10-24)* — a fresh worktree has no
  `frontend/node_modules` and the `worktree` skill's Start steps
  (`.claude/skills/worktree/SKILL.md:15-35`) don't install it: #200, #202 and
  #255 each recorded `verify-fast` failing until `npm ci` ran, and
  `docs/ci-playbook.md:194-205` documents the stale variant. Meanwhile the
  edit hook silently skips ESLint without it
  (`scripts/hooks/post-edit-check.mjs:39`, `:48`) — since #353 moved the
  heading rule into ESLint, a silent gap at edit time.
- **COULD-52** *(confirmed 2026-10-24)* **[needs decision]** — `make verify`
  claims to run "every check CI runs" (`Makefile:1-5`, `:85`, `CLAUDE.md`
  "Commands", `implement-task` step 9) but leaves out the Trivy scan in
  `.github/workflows/vulnerability-scan.yml`, and ADR-0046 does not record the
  exclusion. CI reported the scan red only after the push on #243 (0b86530),
  #306 (ad80da6), #309 (8662580) and #327/#328. Add it, or correct the claim.
  Reconfirmed 2026-10-24 by three more: #371, #373 and #388 found the scan red
  only in CI, and #372 reproduced Trivy by hand to confirm its fix.
- **COULD-53** *(confirmed 2026-10-24)* — the refinement skills say
  "task-file edits only, no code" (`.claude/skills/refine-iteration/SKILL.md:59-62`,
  `refine-task/SKILL.md:51-53`) while `CLAUDE.md` requires an unrelated CVE to
  be fixed "in place … never a second PR"; refinement PR #309 carried a
  `backend/pom.xml` Jackson override (8662580). The skills need the carve-out
  stated.
- **COULD-54** *(confirmed 2026-10-24)* — `profile-visibility.spec.ts`
  failed or flaked in #228, #233, #234, #240, #244 and #273; #244 and #273
  blamed account contention "already tracked as iteration-6 task 11", which had
  merged on 2026-09-04 (#226), and #328 found the real cause on 2026-10-09 —
  the optimistic update confirms before the save's POST returns, so the reload
  races the save. Five weeks to recognise, and still no `docs/ci-playbook.md`
  entry.
- **COULD-55** *(confirmed 2026-10-24)* — three process citations point at
  nothing: `.claude/skills/worktree/SKILL.md:34-35` cites "`implement-task`
  step 0" (there is none; dangling since ab0809e);
  `docs/PULL_REQUEST_TEMPLATE.md:53-54` says a browser check is "required for
  UI changes per CLAUDE.md", which no version of `CLAUDE.md` since 1977ec2 has
  said; and `implement-task` step 10 (`SKILL.md:75-77`) says the template
  "already requires" it — circular.
- **COULD-56** *(confirmed 2026-10-24)* **[needs decision]** — the `worktree`
  skill's Finish steps (`.claude/skills/worktree/SKILL.md:37-48`) wait for the
  product owner's merge, which happens after the session that opened the PR
  has ended, so they are unreachable by design: three merged or detached
  worktrees from separate sessions hold ~3.1 GB under `.claude/worktrees/`,
  plus an empty `remove-beer-price-291b12` directory from 2026-09-11.
  Reconfirmed 2026-10-24 with fresh occurrences: three more worktrees of merged
  PRs from separate sessions hold about 2.7 GB (`catalog-search-index-at-150k-c6d542`
  from #388, `services-own-setup-b0fee2` from #380, `sweet-hugle-d21cd2` from
  #392), alongside the same empty directory and a stray 0-byte
  `scratch_edit_tmp.py`.
- **COULD-57** *(confirmed 2026-10-24)* — ADR-0024 records the Trivy
  action's `v0.36.0` pin as `a9c7b0f…` (`docs/adr/0024-dependency-vulnerability-scanning.md:122`,
  `:153`), which is the annotated tag's *object*; the commit it points to, and
  what `.github/workflows/vulnerability-scan.yml:29`, `:43` and `:51` correctly
  pin, is `ed142fd…` (`git ls-remote … refs/tags/v0.36.0^{}`). The ADR is the
  record a reviewer checks a pin against, so it should name the commit. (This
  is what retired SHOULD-28 actually was.)
- **COULD-58** *(confirmed 2026-10-24)* **[needs decision]** — the frontend
  boundary rule lets every feature's `api.ts`/`types.ts` import the whole
  shared `lib/api/generated/models` folder (`frontend/eslint.config.mjs:119`,
  `:157-160`), across every backend tag, so `features/feed/types.ts` could
  re-export `EntryDto` and lint would pass, though ADR-0083 and §5
  (`docs/architecture.md:543-546`) say a feature reaches only its own tag. No
  violation today. Split orval's models per tag, or document that the
  boundary covers operations only.
- **COULD-59** *(confirmed 2026-10-24)* — two tables carry a redundant
  index: `feed.line.sequence_number` is already indexed by its `UNIQUE`
  (`backend/src/main/resources/db/migration/feed/V007__feed_schema.sql:18`)
  and gets a second `line_sequence_number_idx` (`:25`); `cellar.entry`'s
  `UNIQUE (user_id, beer_id)` already serves lookups by `user_id`
  (`cellar/V005__cellar_schema.sql:14`) beside `entry_user_id_idx` (`:17`).
  Extra write work on a feed table that is never pruned.
- **COULD-60** *(confirmed 2026-10-24)* — domain timestamps bypass the
  injected `Clock` that bottle dates use (`cellar/domain/Bottle.java:88-96`):
  `BottleAdded.occurredAt` (`cellar/domain/Entry.java:90`), `touch()` (`:125`)
  and the feed's 30-day cutoff (`feed/application/FeedService.java:74`,
  `:105`) call `Instant.now()`, so a test with a fixed clock still gets
  real-time events and cannot pin the feed window. `touch()` also duplicates
  `@UpdateTimestamp` on the same field (`Entry.java:52-53`).
- **COULD-61** *(confirmed 2026-10-24)* — `frontend/features/catalog/AddBeerDialog.tsx`
  (383 lines) holds the form state, the brewery-choice state machine
  (`:106-121`, `:204-215`), the mapping of server refusals onto fields
  (`:48-57`, `:130-135`), three outcome alerts (`:322-370`) and navigation
  (`:123-129`) in one component; the alerts and the brewery mode could be
  extracted and tested on their own.
- **COULD-62** *(confirmed 2026-10-24)* **[needs decision]** — `GET /styles`
  runs `SELECT DISTINCT b.style FROM Beer b`
  (`catalog/domain/BeerRepository.java:52-53`) over ~150k rows with no index on
  the raw column (only `lower(style)` is indexed), then sorts in Java
  (`CatalogService.java:77`), on every opening of the add-beer dialog
  (`features/catalog/actions.ts:43-46`). Anonymous-callable, and not in
  ADR-0078's latency table. Measure it first, a small styles lookup table, or
  an index-only path.
- **COULD-63** *(confirmed 2026-10-24)* — a user-added name may carry
  invisible and bidi characters, and the duplicate check does not fold
  compatibility forms. `AddBeerRequestDto.java:36-42`'s `\P{Cc}*` rejects only
  control characters, so `Cf` (U+200B, U+202E, U+2066–2069) passes;
  `catalog.fold_name` (`V003__catalog_schema.sql:10-12`) lowercases and strips
  punctuation but applies no NFKC, while the Wikidata generator folds with NFKC
  (`scripts/wikidata-migration.mjs:38`), so the two tiers disagree. "Guinness"
  plus a zero-width space, or a fullwidth "Ｇuinness", passes the 409 as a
  visually identical twin. React escapes output, so this is spoofing and
  pollution, not XSS. Reject `\p{Cf}` and NFKC-normalise in `fold_name`
  (an index rebuild).
- **COULD-64** *(confirmed 2026-10-24)* **[needs decision]** — signing in
  while already signed in links the new Keycloak account to the current
  Auth.js user and keeps the old user's tokens: with a live session, Auth.js
  links an unseen OAuth account to the signed-in user
  (`@auth/core/lib/actions/callback/handle-login.js:206-212`); `createdSession()`
  is then undefined, so `putSessionAccount` is skipped (`frontend/auth.ts:59-64`),
  `auth.ts:51-57` renames user A to B's `preferred_username`, and
  `valkeyAdapter.ts:170-172` maps B's `sub` to A permanently. On a shared
  browser, B then sees their own name while every backend call carries A's
  token. No sign-in action checks for an existing session (only the
  `/sign-up` page does, `app/[locale]/sign-up/page.tsx:25-26`). Reachable only
  with a live Auth.js session and a Keycloak login as someone else (e.g. after
  Keycloak's SSO idle timeout, which sends no back-channel logout); not
  reproduced live. Refuse sign-in when `auth()` has a session, sign out
  locally first, or re-file the token set in `events.signIn` when the account
  differs.
- **COULD-65** *(confirmed 2026-10-24)* **[needs decision]** — an access token
  outlives sign-out by up to its 5-minute lifespan
  (`keycloak/realm-export.json:11`): the backend checks signature, `exp`,
  `iss` and `aud` only (`SecurityConfig.java:84-99`). Harmless for the web,
  whose BFF deletes its token copy on logout (`valkeyAdapter.ts:211-226`), but
  a mobile client calling Spring directly keeps a lost device's token working
  after sign-out or an admin disable. Accept it as an §8 trade-off, shorten
  the mobile client's lifespan, or introspect on sensitive writes — an
  iteration-9 mobile-auth question.
- **COULD-66** *(confirmed 2026-10-24)* — Dependabot covers maven, npm and
  github-actions only (`.github/dependabot.yml:4-24`), not the Docker base
  images (`backend/Dockerfile:2,10`, `frontend/Dockerfile:2,10`,
  `keycloak/Dockerfile:1`) or the compose images (`docker-compose.yml:91, 156,
  213, 231, 247`), none of which is digest-pinned. Trivy catches CVEs, but a
  base-image fix arrives only when someone notices the scan red, and a
  re-tagged upstream image is pulled silently. Add a `docker` ecosystem entry
  and consider digests.
- **COULD-67** *(confirmed 2026-10-24)* **[needs decision]** — a quay.io
  `503` pulling `keycloak/keycloak:26.7.0` turns E2E red with no retry and no
  `docs/ci-playbook.md` entry: #386 (job 120770690484, and `dev` run
  40060122933 after the merge), #390 (job 120777477937) and #392 (job
  120780003417), each reported as `Process from config.webServer was not able
  to start`. The backend job already retries its image pull
  (`.github/workflows/ci.yml:143-150`, 279527e); the E2E and Keycloak jobs do
  not. All three fell in one outage of about 40 minutes. Pre-pull the compose
  images with the same retry loop, add a playbook entry only, or accept
  re-runs.
- **COULD-68** *(confirmed 2026-10-24)* — `CLAUDE.md:251` calls the
  not-adopted per-task review "a full four-dimension subagent review", but
  the sweep it is contrasted with dispatches five
  (`.claude/skills/quality-sweep/SKILL.md`, the fifth added by ADR-0051).
- **COULD-69** *(confirmed 2026-10-24)* — `docs/ci-playbook.md` has drifted
  from its own rule: its header says "Nothing here is the fix itself"
  (`:3-6`), yet `:212-221` restates the Lombok/JDK-25 trap and its
  `JAVA_HOME` fix from `backend/README.md:75-86`, and `:181-187` the Flyway
  checksum `down -v` recovery from `backend/README.md`; and `:87` says "five
  containers come up healthy" where `docker-compose.yml` runs six long-lived
  services.
- **COULD-70** *(confirmed 2026-10-24)* — `docs/architecture.md:868` says to
  run "a scratch `postgres:18.4`", a version pinned outside the manifests
  that hold it (`docker-compose.yml:91`, `TestcontainersConfiguration.java:16`),
  against ADR-0020's versions-in-manifests rule; it goes stale on the next
  bump.
- **COULD-71** *(confirmed 2026-10-24)* **[needs decision]** — the catalog's
  size is stated three times, not consistently: "~13.6k beers"
  (`docs/architecture.md:54`), "about 13.5k beers and 4.9k breweries imported
  from Wikidata" (`:167-168`), and ADR-0078:19's "about 13.6k beers" — 13.5k
  imported, 13.6k with the seeded rows. 51d5055 moved the latency figures into
  ADR-0078 alone and left these. Keep the figure in ADR-0078 only, or once in
  §3.
- **COULD-72** *(confirmed 2026-10-24)* — `docs/adr/README.md:190-193` lists
  ADR-0082 between 0071 and 0072 in the frontend group, out of the numeric
  order the rest of the index keeps.

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
- ~~COULD-35~~ (the front and profile pages counting bottles through the catalog-joining read) — no longer reproduces: since ADR-0083 `listCellarEntries` and `heldBottlesByBeer` share one backend-joined `readEntries()` call (`frontend/features/cellar/api.ts:14-30`), so the two cost the same and cannot disagree. Confirmed 2026-10-24.
