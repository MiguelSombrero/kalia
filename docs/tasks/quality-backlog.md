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

*None open — every MUST from the 2026-10-27 sweep was lifted into
[iteration 9](iteration-9.md).*

## SHOULD

- **SHOULD-68** *(confirmed 2026-10-27)* **[needs decision]** — any
  self-registered user can read `/actuator/prometheus` on the deployable
  stack: `docker-compose.base.yml:40` enables it outside the dev overlay
  (ADR-0088:51-55 says "local development only"), `SecurityConfig.java:60`
  requires only `authenticated()`, and the edge forwards every backend path.
  The frontend guards its own counters with `METRICS_TOKEN`. Move it to the
  dev overlay, require a role or scope, or put actuator on a management port
  the edge does not route.
- **SHOULD-69** *(confirmed 2026-10-27)* **[needs decision]** — the Keycloak
  master realm's admin console and token endpoint are served on the public
  edge (`edge/nginx.conf:128-131` forwards everything on 8081), no
  `KC_HOSTNAME_ADMIN` is set, and brute-force detection is configured only
  for the `kalia` realm (`keycloak/realm-export.json:21-28`), so the admin
  password is bounded only by the edge's per-address rate. Deny `/admin` and
  `/realms/master` at the edge (the host scripts then need an internal
  route), set `KC_HOSTNAME_ADMIN` to an unpublished address, or at least
  enable brute-force protection for master.
- **SHOULD-70** *(confirmed 2026-10-27)* — the deployable base still carries
  dev conveniences ADR-0089 meant to exclude: `KEYCLOAK_SMTP_HOST` defaults
  to `mailpit` with auth and TLS off (`docker-compose.base.yml:224-231`) and
  the base runs Mailpit with an unauthenticated API (`:263-280`), so a
  deployment that forgets SMTP starts cleanly and parks every reset link
  where loopback can read it; Postgres (`:115-117`) and Valkey (`:252-254`)
  are also published on host loopback. Move them to the dev overlay and make
  the SMTP values `:?`-required.
- **SHOULD-71** *(confirmed 2026-10-27)* — the Keycloak image is never
  scanned: `.github/workflows/vulnerability-scan.yml:41-69` builds and scans
  `backend`, `frontend` and `edge` only, though `keycloak/Dockerfile:1` is a
  custom build; the pulled `valkey`, `postgres`, `keycloak-config-cli` and
  `mailpit` images are not scanned either, so a HIGH/CRITICAL CVE in the
  most exposed component never fails the ADR-0024 gate.
- **SHOULD-72** *(confirmed 2026-10-27)* **[needs decision]** — a pending
  contribution blocks everyone else's identical one: duplicate lookups
  include other contributors' `PENDING` rows
  (`BreweryRepository.java:46-51`, `BeerRepository.java:38-44`), the 409
  offers that row (`ContributionService.java:52-56`, `:64-67`;
  `AddBeerDialog.tsx:344-365`), and choosing it 404s because
  `findVisibleById` hides it from anyone but its contributor. One account can
  hold 20 such names until an operator acts. ADR-0091 accepts the disclosure,
  not the dead end. Scope duplicates to approved plus own pending rows, give
  "pending elsewhere" its own anonymous 409, or record it as a trade-off.
- **SHOULD-73** *(confirmed 2026-10-27)* — the pending-cap 429 shows as
  "Could not add the beer. Please try again.": `features/catalog/api.ts:68-91`
  handles 201/400/404/409 and throws a generic error otherwise, so a
  contributor with 20 entries waiting retries forever. No frontend code or
  test mentions the cap. Recorded as "new task" in PR #452 and lost (see
  SHOULD-90).
- **SHOULD-74** *(confirmed 2026-10-27)* — a concurrent remove or update of
  one bottle can answer 500: `CellarService.ownerOf` (`:147-150`) loads the
  entry with bottles lazy, the bottles load in a second SELECT, and if
  another request deleted the bottle in between, `Entry.bottleWithId`
  (`Entry.java:116-122`) throws an `IllegalStateException` that is neither
  retried nor mapped. A double-clicked delete, or iteration 12's replayed
  offline write, triggers it. Fetch the bottles in the same query, or map
  the missing bottle to `BottleNotFoundException`.
- **SHOULD-75** *(confirmed 2026-10-27)* **[needs decision]** — someone who
  already holds a beer that became `REJECTED` or `REMOVED` can keep adding
  bottles to it: `CellarService.entryFor` (`:154-162`) checks
  `catalog.beerExists` only when no entry exists, against ADR-0091:34-36's
  "adding to a cellar" visibility rule, and each add writes a public feed
  line. `ContributionModerationIT:200` tests only a user with no entry.
  Refuse the add for holders too, or amend ADR-0091 to allow it.
- **SHOULD-76** *(confirmed 2026-10-27)* **[needs decision]** — rejecting a
  pending beer publishes what review withheld: while `PENDING`, the
  contributor's feed lines and public-cellar entry for it are hidden, but
  `CatalogService.getBeerSummaries` (`:67-81`) withholds only `PENDING`, so
  after `make moderate ACTION=reject` they appear — pinned by
  `ContributionModerationIT:165-178`, `:256-265`. Keep `REJECTED` withheld
  from public reads, or accept it in ADR-0091.
- **SHOULD-77** *(confirmed 2026-10-27)* **[needs decision]** — the backend
  and Keycloak both connect to Postgres as the bootstrap superuser `kalia`
  in the deployable definition (`docker-compose.base.yml:35-36`, `:112-114`,
  `:139-141`), so compromising either service, or any future injection,
  owns both databases. No ADR records it. Separate owner, DML-only and
  Keycloak roles, or accept it as a §8 trade-off.
- **SHOULD-78** *(confirmed 2026-10-27)* **[needs decision]** — the owner's
  whole-cellar read (`GET /cellar`, documented "Not paginated",
  `CellarController.java:51-56`) was kept whole for iteration 12's offline
  cache (8.5 task 11), but the web loads it on every signed-in catalog
  search, beer detail, front and profile page
  (`features/cellar/api.ts:28-37`; `app/[locale]/beers/page.tsx:62`,
  `beers/[id]/page.tsx:46`, `(home)/page.tsx:45`, `profile/page.tsx:32`) to
  mark ~20 beers or show two counts, and nothing caps entries per account.
  §8 does not list it. Cap the cellar, add a bounded held-counts/totals read,
  or paginate the owner read and give sync its own endpoint.
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
- **SHOULD-84** *(confirmed 2026-10-27)* **[needs decision]** — the root
  README's architecture diagram (`README.md:198-206`) draws `Browser --> Next`
  directly while `docs/architecture.md:82-92` routes every request through
  `edge`; it restates a shape §2 owns. Replace it with a pointer to §2, or
  add the edge and keep both in step by hand.
- **SHOULD-87** *(confirmed 2026-10-27)* **[needs decision]** — the
  iteration-by-iteration feature list is kept four times: `README.md:5-30`,
  `README.md:153-185`, `docs/architecture.md:24-51` and
  `docs/roadmap.md:54-74`; every iteration close edits all four. Shrink the
  README status blurb to a pointer, or accept the four-place edit.
- **SHOULD-91** *(confirmed 2026-10-27)* **[needs decision]** — the
  `worktree` skill's steps 2 and 3 do not run: eight worktrees with merged or
  detached work remain (`git worktree list`), and Gates `pwd` lines show
  sessions reusing old worktrees (#434/#445, #447/#450, #448/#451,
  #435/#452). The fix for COULD-56 (PR #434) did not take, because the
  desktop app creates a worktree per session. A `make prune-worktrees` called
  from `stack-env` or the pre-push hook, a SessionStart hook, or rewriting the
  steps around the app's lifecycle.

## COULD

- **COULD-26** *(confirmed 2026-10-11)* — Keycloak's password-reset page
  marks its username field `autocomplete="off"`, so a browser or password
  manager will not offer the username it already holds. Not a WCAG 2.2
  failure — the page asks for nothing to be recalled that 3.3.8 protects, and
  the login and registration fields carry proper `autocomplete` values — but
  it is stock `keycloak.v2` markup the theme does not touch
  ([ADR-0056](../adr/0056-branded-bilingual-keycloak-pages.md)).

- **COULD-61** *(confirmed 2026-10-27)* — `frontend/features/catalog/AddBeerDialog.tsx`
  (383 lines) holds the form state, the brewery-choice state machine
  (`:106-121`, `:204-215`), the mapping of server refusals onto fields
  (`:48-57`, `:130-135`), three outcome alerts (`:322-370`) and navigation
  (`:123-129`) in one component; the alerts and the brewery mode could be
  extracted and tested on their own.
- **COULD-65** *(confirmed 2026-10-27)* **[needs decision]** — an access token
  outlives sign-out by up to its 5-minute lifespan
  (`keycloak/realm-export.json:11`): the backend checks signature, `exp`,
  `iss` and `aud` only (`SecurityConfig.java:84-99`). Harmless for the web,
  whose BFF deletes its token copy on logout (`valkeyAdapter.ts:211-226`), but
  a mobile client calling Spring directly keeps a lost device's token working
  after sign-out or an admin disable. Accept it as an §8 trade-off, shorten
  the mobile client's lifespan, or introspect on sensitive writes — an
  iteration-9 mobile-auth question.
- **COULD-73** *(confirmed 2026-10-27)* — any cross-site link to
  `/api/auth/callback/keycloak` signs the visitor out:
  `app/api/auth/[...nextauth]/route.ts:6`, `:15-21` ends the session on any
  matching GET before Auth.js validates state or PKCE, and the `SameSite=Lax`
  cookie rides a top-level navigation. End the session only when this
  browser's sign-in state cookie is present, or after validation.
- **COULD-74** *(confirmed 2026-10-27)* — the back-channel logout endpoint is
  published on the edge (`edge/nginx.conf:77-81`) although its only caller,
  Keycloak, posts to `frontend:3000` over the compose network
  (`keycloak/realm-export.json:58`); return 404 for it at the edge.
- **COULD-75** *(confirmed 2026-10-27)* **[needs decision]** — the backend's
  10 r/s per-address zone does not bound anonymous backend load: the BFF
  calls `backend:8080` directly, so SSR pages and public Server Actions under
  the 150 r/s frontend zone (`edge/nginx.conf:40-44`, `:89-92`) drive about
  15 times that, against ADR-0090:106-108's "a bound a script cannot step
  around". Tighten the frontend zone for actions, limit in the backend by
  forwarded address, or correct the ADR.
- **COULD-76** *(confirmed 2026-10-27)* — `CellarService.readPublicCellar`
  (`:61-79`) reads counts and shown bottles in separate statements, and
  `:78`'s `shown.get(entry.getId())` is null if the owner deleted the
  entry's last bottle in between, so `PublicCellarEntryDto.from` throws a 500.
- **COULD-77** *(confirmed 2026-10-27)* **[needs decision]** — after an empty
  first feed page, `FeedList.tsx:60` polls with `since=""`, the backend treats
  it as no cursor and returns a backward `nextCursor`
  (`FeedController.java:83-94`, `FeedService.java:92`, `:100`), and
  `FeedList.tsx:107-108` adopts it as the forward one, walking deep history
  and delaying new public lines past ADR-0060's 60 s. Ignore the cursor on a
  cursor-less poll, or return a forward cursor for a since-less read.
- **COULD-78** *(confirmed 2026-10-27)* — `frontend/features/feed/actions.ts:21-24`
  and `:41-47` still say the cursor key is "minted fresh by a backend
  restart"; since 8.5 task 04 it is configured (`FEED_CURSOR_KEY`).
- **COULD-79** *(confirmed 2026-10-27)* — domain timestamps still bypass the
  injected `Clock` after 8.5 task 20 (which took COULD-60): `Instant.now()`
  in `catalog/domain/Beer.java:56`, `Brewery.java:48` and
  `EventPublicationResubmission.java:66`, and Hibernate VM timestamps in
  `Profile.java:35-39` and `FeedLine.java:57-61`.
- **COULD-80** *(confirmed 2026-10-27)* — `features/catalog/addBeerSchema.ts:11`
  refuses `\p{Cc}` but the server refuses `\p{Cc}\p{Cf}`
  (`AddBeerRequestDto.java:40`), so a zero-width space passes the client and
  comes back as the generic `refusedField` instead of `nameInvalid`.
- **COULD-81** *(confirmed 2026-10-27)* **[needs decision]** — `ProfileApi`
  publishes usernames only through cellar visibility
  (`ProfileApi.java:25-37`, `ProfileService.java:25-44`), which the feed
  uses as its only actor lookup (`FeedService.java:139-151`); any future
  event not about a cellar cannot name a private-cellar user without
  reshaping the API. Record it as a constraint on new event types, or split
  a username lookup from a visibility predicate first.
- **COULD-82** *(confirmed 2026-10-27)* — sign-in is implemented four times
  (`features/auth/actions.ts:26`, `catalog/actions.ts:29`,
  `profile/actions.ts:21`, `cellar/actions.ts:20-28`), each parsing the
  locale and building the post-sign-in redirect its own way; a plain helper
  in `lib/auth/` built on `lib/routes.ts` fits frontend/README's own
  "second user moves it to `lib/`" rule.
- **COULD-83** *(confirmed 2026-10-27)* **[needs decision]** — never-delete
  decisions are stacking up ahead of account deletion: usernames (ADR-0080),
  `contributor_id` (ADR-0091) and `feed.line.user_id` (ADR-0058) are kept
  forever by design, while `docs/tasks/backlog.md` lists GDPR account
  deletion as needed before store release. Record a tombstone or
  pseudonymisation strategy now, or accept the rework when deletion lands.
- **COULD-84** *(confirmed 2026-10-27)* **[needs decision]** —
  `docs/architecture.md:125-127` says `fi.kalia.web` holds only exception
  advice and error types, but it now also holds `RequestLogFilter` and
  `UnexpectedFailureDocumentation`; `ArchitectureDocumentationTest.java:87`
  calls it a module "with no dependency edges" though most modules depend on
  it. Widen §3 and ADR-0014 to "module-neutral web infrastructure", or move
  the filter to the base package.
- **COULD-85** *(confirmed 2026-10-27)* — `docs/architecture.md:628-631` says
  each feature reaches only its own tag's generated operations, but
  `eslint.config.mjs` lets `features/cellar/api.ts:10` import the
  `public-cellar` tag; name the exception in §5 and frontend/README.
- **COULD-86** *(confirmed 2026-10-27)* — `features/cellar/actions.ts:26`
  builds `` `/${locale}/cellar` `` by hand though `ownCellarHref` exists at
  `lib/routes.ts:16`, against `docs/architecture.md:642-644`.
- **COULD-87** *(confirmed 2026-10-27)* **[needs decision]** — ADR-0007's
  Decision body (`:71`) still cites "payment's `PaymentProvider`, ordering's
  state machine", which its own 2026-10-24 amendment (`:27-31`) says named
  dropped store modules. Drop the examples, or mark the amendment as
  superseding that clause.
- **COULD-88** *(confirmed 2026-10-27)* — smaller doc staleness:
  `docs/architecture.md:3` "Last updated: 2026-10-24"; `docs/tasks/iteration-8.5.md:49-52`
  groups tasks 01–20 and omits 21–22; `docs/tasks/iteration-9.md:77-78` keeps
  a "planned task" that only says it moved to 8.5; `docs/tasks/backlog.md:89`
  calls catalog search "full-text" (it is `pg_trgm` substring, ADR-0044),
  `:105-107` says the API binds `127.0.0.1:8080`, and decision 9 lists rate
  limiting as open despite ADR-0090; `README.md:264-270` ties the npm
  overrides to `next` 16.3.1 (now 16.4.3, re-test due);
  `README.md:337` says `docker-compose.dev.env` holds every secret, but
  `KALIA_FRONTEND_CLIENT_SECRET` still comes from `.env`.
- **COULD-89** *(confirmed 2026-10-27)* — limits restated outside their
  homes: the edge's 10 r/s in `backend/README.md:9-11` (ADR-0090 and
  `edge/nginx.conf:44` own it), and the 20-pending cap in
  `docs/architecture.md:282-283`, `:409` and `docs/adr/README.md:71`
  (ADR-0091 and `ContributionService.MAX_PENDING_ENTRIES` own it).
- **COULD-90** *(confirmed 2026-10-27)* — the "required CI checks" clause of
  the PR template's Local gate line cannot hold a verdict when the body is
  written: 8 of 9 task PRs record it pending (#433, #434, #445, #447, #448,
  #450, #451, #452), and the ruleset enforces those checks anyway. Drop it
  from the template and implement-task's Gates list.
- **COULD-91** *(confirmed 2026-10-27)* **[needs decision]** — three PRs in
  iteration 8.5 existed only to tick criteria checkable after merge (#414,
  #431, #446, for #399, #428, #417). Require criteria checkable before merge
  at refinement, or let the next task's or the close-out PR carry such ticks.
- **COULD-92** *(confirmed 2026-10-27)* — Trivy's Java DB mirror 404 failed
  runs 40166251873 (`dev`) and 40166341881 (PR #421) with a clean filesystem
  scan, and `docs/ci-playbook.md`'s vulnerability-scan section covers only
  CVE findings; add a "re-run, change nothing" entry.
- **COULD-93** *(confirmed 2026-10-27)* **[needs decision]** — `CLAUDE.md` is
  at 199 of ADR-0048's 200 lines, up from 191 three days earlier (#397 →
  #448), and ADR-0048 says a third overrun reopens the checker question.
  Reopen it now, or wait for the overrun.
- **COULD-94** *(confirmed 2026-10-27)* **[needs decision]** — ruleset
  19027809 requests Copilot code review on push, but no Copilot review
  appears on any of the 23 agent PRs in #394–#459, and no doc mentions the
  setting. Remove the rule, or find out why it does not run.

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
- ~~COULD-66~~ (Dependabot not covering Docker images) — lifted into [iteration-8.5 task 14](iteration-8.5/14-cve-gate-and-updates-trustworthy.md).
- ~~COULD-67~~ (a quay.io pull failure turning E2E red with no retry) — lifted into [iteration-8.5 task 17](iteration-8.5/17-ci-enforces-the-gate.md).
- ~~COULD-68~~ (CLAUDE.md calling the sweep four-dimension) — lifted into [iteration-8.5 task 08](iteration-8.5/08-claude-md-within-its-budget.md).
- ~~COULD-69~~ (the CI playbook restating fixes and miscounting containers) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-70~~ (`postgres:18.4` pinned in `docs/architecture.md` prose) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-71~~ (the catalog's size stated three times) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~COULD-72~~ (the ADR index's ordering) — lifted into [iteration-8.5 task 19](iteration-8.5/19-docs-match-iteration-8.md).
- ~~MUST-19~~ (frontend route-handler list omits the metrics route) — lifted into [iteration-9 task 18](iteration-9/18-docs-match-iteration-8-5.md).
- ~~MUST-20~~ (`frontend/README.md` generate step starts the wrong services) — lifted into [iteration-9 task 18](iteration-9/18-docs-match-iteration-8-5.md).
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
