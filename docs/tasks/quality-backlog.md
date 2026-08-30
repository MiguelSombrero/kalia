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

- **MUST-3** *(confirmed 2026-08-30)* **[needs decision]** — the binding
  convention "a service that needs the caller injects `CurrentUserService`
  rather than taking a principal parameter" has zero production instances, and
  the newest module does the opposite: `CellarService` threads `UUID userId`
  through all five public methods while `CellarController` resolves it via
  `IdentityApi`. `backend/README.md:203` vs
  `backend/src/main/java/fi/kalia/cellar/application/CellarService.java:29`.
  The next task to touch this, [iteration-6 task 02](iteration-6/02-public-cellar-api.md),
  reads a cellar for an *anonymous* caller, which is exactly where following
  the written rule produces wrong code. Either the code adopts the convention
  or the convention is rewritten to match the code.
- **MUST-4** *(confirmed 2026-08-30)* — the root README calls
  `@radix-ui/react-dialog` "the one UI dependency in an otherwise hand-written
  primitive set" while `@radix-ui/react-toast` is a second one, sanctioned by
  ADR-0021's 2026-08-23 amendment and never recorded in the README tech stack
  as CLAUDE.md requires. `README.md:175` vs `frontend/package.json:18`,
  `docs/architecture.md:286`, `frontend/README.md:206`.
- **MUST-5** *(confirmed 2026-08-30)* — `docs/architecture.md` contradicts
  itself about the API client: §4 says "the frontend may later generate its
  TypeScript client from the spec" (`docs/architecture.md:225`) while §5 says
  it already does, into a committed `lib/api/generated/` with a CI drift check
  (`docs/architecture.md:272`). A reader landing in §4 concludes the client is
  hand-written and may edit generated files that regeneration discards.
- **MUST-6** *(confirmed 2026-08-30)* — the ADR index labels ADR-0045's link
  "ADR-0046", so ADR-0046 appears twice under two different subjects and
  ADR-0045 never appears under its own number. `docs/adr/README.md:73` (target
  is `0045-brewery-list-paginates-in-application.md`; the real ADR-0046 is
  correctly listed at `docs/adr/README.md:171`). `check-adrs.mjs` validates
  link targets, not link labels, so it passes.
- **MUST-7** *(confirmed 2026-08-30)* — price is documented as a *built*
  search filter in two places, but the API has no price parameter:
  `docs/architecture.md:26` and `README.md:102` list it, while
  `CatalogController.searchBeers` accepts only `query`, `style`, `breweryId`,
  `country`, `minAbv`, `maxAbv`, `page`, `size`, `sort`
  (`backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:53`) and
  `docs/architecture.md:171`'s own endpoint listing already omits it. Price is
  display-only. (`README.md:104`'s *detail view* list is correct.)
- **MUST-8** *(confirmed 2026-08-30)* **[needs decision]** — two concurrent
  "add bottle" requests for the same beer end in a 500. `entryFor` does a
  read-then-insert with no handling for the `UNIQUE (user_id, beer_id)`
  constraint on `cellar.entry`, and no advice anywhere maps
  `DataIntegrityViolationException`, so the loser's commit fails unhandled and
  no bottles are persisted.
  `backend/src/main/java/fi/kalia/cellar/application/CellarService.java:98`.
  Catch-and-refetch, an `ON CONFLICT DO NOTHING` upsert, and a 409 are all
  defensible; which one depends on whether the second request should silently
  succeed or be told to retry.
- **MUST-9** *(confirmed 2026-08-30)* **[needs decision]** — "brewed in the
  future" is judged against the UTC date while the date picker offers the
  user's local date, so a user east of UTC cannot record a bottle brewed today
  during the first hours of every day. `todayIso()` is
  `new Date().toISOString().slice(0, 10)`
  (`frontend/features/cellar/bottleDateRules.ts:3`); the backend mirror uses
  `LocalDate.now()` in the container's UTC default zone
  (`backend/src/main/java/fi/kalia/cellar/domain/Bottle.java:82`). Both
  schema tests use `2999-01-01`, which passes under any timezone, so nothing
  pins the boundary. "Today" can be the client's local day or UTC everywhere;
  the two give different answers.

## SHOULD

- **SHOULD-12** *(confirmed 2026-08-30)* — `docs/architecture.md` still
  presents the cellar as the iteration under construction —
  "Being built (iteration 5)" at line 30, "*(iteration 5)*" in the module
  table at line 112, "The cellar's endpoints (iteration 5)" at line 184 —
  though iterations 5 and 5.5 are both done. The document's own contract at
  lines 3-4 is "describes **what is built**, plus the iteration currently
  being built". `ArchitectureDocumentationTest` guards the module set and
  dependency edges but nothing guards this prose.
- **SHOULD-13** *(confirmed 2026-08-30)* — the per-module exception advices are
  application-global, not module-scoped as ADR-0014 and `backend/README.md`
  describe: a bare `@RestControllerAdvice` with no `basePackages` or
  `assignableTypes` registers for every controller in the application, so
  catalog's advice is live on cellar's and identity's endpoints.
  `backend/src/main/java/fi/kalia/catalog/web/CatalogExceptionHandler.java:11`,
  `backend/src/main/java/fi/kalia/cellar/web/CellarExceptionHandler.java:13`.
  No collision exists today, but two modules already define same-named
  `BeerNotFoundException` types, and iterations 6 and 7 each add a module.
- **SHOULD-14** *(confirmed 2026-08-30)* — "DTOs at the API boundary — JPA
  entities never serialize directly" (`docs/architecture.md:220`) is the one
  §3/§4 layering rule with no ArchUnit guard, in a codebase that enforces its
  neighbours. The architecture deliberately hands domain entities outward
  (`CellarService.listBottles` returns `List<Bottle>` to `web`), so a handler
  returning `Bottle` instead of `BottleDto` would serialize `entry.userId` and
  trip a lazy collection with no test, no lint and no build failure.
- **SHOULD-15** *(confirmed 2026-08-30)* **[needs decision]** —
  `features/cellar` depends on the catalog subdomain invisibly to the boundary
  rule documented as enforcing exactly this: `frontend/features/cellar/api.ts:2`
  imports the catalog's `getBeer` because `eslint.config.mjs:124` lets any
  feature's `api.ts` import the *whole* generated client. The cost is already
  visible as duplicated 404-handling re-implementing
  `frontend/features/catalog/api.ts` (the comment at
  `frontend/features/cellar/api.ts:30` admits it), and
  `docs/architecture.md:240` claims these boundaries are "enforced rather than
  agreed". Three valid paths: let `app/` compose the join, permit a declared
  feature→feature edge, or narrow the `generated-api` policy to a feature's own
  tag. [iteration-6 task 09](iteration-6/09-batch-beer-lookup-for-cellar.md)
  changes the transport but keeps this import direction, so it does not resolve
  it.
- **SHOULD-16** *(confirmed 2026-08-30)* **[needs decision]** — the deliberate
  no-cross-schema-foreign-keys rule (`docs/architecture.md:118`) leaves a
  catalog beer's disappearance handled only in the *frontend*, which silently
  drops the row (`frontend/features/cellar/api.ts:43`), so the entry and its
  bottles stay in the database permanently, invisible to their owner, with no
  log, no cleanup and no test. The backend's sole defence is the assumption
  that "nothing deletes catalog beers"
  (`backend/src/main/java/fi/kalia/cellar/application/CellarService.java:96`),
  which iteration 8 removes. §8's "Trade-offs made explicit" does not list this
  cost. Competing remediations: a catalog deletion event driving cellar
  cleanup, a stated-and-tested no-hard-delete invariant, or accepting orphans
  and moving the drop logic server-side before iteration 6 adds a second
  consumer.
- **SHOULD-17** *(confirmed 2026-08-30)* — the two-level bottle model is cited
  to ADR-0006 ("Cellar first — store flow deferred to backlog"), whose own
  2026-08-08 amendment supersedes its cellar-shape description; the decision is
  ADR-0034, correctly cited 38 lines earlier at `docs/architecture.md:151`.
  `docs/architecture.md:189`.
- **SHOULD-18** *(confirmed 2026-08-30)* — both quality-backlog links in the
  iteration-5.5 index are broken: `docs/tasks/iteration-5.5.md:3` and `:11`
  link `tasks/quality-backlog.md` from inside `docs/tasks/`, resolving to
  `docs/tasks/tasks/quality-backlog.md`. These are the only two broken relative
  links in the whole doc set.
- **SHOULD-19** *(confirmed 2026-08-30)* — `docs/architecture.md` §7's testing
  table (lines 371-381) omits `ArchitectureDocumentationTest`, the test that
  parses §2's mermaid block and §3's table and fails the build when they
  disagree with Spring Modulith's own view. It is the mechanism that makes
  §2/§3 trustworthy, §7 is its "shape" home, and a reader editing §3's table
  gets no warning from `docs/` that a test will fail.
  `backend/README.md:126` documents it.
- **SHOULD-20** *(confirmed 2026-08-30)* **[needs decision]** — the Radix
  version pins and the rationale for taking them on live in four places, and
  have already drifted (MUST-4 above is the drift): `README.md:173`,
  `frontend/README.md:207`, `docs/adr/0021-design-tokens-ui-primitives.md:75`
  and `docs/architecture.md:286`. Neither ADR-0020 exception applies — none of
  the three restatements is a one-line pointer. Which home wins (README tech
  stack only, or the ADR as the pin) is a product-owner call.
- **SHOULD-21** *(confirmed 2026-08-30)* — the root README's forward-looking
  feature list is explicitly "in roadmap order" but skips iteration 6.5
  (Sign-up), so the README reads as if account creation is never coming.
  `README.md:109-115` vs `docs/roadmap.md:54` and `docs/tasks/iteration-6.5.md`
  with its nine task files.
- **SHOULD-22** *(confirmed 2026-08-30)* — the search predicates lowercase with
  the JVM default locale while the SQL side and the `lower(...)` indexes do
  not, so the two disagree wherever the default locale is Turkish or Azeri:
  `"IPA".toLowerCase()` yields dotless `"ıpa"` and `?style=IPA` returns zero
  rows. `backend/src/main/java/fi/kalia/catalog/domain/BeerSpecifications.java:29`,
  `:34`, `:41` — `toLowerCase(Locale.ROOT)` at all three sites. Nothing in the
  suite pins the locale, so this passes CI and fails only in that deployment.
- **SHOULD-23** *(confirmed 2026-08-30)* — a misspelled sort *direction*
  silently sorts the wrong way: `parseSort` rejects an unknown property and
  more than two comma-separated parts, but any second part that is not `desc`
  falls through to `ASC` with no error, so `?sort=abv,dsc` returns 200 sorted
  ascending. `backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:114`.
  This is the direction-token half of the shape retired COULD-8 fixed for
  trailing garbage, left behind.
- **SHOULD-24** *(confirmed 2026-08-30)* — the session-cookie lookup prefers
  the unprefixed name over `__Secure-`: the array is ordered
  `["authjs.session-token", "__Secure-authjs.session-token"]` and the first
  defined value wins, the opposite of Auth.js, which under HTTPS issues and
  reads only the `__Secure-` name.
  `frontend/lib/auth/sessionCookie.ts:6`. Harmless today (no TLS deployment,
  so `__Secure-` is never issued); once TLS lands, an attacker who can write a
  cookie for the registrable domain but not read the victim's sets the
  unprefixed name, `auth()` still resolves the victim's session, and every
  backend call carries the *attacker's* bearer token — the victim's bottles
  land in the attacker's cellar. `sessionCookie.test.ts` never tests the
  both-present case.
- **SHOULD-25** *(confirmed 2026-08-30)* **[needs decision]** —
  `keycloak/realm-export.json` is simultaneously the dev realm and the repo's
  only realm definition, and it pins a development security posture:
  `"sslRequired": "none"` (line 4), no `bruteForceProtected` (so no lockout on
  password guessing), a committed confidential-client secret
  `"kalia-dev-secret"` (line 16, duplicated at `docker-compose.yml:53`) and a
  seeded non-temporary password (line 91). A first deployment starting from
  this file accepts the password form over plain HTTP, allows unlimited online
  guessing, and hands anyone reading the repo the credentials the
  confidential-client model depends on. Harden the shared realm, or split a
  dev realm from a deployable one.
- **SHOULD-26** *(confirmed 2026-08-30)* **[needs decision]** — Valkey holds
  every session's refresh and ID tokens in plaintext JSON with no
  authentication and no TLS: the URL is `redis://` with no credentials
  (`frontend/lib/auth/valkeyClient.ts:6`) and the service sets no `requirepass`
  and no ACL (`docker-compose.yml:122`). Anything reaching port 6379 can
  `KEYS auth:session-account:*` and walk away with every signed-in user's
  refresh token — offline-redeemable against Keycloak given the committed
  client secret in SHOULD-25. Loopback-bound and single-host today. ADR-0025
  and ADR-0030 decide where tokens live, not how the store is protected.
- **SHOULD-27** *(confirmed 2026-08-30)* **[needs decision]** — there is no
  rate limiting on any surface (nothing in `backend/pom.xml`,
  `frontend/package.json` or either source tree), including an
  unauthenticated endpoint that runs a full RS256 signature verification per
  request: `frontend/app/api/auth/backchannel-logout/route.ts:18`. Garbage
  `logout_token` POSTs in a loop burn asymmetric-crypto CPU on the single Node
  process that serves every user's pages, and the same absence lets an
  attacker grind passwords through sign-in initiation. `docs/tasks/backlog.md`
  tracks "TLS, rate limiting" under mobile/native future work, not as a
  deployment gate. Where the limiter belongs — route handler, a reverse proxy
  that does not exist yet, or Keycloak's own brute-force config — is an
  architecture choice.
- **SHOULD-28** *(confirmed 2026-08-30)* — the Trivy action's pinned SHA no
  longer matches its own version comment or ADR-0024's record: all three steps
  pin `ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0`
  (`.github/workflows/vulnerability-scan.yml:24`, `:38`, `:46`) while ADR-0024
  records v0.36.0 as `a9c7b0f06e461e9d4b4d1711f154ee024b8d7ab8`
  (`docs/adr/0024-dependency-vulnerability-scanning.md:152`); a Dependabot
  bump changed the SHA and left the comment. The comment is the only thing a
  reviewer reads to know what is running, which is the review step SHA-pinning
  exists to enable, and the whole CVE gate runs on that action.

## COULD

- **COULD-16** *(confirmed 2026-08-30)* — the catalog module has no `*Test`
  files at all, only `*IT`, so `mvn test` — the fast, Docker-free gate — covers
  none of its three pieces of pure, framework-free logic: `parseSort`'s
  tokenizing and whitelist
  (`backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:103`),
  `listBreweries`'s in-memory `subList` slicing with `Math.min` clamps at both
  ends (`.../catalog/application/CatalogService.java:40`), and
  `escapeLikeWildcards`'s backslash-first escaping
  (`.../catalog/domain/BeerSpecifications.java:17`). All three are static and
  need no Spring context.
- **COULD-17** *(confirmed 2026-08-30)* **[needs decision]** — `MAX_PAGE`
  10,000 combined with `MAX_PAGE_SIZE` 100 admits `OFFSET 1_000_000` on an
  endpoint `SecurityConfig` makes `permitAll()`
  (`backend/src/main/java/fi/kalia/catalog/web/CatalogController.java:48`).
  The Javadoc's justification — past this index a request cannot land on real
  data — holds only while the catalog has fewer than ~10,001 beers, which
  iteration 8 changes. Each such request makes Postgres run the trigram match,
  produce a `COUNT(*)`, then discard a million rows. Lowering `MAX_PAGE`,
  keyset pagination and rate limiting answer different concerns.
- **COULD-18** *(confirmed 2026-08-30)* — `X-Content-Type-Options: nosniff` is
  the one standard header missing from ADR-0016's otherwise deliberate set
  (CSP, `X-Frame-Options`, `Referrer-Policy`, HSTS, `Permissions-Policy`), and
  the ADR does not record it as considered-and-rejected.
  `frontend/next.config.ts:24`. Hardening rather than a hole — nothing serves
  sniffable content today — but with `script-src 'unsafe-inline'` accepted, the
  CSP would not stop a sniffed-into-HTML response.
- **COULD-19** *(confirmed 2026-08-30)* — an access token with no recorded
  expiry is treated as fresh forever: `hasExpired` returns `false` unless
  `expires_at` is a number, so a stored account missing that field never
  triggers `renew()` and the BFF sends a dead token indefinitely — every
  backend call 401s, the user sees an empty cellar, and ADR-0029's refresh path
  is silently dead for that session. `frontend/lib/api/accessToken.ts:69`. The
  behaviour is documented and deliberate; the deliberate choice is the
  fail-open direction.
- **COULD-20** *(confirmed 2026-08-30)* **[needs decision]** — a
  caller-supplied `Authorization` header silently overrides the session's
  token: `withAccessToken` returns `options` untouched when one is already set
  (`frontend/lib/api/mutator.ts:86`). No call site sets one today, so it is not
  exploitable now; it becomes exploitable the first time any header value
  derives from request input, at which point the BFF forwards a
  caller-chosen bearer token verbatim. The comment argues an override is easier
  to diagnose than a silent overwrite — diagnosability against a hard "session
  token always wins" invariant is a judgement call.
- **COULD-21** *(confirmed 2026-08-30)* — the waiver policy `.trivyignore`
  states ("a reason and a 30-day expiry … expiring forces a revisit") cannot be
  enforced by the file format it is written in: Trivy honours `expired_at` only
  in the structured `.trivyignore.yaml`, so in the plain format an expiry is a
  comment Trivy ignores and a waiver stays suppressed forever. `.trivyignore:2`.
  Latent, not live — the file currently holds zero waiver entries.
- **COULD-22** *(confirmed 2026-08-30)* — two tech-stack drifts in the root
  README: it pins "i18next 26.3" (`README.md:182`) where
  `frontend/package.json` has `^26.4.0`, a drift at the section's own stated
  major.minor precision; and `jose` `^6.2.4` is a direct dependency verifying
  back-channel logout tokens (`frontend/lib/auth/backchannelLogoutToken.ts`)
  that appears nowhere in the tech stack, though CLAUDE.md requires recorded
  versions. Every other version checked is accurate.
- **COULD-23** *(confirmed 2026-08-30)* — the root README's "Repository layout
  (planned)" heading describes a layout that is built, and still annotates
  `cellar/` as "(iteration 5)"; the tree also omits `docs/ci-playbook.md` and
  `docs/PULL_REQUEST_TEMPLATE.md`. `README.md:225`.
- **COULD-24** *(confirmed 2026-08-30)* — the ADR index's gloss for ADR-0021
  repeats a claim the ADR has amended away twice: "three shared primitives, no
  new dependency" (`docs/adr/README.md:89`) against seven primitives in
  `frontend/components/ui/` and two Radix dependencies. The frozen ADR *title*
  legitimately keeps the original wording, but `docs/adr/README.md:16` states
  this file carries "a one-line gloss rather than a second copy of these
  titles", so the gloss is free to describe current reality.
- **COULD-25** *(confirmed 2026-08-30)* — the ADR index says "Six independent
  decisions" over a list of seven (ADR-0025, 0028, 0029, 0030, 0031, 0033,
  0043); ADR-0043 was added later without updating the count.
  `docs/adr/README.md:107`.

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
