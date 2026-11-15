# Quality backlog

Findings from periodic `/quality-sweep` runs land here, grouped only by
severity — **MUST** / **SHOULD** / **COULD** (MoSCoW), never by sweep
date. A sweep is opened as its own PR and reviewed like any other change;
who may start one, and when, is in CLAUDE.md "Quality checks". Each
finding gets a permanent ID within its category (`MUST-1`, `SHOULD-1`, ...)
that is never reused, even after the finding is resolved, lifted or pruned
from this file. **Do not take an ID by looking at the entries below** — most
retired IDs are no longer listed. A new finding takes one past its
category's number on the **Highest issued** line, and the same edit raises
that number. `scripts/check-tasks.mjs` fails an entry numbered above the
line and an ID listed twice among the open findings or twice in
"Retired"; it cannot see a pruned ID reused below the line, so the line is
the only guard against that. Every finding carries a *(confirmed
&lt;date&gt;)* — the most recent sweep that independently reconfirmed it; a
sweep that rediscovers an existing finding updates that date (and the
description, if details changed) in place instead of adding a duplicate
entry. An entry not mentioned by a given sweep simply keeps its prior
confirmed date — that isn't staleness needing action, just "not
independently re-verified this time."

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
task, the finding moves to "Retired" below noting where it went, so a sweep
that runs while the task is open knows the issue is already taken.

**Pruning "Retired".** A retired entry stays only while it can still stop
a sweep listing a known issue twice: until the task it was lifted into is
`done`. Each sweep's PR deletes the entries whose task is `done`, and every
entry that names no task (resolved in place, no longer reproducible,
accepted as a trade-off). A pruned entry loses nothing: the lifted task
keeps the description and its "(Quality backlog SHOULD-n)" backreference,
so searching the repository for the ID finds it, and git keeps the entry
itself (`git log -S 'SHOULD-n' -- docs/tasks/quality-backlog.md`). There
is no archive file, since it would just be the same ever-growing list
somewhere else. An issue that comes back after its task is done is a
regression and gets a new ID, and its description names the ID it
repeats, so the recurrence stays visible once the old entry is gone.

**Highest issued:** MUST-27 · SHOULD-136 · COULD-164

## MUST

- **MUST-26** *(confirmed 2026-11-14)* — `keycloak/README.md` "Changing a
  colour" (lines 36–42) says each colour is declared at the top of `login.css`
  as `--kalia-color-<name>`, a hand-kept copy of the app's token.
  `scripts/check-keycloak-theme.mjs` now fails any `--kalia-color-*` declared
  there ("belongs in the generated stylesheet"): the colours are generated into
  `keycloak/themes/kalia/login/resources/css/tokens.generated.css` by
  `scripts/generate-tokens.mjs` from `packages/tokens/src/tokens.ts`, and
  `theme.properties` loads `styles.css tokens.generated.css login.css`. A reader
  who follows the README edits the wrong file and the check fails. The same
  README's line 21 ("one `login.css` layered after it") and its Checks section
  ("the theme's colours … to the app's") describe the old arrangement too.
- **MUST-27** *(confirmed 2026-11-14)* **[needs decision]** — The branch-naming
  rule (`CLAUDE.md` "Never commit directly to `dev`": `iteration-N/<topic>`,
  `docs/<topic>`, `fix/<topic>`) has no enforcer and keeps reaching `dev`
  broken. The `worktree` skill's step 4 gained a warning about
  `claude/<name>-<hash>` names in #587, citing #416, #476 and #522; since then
  #629, #630 and #633 merged from `claude/…` branches. Nothing in `scripts/`,
  `.github/workflows/`, `scripts/hooks/pre-push` or `.claude/settings.json`
  reads the head ref. Repeats COULD-128, whose documentation-only fix did not
  hold. The decision: check the name (in `pre-push` or the PR-body workflow),
  or drop the rule.

## SHOULD

- **SHOULD-119** *(confirmed 2026-11-14)* — On an iPhone with VoiceOver in a
  Finnish voice, the catalog's filter sheet does not put focus where
  [mobile/CONVENTIONS.md](../../mobile/CONVENTIONS.md) says it goes. Opening
  it from the Catalog lands on the "Sulje" (Close) button, not the "Suodattimet"
  heading; coming back from a picker reads "Sulje" first and only then moves to
  the heading, although `FiltersSheet` sends `sendAccessibilityEvent(heading,
  "focus")` on every page change (`FiltersSheet.test.tsx` holds that it is
  sent). Found by the product owner's walk of iteration 11 task 11; the Close
  button is the first element of the sheet's header, and the event probably
  loses to the sheet's own initial focus or runs before the page is on screen.
  Not re-walked in English, in light mode or on Android.
- **SHOULD-120** *(confirmed 2026-11-14)* — Opening a picker (Style, Brewery,
  Country) from the filter sheet does not put VoiceOver's focus on the picker's
  heading on an iPhone, in a Finnish voice and dark mode: it lands sometimes on
  the first row ("Kaikki maat"), sometimes on the last row visible, so the
  focus event of SHOULD-119's mechanism does not hold there either. The rows
  are read correctly once touched. Found by the same walk; candidates to try
  are sending the event after the page's layout rather than in an effect, or
  moving focus with `accessibilityViewIsModal` or a `key`ed heading. Related:
  SHOULD-119, whose fix settles both.
- **SHOULD-121** *(confirmed 2026-11-14)* — The web's Keycloak token refresh
  has no timeout. `web/lib/auth/refreshAccessToken.ts` calls
  `fetchViaInternalKeycloak`, a plain `fetch`
  (`web/lib/auth/internalKeycloakFetch.ts`), and `currentAccessToken()` awaits
  it before the transport's `send()` (`packages/api/src/core/fetch-transport.ts`,
  `config.accessToken?.()`), so the transport's 10 s timer does not cover it: a
  Keycloak that accepts the connection and never answers holds every backend
  call of a render whose token has expired. The mobile app bounds the same call
  (`mobile/src/lib/auth/keycloakClient.ts`); SHOULD-97 fixed it there only.
- **SHOULD-122** *(confirmed 2026-11-14)* — `web/features/catalog/addBeerSchema.ts`
  and `web/features/admin-suggestions/editSuggestionSchema.ts` are near-copies:
  the same seven bounds and patterns (`MAX_NAME_LENGTH`, `MAX_CITY_LENGTH`,
  `MAX_ABV`, `HAS_LETTER_OR_DIGIT`, `NO_CONTROL_OR_INVISIBLE_CHARACTERS`,
  `ABV_FORMAT`, `ABV_ONE_DECIMAL`) and the same `checkName`, `checkAbv` and
  `toNumber`, differing only in the message-key prefix and the form's value
  type. Both mirror the same backend constraints, so a bound changed in one
  lets the admin form accept what the add form refuses, or the reverse.
- **SHOULD-123** *(confirmed 2026-11-14)* **[needs decision]** — Nothing bounds
  a cellar on either side. `docs/architecture.md` "Trade-offs made explicit"
  accepts that `GET /api/v1/cellar` answers every entry uncapped until
  iteration 12, but no cap on entries or bottles per user exists on the write
  side either: `Entry.addBottles` has no total, and `AddBottleRequestDto`'s
  `MAX_QUANTITY = 24` limits one request only. One account can make every
  cellar read, and every add (which loads the whole entry aggregate),
  arbitrarily expensive now, not only once the offline cache arrives. The
  decision: cap the writes, page the read, or accept it and say so.
- **SHOULD-124** *(confirmed 2026-11-14)* **[needs decision]** — The domain
  layer depends on its module's root package, a cycle no rule sees.
  `catalog/domain/Beer.java`, `catalog/domain/Review.java` and
  `cellar/domain/Entry.java` import root types (`BeerRemoved`,
  `SuggestionReviewed`, `RejectionReason`, `BottleAdded`), while
  `docs/architecture.md` §3 says dependencies point web → application → domain
  and the root "calls only its own `application` layer" — root → application →
  domain → root. `ArchitectureTest.domainDependsOnNoOuterLayer` forbids only
  `.application` and `.web`, and the one rule on root classes
  (`moduleRootDoesNotDependOnDomain`) leaves a root class free to depend on
  `.web` or on another module's root, so §3's "enforced by ArchUnit and
  Modulith" claims more than the rules hold. The decision: document root event
  and value types as a sanctioned kernel beneath `domain` and write the rules
  to match, or move the types.
- **SHOULD-125** *(confirmed 2026-11-14)* — `notification`'s entity persists
  `catalog`'s enum: `notification/domain/Notification.java` maps `reason_code`
  as `fi.kalia.catalog.RejectionReason`, and
  `db/migration/notification/V010__notification_schema.sql` repeats the `CHECK`
  list of `catalog/V003__catalog_schema.sql`. A fifth reason added in `catalog`
  looks additive there, fails V010's `CHECK` in the notification listener, is
  retried five times (ADR-0081) and the notification is lost. The module
  already keeps its own copy of the outcome (`Notification.Outcome`, mapped by
  name in `NotificationService`); the reason needs the same.
- **SHOULD-126** *(confirmed 2026-11-14)* **[needs decision]** — The backend's
  request bounds are copied by hand into both clients.
  `web/features/catalog/searchParams.ts` (`MAX_ABV`, `MAX_FILTER_LENGTH`,
  `MAX_PAGE_SIZE`, `MAX_OFFSET`), `mobile/src/features/catalog/filters/model.ts`
  (`MAX_ABV`, `MAX_FILTER_LENGTH`) and `mobile/src/features/catalog/api.ts`
  (`MAX_RESULT_WINDOW`) restate `PageBounds` and `CatalogController`, and both
  clients carry the same decimal pattern. `backend/openapi.json` states the
  bounds (`maxLength`, `maximum`), but the generated models keep them only as
  JSDoc, so a changed bound drifts in two places, each client then answering
  `400` or stopping its paging early on its own. The decision: generate
  constants or schemas from the spec, or export hand-kept ones from
  `@kalia/api`.
- **SHOULD-127** *(confirmed 2026-11-14)* — `keycloak/README.md` leaves out
  `keycloak/config-cli.Dockerfile`: its Layout table has no row for it, and
  "On a Keycloak image bump" (line 44) names the `Dockerfile` `FROM` and
  `keycloak-config-cli` in `docker-compose.base.yml`, while that service is
  built from `config-cli.Dockerfile`, whose own `FROM` carries the tag. A bump
  that follows the README leaves the line that is actually built at the old
  version.
- **SHOULD-128** *(confirmed 2026-11-14)* — `docs/design.md` (beer-style
  colours, lines 400–401) says changing a style colour "is a `globals.css`
  edit that the contrast check guards". The `[data-beer-style]` blocks are
  generated into `web/app/tokens.generated.css` from
  `packages/tokens/src/tokens.ts`, which is also what
  `scripts/check-contrast.mjs` reads, and the same document's opening already
  names `tokens.ts` as the home of values. The edit it describes would be
  overwritten.
- **SHOULD-129** *(confirmed 2026-11-14)* **[needs decision]** — The timestamp
  rule contradicts the schema. `backend/CONVENTIONS.md` ("A new
  table carries `created_at` and `updated_at`") and `docs/glossary.md`'s
  Timestamp columns row (which names `catalog.beer` as the one exception) do
  not match four tables with no `updated_at`: `catalog.brewery` and
  `catalog.review` (`V003__catalog_schema.sql`), `appconfig.app_config`
  (`V009__appconfig_schema.sql`, neither column) and
  `notification.notification` (`V010__notification_schema.sql`, created after
  the rule). The decision: word the rule for mutable tables and list the
  append-only and one-row exceptions, or add the columns.
- **SHOULD-130** *(confirmed 2026-11-14)* — `docs/ci-playbook.md` files its
  lint entry under "Frontend (npm) — lint", a job that does not exist: the job
  is `Web and packages (npm)` in `.github/workflows/ci.yml`, and the lint of
  `Mobile app (npm)` has no entry at all. The playbook is found by the red
  job's name, so the entry is missed. Repeats MUST-25: the rename drift in
  this file survived iteration 11 task 12 in this heading.
- **SHOULD-131** *(confirmed 2026-11-14)* **[needs decision]** — ADR-0016's
  revisit trigger has fired and the decision has not been revisited.
  `web/lib/config/cspHeader.ts` keeps `script-src 'unsafe-inline'`, which the
  ADR accepts because the app has "no user-generated content" and says to
  re-examine "once the app takes user-generated content, or once Auth/Cellar
  land". The web now renders usernames and suggested beer, brewery and city
  names (ADR-0091, ADR-0102). A hand survey is still clean — no
  `dangerouslySetInnerHTML`, `innerHTML`, `eval` or inline script under
  `web/` — so this is a missing second line of defence, not a hole. The
  decision: a nonce-based policy at the cost of static rendering, or reaffirm
  the trade-off in the ADR against the features that exist.
- **SHOULD-132** *(confirmed 2026-11-14)* **[needs decision]** — Two pull
  requests each green on their own base broke `dev` a third time, in a job the
  merge-ref check leaves out. #623 and #624 merged and the Android sign-in
  flow went red on `dev` and on every pull request based on it (#627, #629)
  until #628 (`docs/common-failures.md`, the 2026-11-13 row); the earlier
  occurrences are PR 450 and #542/#543. `.github/workflows/merge-ref-check.yml`
  runs only `make check` on the merge ref. Repeats SHOULD-115, whose task
  closed the static-check sub-class. The decision: require up-to-date
  branches, run more jobs on the merge ref, or accept the race ADR-0046
  accepted and say it covers E2E.
- **SHOULD-133** *(confirmed 2026-11-14)* **[needs decision]** —
  `docs/common-failures.md` is append-only by its header and ADR-0084 ("A row
  is never edited or removed afterwards"), yet earlier rows were edited in
  three pull requests: #582 (65a79cc1), #587 (8defa0c1) and #588 (03add2d5,
  and 93aa7a50, which rewrote a row's Why). One checker forces such edits:
  `scripts/check-failure-doc-paths.mjs` fails when a path named in the log
  stops existing, so moving a file means editing old rows, and nothing checks
  that changes stay at the end of the table. The decision: allow a repointed
  dead path as the rule's one exception, or exempt old rows from the checker —
  and whether append-only gets a check of its own.
- **SHOULD-134** *(confirmed 2026-11-14)* **[needs decision]** — The Android
  SDK licence failure in `Mobile E2E (Maestro, Android)` has happened twice
  from separate pull requests — run 41323371145 (the merge of PR 523) and run
  43448275019 (#623), both logged in `docs/common-failures.md` as "cause not
  established" and re-run. `docs/ci-playbook.md` says a cause that repeats "is
  the image or the runner that moved, not a blip" but has no entry for the
  licence prompt and names no next step, and `scripts/mobile-e2e.mjs` already
  answers `sdkmanager --licenses`. Nothing owns finding the cause. Not covered
  by iteration 11.5 task 19, which retries registry and mirror failures.
- **SHOULD-135** *(confirmed 2026-11-14)* **[needs decision]** — The "run it
  against a running stack" gate (`implement-task` step 10) is recorded as
  skipped or not exercised in 11 of about 45 gate reports since the last
  sweep: #554, #555, #557, #566 and #573 (no emulator), #593, #594 and #595
  (skipped by the starting session, or unattended), #624 and #627 (nothing
  seen on a simulator) and #628 (the heavy-session limit). `CLAUDE.md` caps
  heavy sessions at two and counts a simulator or emulator as heavy, so for
  mobile UI work the gate and the cap collide. A step skipped this often is
  designed wrong (ADR-0027). The decision: say when component tests stand in
  for the run, or how a capped session gets a device.
- **SHOULD-136** *(confirmed 2026-11-14)* **[needs decision]** — A second
  agent tool writes pull requests under a process that only Claude Code runs.
  #598, #600 and #610 are attributed to GitHub Copilot, and the pull request
  template was changed for that (d45fe092, d0c2efc8, 96a3e12d); #600 and #610
  record an "in-session review of the worktree diff" where `CLAUDE.md` and
  `implement-task` step 8 name `/code-review`. The edit-time hook in
  `.claude/settings.json` and the skills load in Claude Code only, and there
  is no `AGENTS.md` or `.github/copilot-instructions.md`. The decision:
  whether the second tool is a supported author, and if so what its gates are
  and where it reads them.

## COULD

- **COULD-136** *(confirmed 2026-11-06)* — `web/features/admin-suggestions/OutcomePanel.tsx`
  builds a success box (icon cell, ink edge, message) that `Toast` and `ErrorAlert`
  each build too; a success counterpart to `ErrorAlert` in `components/ui/` would
  leave one copy to keep in step.
- **COULD-144** *(confirmed 2026-11-14)* — The shared transport's timeout
  covers the response headers, not the body.
  `packages/api/src/core/fetch-transport.ts` races only the `fetch(...)`
  promise against `withTimeout`; `readBody` awaits `response.text()` with no
  limit, so a backend or proxy that sends headers and stalls mid-body hangs
  the caller on web and mobile, against the file's own "bounds the wait".
- **COULD-145** *(confirmed 2026-11-14)* — The UUID pattern guarding "can this
  id name a row" is written four times: `web/features/catalog/api.ts`,
  `web/features/catalog/actions.ts`, `web/features/cellar/actions.ts` and
  `mobile/src/features/catalog/api.ts`. One export from `@kalia/api`'s core
  would leave one copy. Related: SHOULD-126 and COULD-119.
- **COULD-146** *(confirmed 2026-11-14)* **[needs decision]** — On the web,
  removing or updating a bottle that is already gone shows the generic failure
  and puts the stale bottle back. `web/features/cellar/api.ts` throws on any
  non-2xx, `404` included, so `removeBottleAction` never reaches
  `revalidatePath`, and `RemoveBottleDialog` reports `{ failed: true }` and
  un-hides the bottle; a bottle removed in another tab or on the phone stays
  on screen until a reload. The decision: treat `404` as already removed, or
  show a message of its own.
- **COULD-147** *(confirmed 2026-11-14)* — `useAnimateListChange`
  (`mobile/src/lib/motion/useAnimateListChange.ts`) returns a new function on
  every render, and `CatalogScreen` lists it as a `useLayoutEffect` dependency,
  so the effect re-runs on every render. The screen's own
  `shown.current !== firstPage` guard keeps the behaviour right; the next
  caller without one would animate on every render. A `useCallback` keyed on
  `reduced` fixes it.
- **COULD-148** *(confirmed 2026-11-14)* — Two rules in the mobile catalog's
  hooks are held by no test. `nextBeerPage`
  (`mobile/src/features/catalog/hooks/useBeers.ts`) stops paging at
  `MAX_RESULT_WINDOW`, the bound past which the backend answers `400`, and
  `CatalogList.test.tsx` covers only the exhausted list; `useResultCount`
  (`hooks/useFilterOptions.ts`) hides a stale count by reference equality, and
  `FiltersSheet.test.tsx` exercises only its debounce.
- **COULD-149** *(confirmed 2026-11-14)* **[needs decision]** — The page
  envelope and offset bound of `docs/architecture.md` §4 are implemented once
  per module — `catalog/web/PageDto.java` and `PageBounds.java`,
  `notification/web/NotificationPageDto.java` with `NotificationController`'s
  own `MAX_PAGE_SIZE`, `MAX_OFFSET` and `requireBoundedOffset`, and
  `cellar/web/PublicCellarDto.java` — because §3 limits `fi.kalia.web` to
  exception advice and error types. The spec carries three unrelated envelope
  schemas, and a fourth paginated module will copy it again. The decision:
  widen what `fi.kalia.web` may hold, or accept per-module envelopes and say so.
- **COULD-150** *(confirmed 2026-11-14)* **[needs decision]** —
  `ArchitectureDocumentationTest` checks which modules §3's dependency table
  names, not the kind each edge is given ("(event: …)" or "(read: …)"): its
  `BACKTICKED_MODULE` pattern extracts module names only. A module that began
  writing into another through a synchronous API call would leave the table
  wrong and the test green, and nothing else holds "writes cross modules as
  events". The decision: verify the kinds, or narrow §7's claim that the test
  holds §2 and §3 to the code.
- **COULD-151** *(confirmed 2026-11-14)* — The data-model sketch in
  `docs/architecture.md` §3 leaves out `catalog.review`, the review record of
  ADR-0102 that the invariants beneath it rely on and that holds user ids
  (`decided_by`), and `brewery.name_sort_key`; both are in
  `backend/src/main/resources/db/migration/catalog/V003__catalog_schema.sql`.
  The sketch lists every other table, so the omission reads as "no such
  table".
- **COULD-152** *(confirmed 2026-11-14)* — `docs/architecture.md` "Domain
  invariants" says a brewery's country is "named in the reader's language at
  runtime". That holds for the web only: the mobile app bundles a table
  (`mobile/src/lib/i18n/countryNames.data.ts`), as ADR-0079's amendment of
  2026-11-13 records.
- **COULD-153** *(confirmed 2026-11-14)* **[needs decision]** — Strength
  formatting is a display rule both clients show and each keeps its own.
  `web/lib/abv.ts` (`formatAbv`) is one helper; the mobile app inlines the same
  `Intl.NumberFormat` expression in `BeerCard.tsx`, `details/BeerHeadline.tsx`,
  `details/SimilarBeers.tsx` and `filters/FilterChips.tsx`, appending " %" in
  some and not others. ADR-0111 put the style-to-group rule in `@kalia/api`
  for the same reason. The decision: share it, or accept per-client formatting.
- **COULD-154** *(confirmed 2026-11-14)* **[needs decision]** —
  `docs/glossary.md` "Terms decided in iteration 10.5, built by its tasks"
  still says its terms are "Not yet types … Each moves into the table in the
  task that builds it." Iteration 10.5 is done: `Review` is in the table
  above, and `RejectionReason`, `SuggestionReviewed` and `BeerRemoved` exist
  under `backend/src/main/java/fi/kalia/catalog/`. The decision: fold the rows
  into the Domain types table, or keep the section as a permanent table of
  terms that are not types.
- **COULD-155** *(confirmed 2026-11-14)* — ADR-0107's amendment of 2026-11-08
  still says the app "uses the platform's default system font provisionally;
  task 03 decides whether to bundle a font". ADR-0110 decided one bundled
  face, and neither record points at the other.
- **COULD-156** *(confirmed 2026-11-14)* — The root `README.md`'s repository
  tree lists `api/` and `locales/` under `packages/` and leaves out
  `packages/tokens/` (`@kalia/tokens`), a workspace `make lint` covers and
  `packages/README.md` lists. The tree is the layout's one home
  (`docs/architecture.md` §2 points to it).
- **COULD-157** *(confirmed 2026-11-14)* — The pull request template's
  Doc-sync prompt (`docs/PULL_REQUEST_TEMPLATE.md`, the Gates list) asks which
  of `docs/architecture.md`, the iteration index and the ADRs were checked;
  `implement-task` step 7 also requires the README of each subtree the change
  touches. The template is what makes the verdict recorded the same way every
  time, and it prompts for less than the gate checks.
- **COULD-158** *(confirmed 2026-11-14)* **[needs decision]** — Password
  guessing is bounded per account, not per address. Keycloak's lockout counts
  failures per user (`keycloak/realm-export.json`: `failureFactor` 10,
  temporary), and its sign-in and token endpoints sit in the edge's general
  `keycloak` zone (`edge/nginx.conf`, 20 requests a second per address); only
  the registration paths have a tighter one. One address can try a common
  password across many usernames without any account reaching its threshold.
  The decision: a tighter per-address zone on the sign-in paths, or accept it.
- **COULD-159** *(confirmed 2026-11-14)* — The web client's `redirectUris` and
  `post.logout.redirect.uris` in `keycloak/realm-export.json` are the wildcard
  `WEB_URL/*`. The app uses two callback paths
  (`/api/auth/callback/keycloak`, `/api/auth/callback/keycloak-register`) and
  `/` after sign-out (`web/features/auth/actions.ts`), so naming those three
  narrows what a same-origin leak could collect.
- **COULD-160** *(confirmed 2026-11-14)* — Keycloak does not require PKCE of
  `kalia-web`: `kalia-mobile` sets `pkce.code.challenge.method: S256` in
  `keycloak/realm-export.json` and the web client sets nothing. Auth.js sends
  PKCE, but a request without it would be accepted, so the protection holds
  only while the client remembers to send it.
- **COULD-161** *(confirmed 2026-11-14)* — A comment in
  `web/app/api/auth/backchannel-logout/route.ts` says "the edge proxy applies
  the same cap to this route". The edge answers `404` for that path
  (`edge/nginx.conf`), since Keycloak posts to it over the compose network, so
  the route's own 16 KiB bound is the only one.
- **COULD-162** *(confirmed 2026-11-14)* — Rows of `docs/common-failures.md`
  added by three pull requests (#598, #600, #610) name no branch, pull request
  or run in *Where* — "Editing the prototype cellar screen", "Stopping the
  Android emulator" — although ADR-0084 defines a row as "date, branch or pull
  request, …". Such rows cannot be counted against ADR-0051's separate-pull-request
  bar. The log's "How to write a row" does not ask for one and no checker reads
  the column.
- **COULD-163** *(confirmed 2026-11-14)* **[needs decision]** — The 320-line
  cap on `mobile/README.md` (`scripts/check-doc-size.mjs`) was reached within
  a week, and each mobile pull request since carries a commit that only makes
  the file fit: 6a6e6edd (#625), 5482a529 "Trim a blank line …" (#629),
  c2b952b8 and 794c057b "Fold …" / "Reflow … to fit the README cap" (#630).
  The cap is meant to push content to its home; it is buying reflows. The
  decision: raise it, split the README, or keep it as it is.
- **COULD-164** *(confirmed 2026-11-14)* **[needs decision]** — `CLAUDE.md`'s
  rule that a commit message references the roadmap task has no checker, and
  35 of the 159 non-merge commits since the last sweep name no task,
  iteration, backlog ID or pull request, on task branches too (563a35ec in
  #619, 0a636ee0 in #630, 5fa17b7e in #633, d5cea5c7 in #595). The pull
  request body already links the task. The decision: check it, or drop it.

## Retired

Findings lifted into a task that is not yet `done`, each noting where it
went; pruned as described above.

- ~~SHOULD-101~~ (a common-failures row recording a defect with no owner) — lifted into [iteration-11.5 task 22](iteration-11.5/22-every-red-run-is-logged-and-an-unfixed-defect-has-an-owner.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-109~~ (Keycloak's "Back to application" link assigned to a closed iteration) — lifted into [iteration-11.5 task 24](iteration-11.5/24-the-backlog-and-the-readmes-state-a-decided-fact-once-as-decided.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-112~~ (the backlog's Mobile client section stating decided things as open) — lifted into [iteration-11.5 task 24](iteration-11.5/24-the-backlog-and-the-readmes-state-a-decided-fact-once-as-decided.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-116~~ (common-failures missing most failures seen only in CI) — lifted into [iteration-11.5 task 22](iteration-11.5/22-every-red-run-is-logged-and-an-unfixed-defect-has-an-owner.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~SHOULD-118~~ (tasks closing after their implementation merges) — lifted into [iteration-11.5 task 23](iteration-11.5/23-every-pull-request-has-its-gates-and-a-refinement-is-reviewed.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-26~~ (the password-reset page's `autocomplete="off"` username field) — lifted into [iteration-11.5 task 17](iteration-11.5/17-keycloaks-pages-ask-only-what-kalia-uses-and-say-what-each-is.md).
- ~~COULD-108~~ (two worktrees in and out of phone mode never run side by side) — lifted into [iteration-11.5 task 20](iteration-11.5/20-two-worktrees-run-side-by-side-and-a-low-disk-is-named.md).
- ~~COULD-112~~ (`docker compose up --wait` naming a one-shot service) — lifted into [iteration-11.5 task 19](iteration-11.5/19-a-known-transient-ci-failure-is-retried-or-prevented.md).
- ~~COULD-113~~ (Trivy's Java DB mirror with no fallback) — lifted into [iteration-11.5 task 19](iteration-11.5/19-a-known-transient-ci-failure-is-retried-or-prevented.md).
- ~~COULD-114~~ (a full disk failing work with an error that does not say so) — lifted into [iteration-11.5 task 20](iteration-11.5/20-two-worktrees-run-side-by-side-and-a-low-disk-is-named.md).
- ~~COULD-119~~ (the web hand-building HTTP failures and a second `isLocale`) — lifted into [iteration-11.5 task 13](iteration-11.5/13-the-shared-packages-export-what-both-apps-use-and-only-that.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-120~~ (`@kalia/api` generated with React Query and its peer dependencies) — lifted into [iteration-11.5 task 13](iteration-11.5/13-the-shared-packages-export-what-both-apps-use-and-only-that.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-121~~ (`src/testing/` importable from production code) — lifted into [iteration-11.5 task 11](iteration-11.5/11-the-mobile-apps-code-conventions-are-written-down-and-checked.md).
- ~~COULD-123~~ (how to regenerate the API client restated away from its home) — lifted into [iteration-11.5 task 24](iteration-11.5/24-the-backlog-and-the-readmes-state-a-decided-fact-once-as-decided.md).
- ~~COULD-124~~ (facts restated away from their one home) — lifted into [iteration-11.5 task 24](iteration-11.5/24-the-backlog-and-the-readmes-state-a-decided-fact-once-as-decided.md).
- ~~COULD-127~~ (Maven Central failures retried only in `mobile-e2e`) — lifted into [iteration-11.5 task 19](iteration-11.5/19-a-known-transient-ci-failure-is-retried-or-prevented.md).
- ~~COULD-129~~ (a pull request completing no task having no defined gates) — lifted into [iteration-11.5 task 23](iteration-11.5/23-every-pull-request-has-its-gates-and-a-refinement-is-reviewed.md). Its `[needs decision]` is an open question there, settled at refinement.
- ~~COULD-134~~ (CodeQL alert 8 on `scripts/mobile-native.mjs`) — lifted into [iteration-11.5 task 21](iteration-11.5/21-the-codeql-alerts-open-on-dev-are-closed.md).
- ~~COULD-135~~ (CodeQL alert 5 on `scripts/sync-indexes.mjs`) — lifted into [iteration-11.5 task 21](iteration-11.5/21-the-codeql-alerts-open-on-dev-are-closed.md).
- ~~COULD-137~~ (`catalogShows` asserting an absence after `networkidle`) — lifted into [iteration-11.5 task 12](iteration-11.5/12-a-test-waits-on-a-signal-never-on-the-clock.md).
- ~~COULD-138~~ (a gray shape beneath the central Add circle on the iPhone) — lifted into [iteration-11.5 task 15](iteration-11.5/15-nothing-is-drawn-beneath-the-add-action.md).
- ~~COULD-139~~ (`FontGate` waiting on the fonts with no deadline) — lifted into [iteration-11.5 task 14](iteration-11.5/14-a-font-that-fails-to-load-leaves-the-app-readable.md).
- ~~COULD-140~~ (`beerStyleGroup` imported from the `@kalia/api` root) — lifted into [iteration-11.5 task 13](iteration-11.5/13-the-shared-packages-export-what-both-apps-use-and-only-that.md).
- ~~COULD-141~~ (the font fallback rendering every weight as regular) — lifted into [iteration-11.5 task 14](iteration-11.5/14-a-font-that-fails-to-load-leaves-the-app-readable.md).
- ~~COULD-142~~ (the catalog list tests waiting on real timers) — lifted into [iteration-11.5 task 12](iteration-11.5/12-a-test-waits-on-a-signal-never-on-the-clock.md).
- ~~COULD-143~~ (`showCatalogWith` applying its filters in an effect) — lifted into [iteration-11.5 task 27](iteration-11.5/27-the-conventions-that-needed-a-choice-are-written-and-followed.md).
