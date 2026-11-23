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

**Highest issued:** MUST-28 · SHOULD-144 · COULD-168

## MUST

- **MUST-26** *(confirmed 2026-11-22)* — `keycloak/README.md` "Changing a
  colour" (lines 40–46) says each colour is declared at the top of `login.css`
  as `--kalia-color-<name>`, a hand-kept copy of the app's token.
  `scripts/check-keycloak-theme.mjs` now fails any `--kalia-color-*` declared
  there ("belongs in the generated stylesheet"): the colours are generated into
  `keycloak/themes/kalia/login/resources/css/tokens.generated.css` by
  `scripts/generate-tokens.mjs` from `packages/tokens/src/tokens.ts`, and
  `theme.properties` loads `styles.css tokens.generated.css login.css`. A reader
  who follows the README edits the wrong file and the check fails. The same
  README's line 21 ("one `login.css` layered after it") and its Checks section
  ("the theme's colours … to the app's") describe the old arrangement too.
- **MUST-27** *(confirmed 2026-11-22)* **[needs decision]** — The branch-naming
  rule (`CLAUDE.md` "Never commit directly to `dev`": `iteration-N/<topic>`,
  `docs/<topic>`, `fix/<topic>`) has no enforcer and keeps reaching `dev`
  broken. The `worktree` skill's step 4 gained a warning about
  `claude/<name>-<hash>` names in #587, citing #416, #476 and #522; since then
  #629, #630 and #633 merged from `claude/…` branches, and since the
  2026-11-14 sweep #637, #640, #642 and #643. Nothing in `scripts/`,
  `.github/workflows/`, `scripts/hooks/pre-push` or `.claude/settings.json`
  reads the head ref. Repeats COULD-128, whose documentation-only fix did not
  hold. The decision: check the name (in `pre-push` or the PR-body workflow),
  or drop the rule.

## SHOULD

- **SHOULD-124** *(confirmed 2026-11-22)* **[needs decision]** — The domain
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
- **SHOULD-127** *(confirmed 2026-11-22)* — `keycloak/README.md` leaves out
  `keycloak/config-cli.Dockerfile`: its Layout table has no row for it, and
  "On a Keycloak image bump" (line 44) names the `Dockerfile` `FROM` and
  `keycloak-config-cli` in `docker-compose.base.yml`, while that service is
  built from `config-cli.Dockerfile`, whose own `FROM` carries the tag. A bump
  that follows the README leaves the line that is actually built at the old
  version.
- **SHOULD-128** *(confirmed 2026-11-22)* — `docs/design.md` (beer-style
  colours, lines 400–401) says changing a style colour "is a `globals.css`
  edit that the contrast check guards". The `[data-beer-style]` blocks are
  generated into `web/app/tokens.generated.css` from
  `packages/tokens/src/tokens.ts`, which is also what
  `scripts/check-contrast.mjs` reads, and the same document's opening already
  names `tokens.ts` as the home of values. The edit it describes would be
  overwritten.
- **SHOULD-129** *(confirmed 2026-11-22)* **[needs decision]** — The timestamp
  rule contradicts the schema. `backend/CONVENTIONS.md` ("A new
  table carries `created_at` and `updated_at`") and `docs/glossary.md`'s
  Timestamp columns row (which names `catalog.beer` as the one exception) do
  not match four tables with no `updated_at`: `catalog.brewery` and
  `catalog.review` (`V003__catalog_schema.sql`), `appconfig.app_config`
  (`V009__appconfig_schema.sql`, neither column) and
  `notification.notification` (`V010__notification_schema.sql`, created after
  the rule). The decision: word the rule for mutable tables and list the
  append-only and one-row exceptions, or add the columns.
- **SHOULD-130** *(confirmed 2026-11-22)* — `docs/ci-playbook.md` files its
  lint entry under "Frontend (npm) — lint", a job that does not exist: the job
  is `Web and packages (npm)` in `.github/workflows/ci.yml`, and the lint of
  `Mobile app (npm)` has no entry at all. The playbook is found by the red
  job's name, so the entry is missed. Repeats MUST-25: the rename drift in
  this file survived iteration 11 task 12 in this heading.
- **SHOULD-131** *(confirmed 2026-11-22)* **[needs decision]** — ADR-0016's
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
- **SHOULD-132** *(confirmed 2026-11-22)* **[needs decision]** — Two pull
  requests each green on their own base broke `dev` a third time, in a job the
  merge-ref check leaves out. #623 and #624 merged and the Android sign-in
  flow went red on `dev` and on every pull request based on it (#627, #629)
  until #628 (`docs/common-failures.md`, the 2026-11-13 row); the earlier
  occurrences are PR 450 and #542/#543. `.github/workflows/merge-ref-check.yml`
  runs only `make check` on the merge ref. A fourth time on 2026-11-15, in
  the lint: #643 turned on `simple-import-sort/imports` for the web while #644
  added `web/e2e/keycloak-page-titles.spec.ts` unsorted; both were green, and
  `dev` went red at #643's merge (run 43711373729) until #649. `make lint` is
  not in `make check`. Repeats SHOULD-115, whose task
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
- **SHOULD-134** *(confirmed 2026-11-22)* **[needs decision]** — The Android
  SDK licence failure in `Mobile E2E (Maestro, Android)` has happened twice
  from separate pull requests — run 41323371145 (the merge of PR 523) and run
  43448275019 (#623), both logged in `docs/common-failures.md` as "cause not
  established" and re-run. `docs/ci-playbook.md` says a cause that repeats "is
  the image or the runner that moved, not a blip" but has no entry for the
  licence prompt and names no next step, and `scripts/mobile-e2e.mjs` already
  answers `sdkmanager --licenses`. Nothing owns finding the cause. Not covered
  by iteration 11.5 task 19, which retries registry and mirror failures.
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
- **SHOULD-137** *(confirmed 2026-11-22)* **[needs decision]** — The web is
  type-checked only by `next build`, which neither `make verify-fast` nor the
  `make check on the merge ref` job runs. #648 (telemetry tests) and #652
  (`noUncheckedIndexedAccess`) each passed `Web and packages (npm)` on their own
  base, merged 15 minutes apart without the second being updated, and turned
  `dev` red: 26 `TS18048` errors in three test files and one in
  `redactSpan.ts`, failing the web image build and so the vulnerability scan,
  E2E and every open pull request, Dependabot's seven among them (run
  `43851999124`). The type-checker does include test files; nothing ran it on
  the merged tree. ADR-0046 accepted the race when it reversed the up-to-date
  requirement, and this is its third sighting after #447/#448 and #542/#543.
  `dev` stayed red from #652's merge until #661 the next day but one, through
  eleven red runs. Still no web `tsc` in `make verify-fast` or the merge-ref
  job (`web/CONVENTIONS.md`: "The web is type-checked by `next build`"). The
  decision: add `npx tsc --noEmit` in `web/` (about a second with TypeScript 7)
  to the merge-ref job and to `verify-fast`, or restore the up-to-date
  requirement; the ruleset is the product owner's.
- **SHOULD-139** *(confirmed 2026-11-20)* **[needs decision]** — Every task
  pull request flips its own row in its iteration index, so each merge turned
  the next open pull requests `DIRTY` and the orchestrating session sent a "merge
  `dev`" message to each: about fifteen rounds in iteration 11.5
  (`implement-iteration` step 10 sends them as one batch meanwhile). The status
  cell is a copy of the task file's `Status` that `scripts/sync-indexes.mjs`
  rewrites, so the conflicting hunk is a cell nobody decides (likely
  adjacent rows; not confirmed against the merge conflicts themselves). The decision: a merge
  driver for the index rows, an index sync that does not conflict (the cell
  written after the merge, or computed where it is read), or leaving it. Asked
  for directly by the product owner as a retrospective, not found by a sweep
  ([ADR-0051](../adr/0051-process-retrospection-belongs-to-the-sweep.md)).
- **SHOULD-140** *(confirmed 2026-11-22)* **[needs decision]** — The
  observability profile's images, which are never deployed, are now most of
  what the required vulnerability scan blocks on. ADR-0114 scans them "like
  the rest" and the scan runs on every push; since they arrived (#642, #666),
  `grafana/otel-lgtm` alone is the subject of 21 of the 70 vulnerability
  waivers in `.trivyignore.yaml` (14 for its Red Hat `krb5-libs`, 4 for its
  `curl`), it and
  `grafana/alloy` were two of the six legs red on CVE-2026-97054 (runs 44455105822, 44457177695, 44457557872,
  44458816192, until #670), and `otel-lgtm` alone turned `dev` red on
  2026-11-21 on four `curl` advisories (MUST-28, waived in #698). Each time the remedy is a waiver or a bump that changes
  nothing a user runs. The decision: keep the profile's images as blocking
  legs, scan them on the schedule only, or let their legs report without
  failing `ci-passed`; ADR-0024 and ADR-0114 would be amended either way.
- **SHOULD-141** *(confirmed 2026-11-22)* — The Android flow "Navigate the
  tabs and dismiss the sheets" failed twice from separate branches with the
  same signature, `Assertion is false: "Coming soon|Tulossa pian" is visible`
  after `tapOn: "Feed|Syöte"` (`mobile/.maestro/navigation.yaml` line 7): run
  44680232369 on Dependabot's eslint branch and run 44690324281 on `dev` at
  #688's merge, neither touching the app, and the next run on `dev` passed. The
  other four flows passed both times, so the device was healthy.
  `docs/ci-playbook.md` "Mobile E2E (Maestro, Android)" has no entry for it,
  and nothing owns finding the cause. The step's screenshot is in each run's
  `maestro-output` artifact.
- **SHOULD-142** *(confirmed 2026-11-22)* — `make check`, and so `make
  verify-fast` and the `pre-push` hook, fails in any shell that exports
  `GITHUB_TOKEN`. `commitExists` in `scripts/check-action-pins.mjs` (line 38)
  takes `token = process.env.GITHUB_TOKEN` as a default parameter, so the test
  "asks GitHub for the commit in that repository, with the token when there is
  one" (`scripts/check-action-pins.test.mjs` line 65) passes `undefined` to mean
  "no token" and gets the environment's token instead: `Expected undefined,
  got 'Bearer …'`. A caller cannot ask for an unauthenticated request either.
  Reading the environment once at the call site, and passing it in, fixes both
  (`docs/common-failures.md`, the 2026-11-22 row).
- **SHOULD-143** *(confirmed 2026-11-22)* — `FeedRedeliveryIT` stubs a spy that
  the application's own threads are calling. Run 43736551445 (`dev`, #653's
  merge) failed `redeliveringAnAlreadyRecordedEventAddsNoSecondLine` with
  `UnfinishedStubbingException` at
  `backend/src/test/java/fi/kalia/feed/FeedRedeliveryIT.java` line 107:
  `willThrow(...).willCallRealMethod().given(registry).markCompleted(...)` runs
  on the `@MockitoSpyBean EventPublicationRegistry` while event publication
  and resubmission threads, some left by the class's earlier tests, call
  `markCompleted` on it, and Mockito's stubbing is not thread-safe. Once in
  the history, and the same shape will fail again under load. Stubbing before
  any event is in flight, or through a seam no background thread touches,
  removes the race.

- **SHOULD-144** *(confirmed 2026-11-23)* — On the iPhone, VoiceOver first reads
  the first selection of a filter dropdown ("Kaikki tyylit") and only then the
  heading, so the heading is not the first word heard.
  `Sheet` sends its focus request at the heading's layout
  (`mobile/src/components/Sheet.tsx`, `useFocusOnShow`), and the platform
  probably focuses the selected row first and the request then moves it to the
  heading. Found by the product owner's walk of iteration 12 task 23, who
  accepted it as it is. A fix probably sends the request a beat after layout on
  a page swap too (as opening already waits `SHEET_PRESENTED_MS`), or marks
  the pages' rows so the platform has no row to land on; either needs the phone
  to verify.

## COULD

- **COULD-136** *(confirmed 2026-11-22)* — `web/features/admin-suggestions/OutcomePanel.tsx`
  builds a success box (icon cell, ink edge, message) that `Toast` and `ErrorAlert`
  each build too; a success counterpart to `ErrorAlert` in `components/ui/` would
  leave one copy to keep in step.
- **COULD-147** *(confirmed 2026-11-22)* — `useAnimateListChange`
  (`mobile/src/lib/motion/useAnimateListChange.ts`) returns a new function on
  every render, and `CatalogScreen` lists it as a `useLayoutEffect` dependency,
  so the effect re-runs on every render. The screen's own
  `shown.current !== firstPage` guard keeps the behaviour right; the next
  caller without one would animate on every render. A `useCallback` keyed on
  `reduced` fixes it.
- **COULD-148** *(confirmed 2026-11-22)* — Two rules in the mobile catalog's
  hooks are held by no test. `nextBeerPage`
  (`mobile/src/features/catalog/hooks/useBeers.ts`) stops paging at
  `MAX_RESULT_WINDOW`, the bound past which the backend answers `400`, and
  `CatalogScreen.flow.test.tsx` covers only the exhausted list; `useResultCount`
  (`hooks/useFilterOptions.ts`) hides a stale count by reference equality, and
  `FiltersSheet.test.tsx` exercises only its debounce.
- **COULD-149** *(confirmed 2026-11-22)* **[needs decision]** — The page
  envelope and offset bound of `docs/architecture.md` §4 are implemented once
  per module — `catalog/web/PageDto.java` and `PageBounds.java`,
  `notification/web/NotificationPageDto.java` with `NotificationController`'s
  own `MAX_PAGE_SIZE`, `MAX_OFFSET` and `requireBoundedOffset`, and
  `cellar/web/PublicCellarDto.java` — because §3 limits `fi.kalia.web` to
  exception advice and error types. The spec carries three unrelated envelope
  schemas, and a fourth paginated module will copy it again. The decision:
  widen what `fi.kalia.web` may hold, or accept per-module envelopes and say so.
- **COULD-150** *(confirmed 2026-11-22)* **[needs decision]** —
  `ArchitectureDocumentationTest` checks which modules §3's dependency table
  names, not the kind each edge is given ("(event: …)" or "(read: …)"): its
  `BACKTICKED_MODULE` pattern extracts module names only. A module that began
  writing into another through a synchronous API call would leave the table
  wrong and the test green, and nothing else holds "writes cross modules as
  events". The decision: verify the kinds, or narrow §7's claim that the test
  holds §2 and §3 to the code.
- **COULD-151** *(confirmed 2026-11-22)* — The data-model sketch in
  `docs/architecture.md` §3 leaves out `catalog.review`, the review record of
  ADR-0102 that the invariants beneath it rely on and that holds user ids
  (`decided_by`), and `brewery.name_sort_key`; both are in
  `backend/src/main/resources/db/migration/catalog/V003__catalog_schema.sql`.
  The sketch lists every other table, so the omission reads as "no such
  table".
- **COULD-152** *(confirmed 2026-11-22)* — `docs/architecture.md` "Domain
  invariants" says a brewery's country is "named in the reader's language at
  runtime". That holds for the web only: the mobile app bundles a table
  (`mobile/src/lib/i18n/countryNames.data.ts`), as ADR-0079's amendment of
  2026-11-13 records.
- **COULD-153** *(confirmed 2026-11-22)* **[needs decision]** — Strength
  formatting is a display rule both clients show and each keeps its own.
  `web/lib/abv.ts` (`formatAbv`) is one helper; the mobile app inlines the same
  `Intl.NumberFormat` expression in `BeerCard.tsx`, `details/BeerHeadline.tsx`,
  `details/SimilarBeers.tsx` and `filters/FilterChips.tsx`, appending " %" in
  some and not others. ADR-0111 put the style-to-group rule in `@kalia/api`
  for the same reason. The decision: share it, or accept per-client formatting.
- **COULD-154** *(confirmed 2026-11-22)* **[needs decision]** —
  `docs/glossary.md` "Terms decided in iteration 10.5, built by its tasks"
  still says its terms are "Not yet types … Each moves into the table in the
  task that builds it." Iteration 10.5 is done: `Review` is in the table
  above, and `RejectionReason`, `SuggestionReviewed` and `BeerRemoved` exist
  under `backend/src/main/java/fi/kalia/catalog/`. The decision: fold the rows
  into the Domain types table, or keep the section as a permanent table of
  terms that are not types.
- **COULD-155** *(confirmed 2026-11-22)* — ADR-0107's amendment of 2026-11-08
  still says the app "uses the platform's default system font provisionally;
  task 03 decides whether to bundle a font". ADR-0110 decided one bundled
  face, and neither record points at the other.
- **COULD-156** *(confirmed 2026-11-22)* — The root `README.md`'s repository
  tree lists `api/` and `locales/` under `packages/` and leaves out
  `packages/tokens/` (`@kalia/tokens`), a workspace `make lint` covers and
  `packages/README.md` lists. The tree is the layout's one home
  (`docs/architecture.md` §2 points to it).
- **COULD-157** *(confirmed 2026-11-22)* — The pull request template's
  Doc-sync prompt (`docs/PULL_REQUEST_TEMPLATE.md`, the Gates list) asks which
  of `docs/architecture.md`, the iteration index and the ADRs were checked;
  `implement-task` step 7 also requires the README of each subtree the change
  touches. The template is what makes the verdict recorded the same way every
  time, and it prompts for less than the gate checks.
- **COULD-158** *(confirmed 2026-11-22)* **[needs decision]** — Password
  guessing is bounded per account, not per address. Keycloak's lockout counts
  failures per user (`keycloak/realm-export.json`: `failureFactor` 10,
  temporary), and its sign-in and token endpoints sit in the edge's general
  `keycloak` zone (`edge/nginx.conf`, 20 requests a second per address); only
  the registration paths have a tighter one. One address can try a common
  password across many usernames without any account reaching its threshold.
  The decision: a tighter per-address zone on the sign-in paths, or accept it.
- **COULD-161** *(confirmed 2026-11-22)* — A comment in
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
- **COULD-164** *(confirmed 2026-11-22)* **[needs decision]** — `CLAUDE.md`'s
  rule that a commit message references the roadmap task has no checker, and
  of the non-merge commits by agents since the 2026-11-14 sweep, 15 of 90
  name no task, iteration, backlog ID, ADR or pull request (35 of 159 the
  sweep before), on task branches too (d7bb92c in #674, ad54e64 and 775aaa9
  in #671, cecb541 in #669; earlier 563a35ec in #619, 0a636ee0 in #630). The pull
  request body already links the task. The decision: check it, or drop it.
- **COULD-165** *(confirmed 2026-11-22)* — An agent's commit on a Dependabot
  pull request records its gates in a comment on that pull request
  (`implement-task` "A pull request with no task file"), and nothing reads
  that comment: `scripts/check-pr-body.mjs` sees only the body, which is
  Dependabot's. be3d9a8b on #513 and 37c6c6d8 on #515 carried no record, and
  0072f148 on #660 a comment that names a local run and no Doc-sync or Code
  review verdict. A
  `pr-body.yml` step could list the pull request's commits and comments and
  fail a non-bot commit with no comment naming the three gates.
- **COULD-166** *(confirmed 2026-11-22)* — Filed from the review of iteration
  11.5 task 20. `node scripts/phone-mode.mjs off` leaves the machine's `tailscale serve` forwards
  in place whenever another worktree's `.env` still says phone mode, even if
  that worktree's stack is down or abandoned. Its owner must run `off` there
  before the forwards go (`otherOwners` in `off`, which reads the checkouts'
  `.env`, not their running stacks). Decide whether `off` should check that
  the other stack is running before it defers.
- **COULD-167** *(confirmed 2026-11-22)* — The backend exports a request's raw
  path in its traces, where the web exports only a route template. ADR-0013
  logs "a route template, never its path", because `/api/v1/cellars/{username}`
  carries a user's name, and `web/lib/telemetry/redactSpan.ts` holds spans to
  the same rule (`web/README.md`: "A span never carries a query string, a
  path…"). The backend's server span keeps Spring's `http.url`, which ADR-0114's
  spike records as "the path alone", so `GET /api/v1/cellars/ada` reaches the
  profile's store under the same trace id as the request's log lines.
  `backend/README.md` (line 131) promises only "a query string, token or
  body", and `TraceExportIT.noQueryStringTokenOrBodyReachesASpanAMetricOrALogLine`
  asserts nothing about a path. An `ObservationFilter` that keeps the handler's
  `uri` template, and a test beside the existing one, would match the web.
- **COULD-168** *(confirmed 2026-11-22)* **[needs decision]** — `fi.kalia.web`
  holds more than `docs/architecture.md` §3 allows. §3 calls it "the one
  module-neutral exception: shared exception advice and error types" and its
  `package-info.java` says "web-layer advice", but it now holds
  `RequestLogFilter`, `HealthProbeTracing` (a servlet filter and the tracing
  `Sampler` bean) and `ExporterOutageThrottle` (a Logback `TurboFilter`), the
  last two added by iteration 11.5. No ArchUnit rule says what the package may
  hold, so the next cross-cutting class lands there too. The decision: widen
  §3 and the package's sentence to "module-neutral web infrastructure", or move
  the request-logging and telemetry classes beside `ApplicationConfig` in
  `fi.kalia`. Related: COULD-149, which asks the same question for the page
  envelope.

## Retired

Findings lifted into a task that is not yet `done`, each noting where it
went; pruned as described above.

- ~~SHOULD-119~~ (the filter sheet not putting VoiceOver's focus on its heading on opening and coming back) — lifted into [iteration-12 task 23](iteration-12/23-a-sheet-puts-voiceovers-focus-on-its-heading.md).
- ~~SHOULD-120~~ (a picker not putting VoiceOver's focus on its heading) — lifted into [iteration-12 task 23](iteration-12/23-a-sheet-puts-voiceovers-focus-on-its-heading.md).
- ~~SHOULD-121~~ (the web's Keycloak token refresh with no timeout) — lifted into [iteration-12 task 20](iteration-12/20-every-wait-on-the-network-has-a-deadline.md).
- ~~SHOULD-122~~ (the web's two beer-form schemas as near-copies) — lifted into [iteration-12 task 22](iteration-12/22-the-clients-take-the-backends-bounds-from-one-place.md).
- ~~SHOULD-123~~ (nothing bounding a cellar on either side) — lifted into [iteration-12 task 19](iteration-12/19-a-cellar-has-a-size-limit-the-server-enforces.md). Its `[needs decision]` was settled when it was lifted.
- ~~SHOULD-125~~ (`notification` persisting `catalog`'s rejection reason) — lifted into [iteration-12 task 24](iteration-12/24-a-rejection-reason-added-in-catalog-cannot-lose-a-notification.md).
- ~~SHOULD-126~~ (the backend's request bounds copied by hand into both clients) — lifted into [iteration-12 task 22](iteration-12/22-the-clients-take-the-backends-bounds-from-one-place.md). Its `[needs decision]` was settled when it was lifted.
- ~~COULD-144~~ (the transport's timeout covering the headers and not the body) — lifted into [iteration-12 task 20](iteration-12/20-every-wait-on-the-network-has-a-deadline.md).
- ~~COULD-145~~ (the UUID pattern written four times) — lifted into [iteration-12 task 22](iteration-12/22-the-clients-take-the-backends-bounds-from-one-place.md).
- ~~COULD-146~~ (the web showing a failure when a bottle is already gone) — lifted into [iteration-12 task 21](iteration-12/21-a-bottle-that-is-already-gone-is-not-a-failure.md). Its `[needs decision]` was settled when it was lifted.
- ~~COULD-159~~ (`kalia-web`'s wildcard redirect URIs) — lifted into [iteration-12 task 25](iteration-12/25-keycloak-holds-the-web-client-to-the-redirects-and-the-pkce-it-uses.md).
- ~~COULD-160~~ (PKCE not required of `kalia-web`) — lifted into [iteration-12 task 25](iteration-12/25-keycloak-holds-the-web-client-to-the-redirects-and-the-pkce-it-uses.md).
