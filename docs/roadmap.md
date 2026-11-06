# Kalia — Implementation Roadmap

Work proceeds in small vertical iterations. Each task is meant to be **one
issue / one PR**: refined, implemented test-first, reviewed, and merged
before the next begins. Detailed task lists live under
[docs/tasks/](tasks/) — this file is the index plus the process rules every
iteration follows.

From iteration 5 on, each task is its own file under
`docs/tasks/iteration-N/`, written to [the template](tasks/template.md) and
carrying its own acceptance criteria
([ADR-0026](adr/0026-task-file-format.md)). A task starts at
`needs-refinement` and only the product owner moves it to `refined`; nothing
is picked up before that. Refinement takes an iteration at a time rather than
a task at a time — its questions are merged into one agenda and answered in
one conversation ([ADR-0047](adr/0047-refinement-is-batched-per-iteration.md)). Iterations 0–4 keep the older single-file form.

Priorities follow the [vision](../README.md)'s own dependency order. The
catalog came first because you have to find a beer before you can own one, and
authentication before the cellar because the cellar is per-user data
([ADR-0006](adr/0006-cellar-first.md)). From there: the cellar itself, then
what makes it social — a profile and a cellar you can choose to make public,
then a feed of what people are putting in theirs — then a catalog that grows
past its seed data. Everything further out is in
[the backlog](tasks/backlog.md).

From iteration 9 on, **mobile is Kalia's primary UI**: an Expo app with a
design of its own rather than the web's, built on the foundations iteration 9
lays and then feature by feature in the same dependency order — catalog,
cellar, social — before what only a phone can do. The web keeps working and is
not held at feature parity. The plan adds no cost (the rule is in
[`CLAUDE.md`](../CLAUDE.md)): the app runs on the product owner's own iPhone
and on simulators against the local stack, and what a cost blocks is parked in
[the backlog](tasks/backlog.md#mobile-client). Iteration 10.5 is the
exception: an admin page in the web app that replaces the SQL moderation
script, before the mobile design work resumes. Iteration 11's task files are
refined as the decisions they wait on land, and also carry quality-backlog
findings. Iterations 12–14 list planned tasks as one line each, their task
files written at refinement.

**Definition of done (every issue):**

- every acceptance criterion in the task file checked off, each verified the
  way the criterion says
- tests written and green; change verified by actually running it
- module boundaries verified (backend by Spring Modulith and ArchUnit,
  frontend by ESLint); lint/format clean
- **doc-sync check:** affected sections of `docs/` re-read and updated in the
  same PR — or explicitly confirmed accurate in the PR description
- task status set to `done` in the task file, and synced into its iteration
  index (`make sync-indexes`; the edit-time hook does it for an agent)

**Iteration DoD gate:** stated in full in the
[`implement-task` skill](../.claude/skills/implement-task/SKILL.md) (step 11); `scripts/check-tasks.mjs` checks its planning-time half
mechanically ([ADR-0026](adr/0026-task-file-format.md)).

## Iterations

| Iteration | Goal | Status |
|---|---|---|
| [0 — Walking skeleton](tasks/iteration-0.md) | Running end-to-end stack with CI-able test suites | ✅ Done |
| [1 — Beer catalog: browse & search](tasks/iteration-1.md) | Visitor can browse and search real (seeded) beers | ✅ Done |
| [2 — Frontend standards & UI design](tasks/iteration-2.md) | Conventions, localization, accessibility, a professional look | ✅ Done |
| [3 — Production-readiness foundations](tasks/iteration-3.md) | Logging, exception-handling, config and security conventions | ✅ Done |
| [4 — Authentication](tasks/iteration-4.md) | Users can sign in via Keycloak | ✅ Done |
| [5 — Personal beer cellar](tasks/iteration-5.md) | Signed-in users record the bottles they own | ✅ Done |
| [5.5 — Quality backlog](tasks/iteration-5.5.md) | The quality backlog is closed | ✅ Done |
| [6 — User profile and public cellars](tasks/iteration-6.md) | A cellar can be made public and browsed by anyone | ✅ Done |
| [6.5 — Sign-up](tasks/iteration-6.5.md) | Someone other than the author can create an account | ✅ Done |
| [7 — Front page activity feed](tasks/iteration-7.md) | The front page shows what people add to their cellars, live | ✅ Done |
| [7.5 — Design sprint](tasks/iteration-7.5.md) | Kalia looks designed rather than defaulted | ✅ Done |
| [8 — Catalog beyond seed data](tasks/iteration-8.md) | Users add the beers they cannot find | ✅ Done |
| [8.5 — Quality sprint before mobile](tasks/iteration-8.5.md) | The API mobile inherits is complete and pruned, and no known MUST or unbounded cost remains | ✅ Done |
| [9 — Mobile foundations](tasks/iteration-9.md) | An Expo app signs in and shows real data on both simulators | ✅ Done |
| [10 — Kalia on your own iPhone](tasks/iteration-10.md) | The app runs on a real iPhone at no cost | ✅ Done |
| [10.5 — An admin reviews what users add](tasks/iteration-10.5.md) | An admin reviews suggested beers in the web app, and the contributor is told the outcome | ✅ Done |
| [11 — Mobile design language](tasks/iteration-11.md) | A mobile design of Kalia's own, proven on the catalog | ⬜ Todo |
| [12 — The cellar in your pocket](tasks/iteration-12.md) | The cellar, natively, readable with no signal | ⬜ Todo |
| [13 — Social on mobile](tasks/iteration-13.md) | Feed, profile and public cellars on the phone | ⬜ Todo |
| [14 — Scan the bottle in your hand](tasks/iteration-14.md) | A barcode puts a beer in the cellar | ⬜ Todo |

Unscheduled work: [Backlog](tasks/backlog.md) · [Quality backlog](tasks/quality-backlog.md)

## What each iteration built

The one home for what Kalia can do, iteration by iteration. The root
[README](../README.md) and [architecture.md](architecture.md) §1 point here
instead of repeating it
([ADR-0020](adr/0020-documentation-roles.md)); an iteration's close adds its
entry here and nowhere else. Iterations 3 and 5.5 built no feature a user
meets, so they have no entry; the table above says what they were for.

- **Browse** craft beers, searching by name and filtering by style, the
  brewery's country and alcohol content (ABV), with a detail view for each —
  no account needed *(iteration 1)*
- **Use Kalia in English or Finnish** (`/en`, `/fi`; detected on first visit,
  switchable at any time) *(iteration 2)*
- **Sign in and out** with Keycloak; browsing stays anonymous *(iteration 4)*
- **A personal beer cellar:** the bottles the signed-in user owns, each with
  its own brewed and best-before dates, grouped by the catalog beer they are
  bottles of *(iteration 5)*
- **A profile, and a cellar that can be made public** — browsable from a link
  or the owner's profile by anyone, signed in or not *(iteration 6)*
- **Self-registration** with email verification, so someone other than the
  author can create an account *(iteration 6.5)*
- **A live front-page feed** of the bottles people add to their public
  cellars, kept current by polling *(iteration 7)*
- **A visual identity of Kalia's own** — colour and type tokens, icons, the
  Kalia mark and a layout for every page, the Keycloak pages included, usable
  at a phone and a desktop width *(iteration 7.5)*
- **A catalog that grows:** seeded once from Wikidata, with a signed-in user
  adding a beer it lacks, and its brewery, and putting a bottle of it in the
  cellar at once; catalog search is held within its latency budget at 150k
  beers *(iteration 8)*
- **An API a second client can inherit:** every error documented and typed,
  what nobody used removed, contributed catalog entries visible to others only
  once an operator approves them and never hard-deleted, the unauthenticated
  edges throttled by an nginx proxy, and a stack that refuses to start as a
  deployment without its secrets *(iteration 8.5)*
- **A mobile app:** an Expo app on the iOS Simulator and the Android emulator
  that signs in through Keycloak and out again, lists the catalog from
  `/api/v1`, and blocks itself behind an "update required" screen when the
  server's minimum build exceeds its own *(iteration 9)*
- **The app on a real phone** *(iteration 10)*: Kalia has its own
  name, icon and splash screen; it installs on the product owner's iPhone with
  a free Apple ID and signs in and browses against the stack on the Mac; a
  development build and a release build (bundled JavaScript, no dev menu) run
  on both platforms; an error on the phone leaves a screen and a trace id to
  read; the app survives a token it cannot refresh; and adding a beer says
  what happens to it and never dead-ends. The seven-day re-sign is written
  down but not yet observed, and is tracked in the backlog
- **An admin reviews what users add** *(iteration 10.5)*: a signed-in user with
  the admin role reaches an admin area of the web app that no one else reaches
  or sees offered, and approves, rejects with a reason, or edits and approves
  each suggested beer, together with its brewery when that was new, in a queue
  beside the suggestion; an admin can also remove an approved beer from its
  page. The SQL moderation script is gone. Each decision publishes one event,
  and the contributor sees what became of their suggestion in a signal in the
  sticky bar that opens a panel, where each notification stays until they
  acknowledge it.
