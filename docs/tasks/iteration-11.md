# Iteration 11 — Mobile design language, proven on the catalog

Goal: Kalia gets a mobile design of its own — chosen from prototyped
directions the way [iteration 7.5](iteration-7.5.md) chose the web's, not a
copy of the web — and proves it by building the first real feature with it:
browsing and searching the catalog.

## Done when

- **DW-1:** Kalia's mobile interaction model and its identity on a phone are
  ones the product owner picked from built alternatives, judged on a phone.
- **DW-2:** One platform-neutral token source generates both the web's CSS
  custom properties and the mobile theme, and styling outside it fails the
  build on both.
- **DW-3:** The catalog — search, filters and a beer's details — works on both
  platforms using the platforms' own conventions rather than the web's.
- **DW-4:** The catalog screens work with VoiceOver and TalkBack and at the
  largest Dynamic Type size, and how that is checked is written down.

## Tasks

| ID | Task | Status |
|---|---|---|
| [12](iteration-11/12-the-process-documents-name-what-exists.md) | The process documents name what exists | done |
| [14](iteration-11/14-concurrency-tests-force-the-interleaving-they-check.md) | A concurrency test forces the interleaving it checks | done |
| [15](iteration-11/15-a-pull-request-is-checked-against-the-base-it-will-merge-into.md) | A pull request is checked against the base it will merge into | done |
| [13](iteration-11/13-the-readme-and-architecture-describe-a-project-with-a-mobile-app.md) | The README and the architecture describe a project with a mobile app | refined |
| [18](iteration-11/18-a-client-falls-back-on-an-enum-value-it-does-not-know.md) | A client falls back on an enum value it does not know | refined |
| [01](iteration-11/01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md) | Decide how a mobile direction is prototyped and signed off | refined |
| [06](iteration-11/06-decision-the-design-token-format.md) | Decide the design token format | refined |
| [07](iteration-11/07-token-pipeline.md) | One token source generates the web's CSS and the app's theme | needs-refinement |
| [02](iteration-11/02-design-the-interaction-model-and-navigation.md) | Design how the app is navigated | refined |
| [03](iteration-11/03-design-kalias-identity-on-a-phone.md) | Design Kalia's identity on a phone | refined |
| [04](iteration-11/04-decision-and-design-dark-mode.md) | Design the app's dark mode | refined |
| [05](iteration-11/05-design-motion-and-haptics.md) | Design what moves and what is felt | refined |
| [08](iteration-11/08-mobile-ui-primitives.md) | The app has its own primitives, and no screen is left plain | needs-refinement |
| [16](iteration-11/16-signing-in-or-out-clears-what-the-last-viewer-saw.md) | Signing in or out clears what the last viewer saw | refined |
| [17](iteration-11/17-the-transport-logs-a-failure-only-where-a-feature-calls-it-one.md) | The app's transport logs a failure only where a feature calls it one | refined |
| [09](iteration-11/09-catalog-search-and-list.md) | A user searches and filters the catalog on their phone | needs-refinement |
| [10](iteration-11/10-beer-details.md) | A user opens a beer and reads its details on their phone | needs-refinement |
| [11](iteration-11/11-mobile-accessibility-conventions.md) | Mobile accessibility is written down and checked in tests | needs-refinement |
| [19](iteration-11/19-decision-how-far-the-admin-role-reaches.md) | Decide how far the admin role reaches | refined |
| [20](iteration-11/20-an-anticipated-failure-gets-the-documented-answer.md) | An anticipated failure gets the documented answer | refined |
| [21](iteration-11/21-reads-that-scan-history-are-indexed-and-their-plans-pinned.md) | Reads that scan history are indexed, and their plans are pinned | refined |

Tasks 01–11 are the iteration's own plan, one task for each line the plan held,
including the two decisions and the four design tasks, which run under the
`design-task` skill
([ADR-0062](../adr/0062-a-design-task-is-a-skill-and-a-marker.md)). Tasks 12–21
fill the iteration from the [quality backlog](quality-backlog.md) at the product
owner's request, chosen by their impact on what this iteration builds and merged
where findings touch the same code. Every task was seeded at `needs-refinement`,
to be refined together in one conversation
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)). The quality
tasks advance no `Done when` criterion and say so with `Covers: none`; every
`[needs decision]` finding they carry was an open question there.

The refinement of 2026-11-07 took tasks 01–06 and 12–21 to `refined`. Tasks
07–11 stay `needs-refinement`: each is written against an ADR not yet made —
task 06's for 07, the design tasks' for 08–11 — and is refined once that lands.
The answers that already bind them are recorded in each, so that pass is
short.

The table's order is the order of work:

- **First, the ground.** [12](iteration-11/12-the-process-documents-name-what-exists.md)
  corrects the documents agents work from, `CLAUDE.md` among them, before
  anything else reads them;
  [14](iteration-11/14-concurrency-tests-force-the-interleaving-they-check.md) and [15](iteration-11/15-a-pull-request-is-checked-against-the-base-it-will-merge-into.md)
  stop a flaky test and a stale base from turning a gate red for the sessions
  that follow; [13](iteration-11/13-the-readme-and-architecture-describe-a-project-with-a-mobile-app.md)
  makes the first documents a newcomer reads describe the app; and
  [18](iteration-11/18-a-client-falls-back-on-an-enum-value-it-does-not-know.md) gives
  both clients the fallback for an enum value they do not know, before the
  first mobile code maps one — task 03's style-group colours.
- **Then how a mobile design is shown,**
  [01](iteration-11/01-decision-how-a-mobile-direction-is-prototyped-and-signed-off.md), because the
  `design-task` skill and ADR-0062 are written for the web.
- **Then the system the design is built in, before the design:** the token
  decision ([06](iteration-11/06-decision-the-design-token-format.md)) and its pipeline
  ([07](iteration-11/07-token-pipeline.md)), so that each design task writes
  its values into the source and the token and contrast checks cover the app
  from the first round, rather than building constants that are converted
  later. The source models a light and a dark mode from the start, because the
  app has a dark mode that follows the system, decided at refinement.
- **Then the design:** navigation ([02](iteration-11/02-design-the-interaction-model-and-navigation.md)), identity
  ([03](iteration-11/03-design-kalias-identity-on-a-phone.md)), the dark palette
  ([04](iteration-11/04-decision-and-design-dark-mode.md)) and motion and haptics
  ([05](iteration-11/05-design-motion-and-haptics.md)), each run under task 01's amendment
  of the skill, and the primitives and restyled screens
  ([08](iteration-11/08-mobile-ui-primitives.md)) built from what they chose.
- **Then two quality tasks the catalog stands on,** each before the screen that
  would otherwise build on the defect: the query cache that outlives its viewer
  ([16](iteration-11/16-signing-in-or-out-clears-what-the-last-viewer-saw.md)), before search caches many more
  queries, and a `404` logged as an error
  ([17](iteration-11/17-the-transport-logs-a-failure-only-where-a-feature-calls-it-one.md)), before a beer's page reads one as
  an answer.
- **Then the proof:** search and list ([09](iteration-11/09-catalog-search-and-list.md)), a beer's
  details ([10](iteration-11/10-beer-details.md)), and the accessibility conventions the
  catalog is checked against ([11](iteration-11/11-mobile-accessibility-conventions.md)), last because it
  checks screens that exist. The design tasks' own accessibility evidence is
  task 01's decision; task 11 writes what the screens are held to.
- **Last, quality work on other surfaces,** none of which the mobile work waits
  for: the admin role's reach in the app's token
  ([19](iteration-11/19-decision-how-far-the-admin-role-reaches.md)), anticipated
  failures answered with a `500` or a dead end
  ([20](iteration-11/20-an-anticipated-failure-gets-the-documented-answer.md)),
  and reads that scan history
  ([21](iteration-11/21-reads-that-scan-history-are-indexed-and-their-plans-pinned.md)).
  Task 20's race test needs task 14's rule; the feed read in 21 is the one
  [iteration 13](iteration-13.md) puts on the phone, and task 19's answer on
  the metrics endpoint is the one
  [iteration 11.5](iteration-11.5.md)'s task 01 is refined against.

Left in the quality backlog on purpose: findings about the failure log, the
refine skills' review step and the gates for a pull request with no task
(SHOULD-101, SHOULD-116, SHOULD-118, COULD-129), which are process questions
for the sweep; the backlog's own mobile section and the Keycloak link
(SHOULD-109, SHOULD-112); the shared packages and restated facts (COULD-119,
-120, -121, -123, -124); the CI infrastructure hiccups (COULD-112, -113, -114,
-127); the two open CodeQL alerts (COULD-134, -135); SHOULD-80, on which the
product owner chose on 2026-11-04 to limit nothing yet; COULD-108, which needs a
second worktree and a tailnet; and COULD-26, stock Keycloak markup.
